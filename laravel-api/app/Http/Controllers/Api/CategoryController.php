<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Get all categories (public - for displaying in frontend)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();

        // Filter by active status (public only sees active)
        if (!$request->user() || $request->user()->role !== 'admin') {
            $query->active();
        }

        // Filter by parent_id
        if ($request->has('parent_id')) {
            if ($request->parent_id === 'null' || $request->parent_id === '') {
                $query->roots();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        // Search by name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $query->orderBy('order')->orderBy('name');

        // Return tree structure if requested
        if ($request->boolean('tree')) {
            $categories = $query->roots()->with('descendants')->get();
            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        }

        // Paginate or return all
        if ($request->boolean('all')) {
            $categories = $query->get();
            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        }

        $perPage = min($request->input('per_page', 20), 100);
        $categories = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $categories->items(),
            'meta' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    /**
     * Get a single category
     */
    public function show(int $id): JsonResponse
    {
        $category = Category::with(['parent', 'children'])->find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * Get category by slug
     */
    public function bySlug(string $slug): JsonResponse
    {
        $category = Category::with(['parent', 'children'])
            ->where('slug', $slug)
            ->first();

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * Admin: Get all categories with full details
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Category::with('parent');

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by parent_id
        if ($request->has('parent_id')) {
            if ($request->parent_id === 'null' || $request->parent_id === '') {
                $query->roots();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        // Search by name or slug
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $query->orderBy('order')->orderBy('name');

        // Return tree structure if requested
        if ($request->boolean('tree')) {
            $categories = Category::roots()->with('descendants')->orderBy('order')->orderBy('name')->get();
            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        }

        $perPage = min($request->input('per_page', 20), 100);
        $categories = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $categories->items(),
            'meta' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    /**
     * Admin: Create a new category
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:categories,slug',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Category::generateUniqueSlug($validated['name']);
        }

        // Validate parent is not creating circular reference
        if (!empty($validated['parent_id'])) {
            $parent = Category::find($validated['parent_id']);
            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent category not found',
                ], 422);
            }
        }

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'order' => $validated['order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => $category->load('parent'),
        ], 201);
    }

    /**
     * Admin: Update a category
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:categories,slug,' . $id,
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Prevent setting self as parent
        if (isset($validated['parent_id']) && $validated['parent_id'] == $id) {
            return response()->json([
                'success' => false,
                'message' => 'A category cannot be its own parent',
            ], 422);
        }

        // Prevent circular reference
        if (isset($validated['parent_id']) && $validated['parent_id']) {
            $parent = Category::find($validated['parent_id']);
            if ($parent && $parent->isDescendantOf($category)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot set a descendant as parent (circular reference)',
                ], 422);
            }
        }

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => $category->fresh()->load('parent'),
        ]);
    }

    /**
     * Admin: Delete a category
     */
    public function destroy(int $id): JsonResponse
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        // Check if category has children
        if ($category->children()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with child categories. Delete children first or move them to another parent.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ]);
    }

    /**
     * Admin: Reorder categories
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categories' => 'required|array',
            'categories.*.id' => 'required|exists:categories,id',
            'categories.*.order' => 'required|integer|min:0',
            'categories.*.parent_id' => 'nullable|exists:categories,id',
        ]);

        foreach ($validated['categories'] as $item) {
            Category::where('id', $item['id'])->update([
                'order' => $item['order'],
                'parent_id' => $item['parent_id'] ?? null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Categories reordered successfully',
        ]);
    }

    /**
     * Generate a unique slug from name
     */
    public function generateSlug(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'exclude_id' => 'nullable|integer',
        ]);

        $slug = Category::generateUniqueSlug(
            $request->name,
            $request->exclude_id
        );

        return response()->json([
            'success' => true,
            'slug' => $slug,
        ]);
    }
}
