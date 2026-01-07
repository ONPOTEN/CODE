<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroupCommentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'comment_content' => 'nullable|string|max:5000',
            'parent_id' => 'nullable|integer|exists:group_comments,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $content = $this->input('comment_content');
            $hasImage = $this->hasFile('image');

            if (empty($content) && !$hasImage) {
                $validator->errors()->add('comment_content', 'Comment must have either content or an image');
            }
        });
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'comment_content.max' => 'Comment must not exceed 5000 characters',
            'parent_id.exists' => 'The parent comment does not exist',
            'image.image' => 'The file must be an image',
            'image.mimes' => 'Only JPEG, PNG, JPG, GIF and WebP images are allowed',
            'image.max' => 'Image size must not exceed 5MB',
        ];
    }
}
