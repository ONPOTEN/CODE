<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroupRequest extends FormRequest
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
            'group_name' => 'required|string|max:255|unique:groups,group_name',
            'description' => 'nullable|string|max:1000',
            'visibility' => 'nullable|in:public,private',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'group_name.required' => 'Group name is required',
            'group_name.unique' => 'This group name is already taken',
            'group_name.max' => 'Group name must not exceed 255 characters',
            'description.max' => 'Description must not exceed 1000 characters',
            'avatar.image' => 'Avatar must be an image file',
            'avatar.mimes' => 'Avatar must be in JPEG, PNG, JPG, GIF, or WebP format',
            'avatar.max' => 'Avatar must not exceed 5MB',
            'cover_image.image' => 'Cover image must be an image file',
            'cover_image.mimes' => 'Cover image must be in JPEG, PNG, JPG, GIF, or WebP format',
            'cover_image.max' => 'Cover image must not exceed 5MB',
        ];
    }
}
