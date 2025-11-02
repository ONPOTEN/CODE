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
            'comment_content' => 'required|string|min:1|max:5000',
            'parent_id' => 'nullable|integer|exists:group_comments,id',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'comment_content.required' => 'Comment content is required',
            'comment_content.min' => 'Comment must not be empty',
            'comment_content.max' => 'Comment must not exceed 5000 characters',
            'parent_id.exists' => 'The parent comment does not exist',
        ];
    }
}
