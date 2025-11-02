<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroupPostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'group_id' => 'required|integer|exists:groups,group_id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'status' => 'nullable|in:publish,draft,pending,trash',
            'type' => 'nullable|in:post,page,product',
            'comment_status' => 'nullable|in:open,closed',
            'ping_status' => 'nullable|in:open,closed',
            'visibility' => 'nullable|in:public,private',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'group_id.required' => 'Group is required',
            'group_id.exists' => 'The selected group does not exist',
            'title.required' => 'Title is required',
            'title.max' => 'Title must not exceed 255 characters',
            'content.required' => 'Content is required',
            'excerpt.max' => 'Excerpt must not exceed 500 characters',
            'images.*.image' => 'Each file must be an image',
            'images.*.mimes' => 'Images must be in JPEG, PNG, JPG, GIF, or WebP format',
            'images.*.max' => 'Each image must not exceed 5MB',
        ];
    }
}
