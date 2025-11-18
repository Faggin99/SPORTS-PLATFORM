<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for updating an existing activity title.
 *
 * Validates title updates including optional content association.
 */
class UpdateTitleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content_id' => ['nullable', 'string', 'exists:contents,id'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Title is required.',
            'title.max' => 'Title cannot exceed 255 characters.',
            'content_id.exists' => 'The specified content does not exist.',
            'description.max' => 'Description cannot exceed 1000 characters.',
        ];
    }
}
