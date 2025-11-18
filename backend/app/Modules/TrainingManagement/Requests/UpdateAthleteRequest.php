<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for updating an existing athlete.
 *
 * Validates athlete updates including optional position, jersey number, group, and status.
 */
class UpdateAthleteRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:100'],
            'jersey_number' => ['nullable', 'integer', 'min:1', 'max:99'],
            'group' => ['nullable', 'string', 'in:G1,G2,G3,G4'],
            'status' => ['nullable', 'string', 'in:active,inactive,injured'],
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
            'name.required' => 'Athlete name is required.',
            'name.max' => 'Athlete name cannot exceed 255 characters.',
            'position.max' => 'Position cannot exceed 100 characters.',
            'jersey_number.min' => 'Jersey number must be at least 1.',
            'jersey_number.max' => 'Jersey number cannot exceed 99.',
            'group.in' => 'Group must be one of: G1, G2, G3, G4.',
            'status.in' => 'Status must be one of: active, inactive, injured.',
        ];
    }
}
