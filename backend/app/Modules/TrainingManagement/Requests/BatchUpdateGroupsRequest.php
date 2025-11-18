<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for batch updating athlete groups.
 *
 * Validates multiple athlete group assignments in a single request.
 */
class BatchUpdateGroupsRequest extends FormRequest
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
            'athletes' => ['required', 'array'],
            'athletes.*.id' => ['required', 'string', 'exists:athletes,id'],
            'athletes.*.group' => ['nullable', 'string', 'in:G1,G2,G3,G4'],
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
            'athletes.required' => 'At least one athlete is required for batch update.',
            'athletes.*.id.required' => 'Each athlete entry must have an ID.',
            'athletes.*.id.exists' => 'One or more athlete IDs do not exist.',
            'athletes.*.group.in' => 'Group must be one of: G1, G2, G3, G4.',
        ];
    }
}
