<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for uploading files (videos or PDFs).
 *
 * Validates file uploads and ensures files are linked to either a session or activity (XOR constraint).
 */
class UploadFileRequest extends FormRequest
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
            'file' => ['required', 'file', 'mimes:mp4,mov,avi,pdf', 'max:204800'],
            'file_type' => ['required', 'string', 'in:video,pdf'],
            'phase' => ['required', 'string', 'in:pre,post,none'],
            'session_id' => ['nullable', 'string', 'exists:training_sessions,id'],
            'activity_id' => ['nullable', 'string', 'exists:training_activities,id'],
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
            $hasSession = !empty($this->session_id);
            $hasActivity = !empty($this->activity_id);

            if ($hasSession && $hasActivity) {
                $validator->errors()->add('session_id', 'File can only be linked to session OR activity, not both.');
            }

            if (!$hasSession && !$hasActivity) {
                $validator->errors()->add('session_id', 'File must be linked to either session or activity.');
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
            'file.required' => 'A file is required for upload.',
            'file.mimes' => 'File must be a video (mp4, mov, avi) or PDF.',
            'file.max' => 'File size cannot exceed 200MB.',
            'file_type.required' => 'File type is required.',
            'file_type.in' => 'File type must be either video or pdf.',
            'phase.required' => 'Phase is required.',
            'phase.in' => 'Phase must be one of: pre, post, none.',
            'session_id.exists' => 'The specified training session does not exist.',
            'activity_id.exists' => 'The specified training activity does not exist.',
        ];
    }
}
