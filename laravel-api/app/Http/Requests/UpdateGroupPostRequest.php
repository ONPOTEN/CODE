<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupPostRequest extends FormRequest
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
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'excerpt' => 'nullable|string|max:500',
            'status' => 'nullable|in:publish,draft,pending,trash',
            'type' => 'nullable|in:post,page,product',
            'comment_status' => 'nullable|in:open,closed',
            'ping_status' => 'nullable|in:open,closed',
            'visibility' => 'nullable|in:public,private',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'replace_images' => 'nullable|boolean',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'title.max' => 'Title must not exceed 255 characters',
            'excerpt.max' => 'Excerpt must not exceed 500 characters',
            'images.*.image' => 'Each file must be an image',
            'images.*.mimes' => 'Images must be in JPEG, PNG, JPG, GIF, or WebP format',
            'images.*.max' => 'Each image must not exceed 5MB',
        ];
    }
}
