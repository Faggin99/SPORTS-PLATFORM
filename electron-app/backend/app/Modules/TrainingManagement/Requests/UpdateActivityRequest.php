<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for updating an existing training activity.
 *
 * Validates activity updates and ensures rest activities don't have incompatible fields.
 */
class UpdateActivityRequest extends FormRequest
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
            'title_id' => ['nullable', 'string', 'exists:activity_titles,id'],
            'content_ids' => ['nullable', 'array'],
            'content_ids.*' => ['string', 'exists:contents,id'],
            'groups' => ['nullable', 'array'],
            'groups.*' => ['string', 'in:G1,G2,G3,G4'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:300'],
            'is_rest' => ['nullable', 'boolean'],
            'stages' => ['nullable', 'array'],
            'stages.*.name' => ['required_with:stages', 'string'],
            'stages.*.order' => ['required_with:stages', 'integer', 'min:1'],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->is_rest && ($this->title_id || $this->content_ids || $this->stages)) {
                $validator->errors()->add('is_rest', 'Rest activities cannot have title, contents, or stages.');
            }
        });
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'groups.*.in' => 'Group must be one of: G1, G2, G3, G4.',
            'duration_minutes.min' => 'Duration must be at least 1 minute.',
            'duration_minutes.max' => 'Duration cannot exceed 300 minutes.',
            'stages.*.name.required_with' => 'Each stage must have a name.',
            'stages.*.order.required_with' => 'Each stage must have an order.',
            'stages.*.order.min' => 'Stage order must be at least 1.',
        ];
    }
}
