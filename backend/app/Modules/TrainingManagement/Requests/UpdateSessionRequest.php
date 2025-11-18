<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for updating a training session with blocks data.
 *
 * Validates the structure of training blocks and their associated activities.
 */
class UpdateSessionRequest extends FormRequest
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
            'blocks' => ['required', 'array'],
            'blocks.*.id' => ['required', 'string'],
            'blocks.*.activity' => ['nullable', 'array'],
            'blocks.*.activity.title_id' => ['nullable', 'string', 'exists:activity_titles,id'],
            'blocks.*.activity.content_ids' => ['nullable', 'array'],
            'blocks.*.activity.content_ids.*' => ['string', 'exists:contents,id'],
            'blocks.*.activity.groups' => ['nullable', 'array'],
            'blocks.*.activity.groups.*' => ['string', 'in:G1,G2,G3,G4'],
            'blocks.*.activity.duration_minutes' => ['nullable', 'integer', 'min:1', 'max:300'],
            'blocks.*.activity.is_rest' => ['nullable', 'boolean'],
            'blocks.*.activity.stages' => ['nullable', 'array'],
            'blocks.*.activity.stages.*.name' => ['required_with:blocks.*.activity.stages', 'string'],
            'blocks.*.activity.stages.*.order' => ['required_with:blocks.*.activity.stages', 'integer', 'min:1'],
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
            'blocks.required' => 'At least one training block is required.',
            'blocks.*.id.required' => 'Each block must have a valid ID.',
            'blocks.*.activity.groups.*.in' => 'Group must be one of: G1, G2, G3, G4.',
            'blocks.*.activity.duration_minutes.min' => 'Duration must be at least 1 minute.',
            'blocks.*.activity.duration_minutes.max' => 'Duration cannot exceed 300 minutes.',
        ];
    }
}
