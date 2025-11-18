<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Services;

use App\Modules\TrainingManagement\Models\TrainingActivityFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * FileUploadService
 *
 * Handles file uploads (videos and PDFs) with validation and storage management.
 * Ensures files are properly validated, stored, and tracked in the database.
 */
class FileUploadService
{
    /**
     * Allowed video file extensions
     */
    private const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];

    /**
     * Allowed PDF file extensions
     */
    private const PDF_EXTENSIONS = ['pdf'];

    /**
     * Maximum file size for videos (in MB)
     */
    private const MAX_VIDEO_SIZE_MB = 200;

    /**
     * Maximum file size for PDFs (in MB)
     */
    private const MAX_PDF_SIZE_MB = 50;

    /**
     * Upload and validate a file
     *
     * Validates file type and size, stores the file in the appropriate directory,
     * and creates a database record to track it.
     *
     * @param UploadedFile $file The uploaded file
     * @param string $fileType File type: 'video' or 'pdf'
     * @param string $phase Training phase identifier
     * @param string|null $sessionId UUID of the training session (XOR with activityId)
     * @param string|null $activityId UUID of the training activity (XOR with sessionId)
     * @param string $userId UUID of the user uploading the file
     * @return TrainingActivityFile Created file record
     * @throws \InvalidArgumentException If validation fails
     * @throws \Exception If upload fails
     */
    public function uploadFile(
        UploadedFile $file,
        string $fileType,
        string $phase,
        ?string $sessionId,
        ?string $activityId,
        string $userId
    ): TrainingActivityFile {
        // Validate XOR constraint: exactly one of sessionId or activityId must be set
        if (($sessionId === null && $activityId === null) || ($sessionId !== null && $activityId !== null)) {
            throw new \InvalidArgumentException('Exactly one of sessionId or activityId must be provided (not both, not neither)');
        }

        // Validate file type
        $allowedExtensions = [];
        $maxSizeMB = 0;
        $storageDirectory = '';

        if ($fileType === 'video') {
            $allowedExtensions = self::VIDEO_EXTENSIONS;
            $maxSizeMB = self::MAX_VIDEO_SIZE_MB;
            $storageDirectory = 'videos';
        } elseif ($fileType === 'pdf') {
            $allowedExtensions = self::PDF_EXTENSIONS;
            $maxSizeMB = self::MAX_PDF_SIZE_MB;
            $storageDirectory = 'pdfs';
        } else {
            throw new \InvalidArgumentException("Invalid file type. Expected 'video' or 'pdf', got: {$fileType}");
        }

        // Validate file extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, $allowedExtensions)) {
            throw new \InvalidArgumentException(
                "Invalid file extension. Allowed extensions for {$fileType}: " . implode(', ', $allowedExtensions)
            );
        }

        // Validate file size (convert MB to bytes)
        $maxSizeBytes = $maxSizeMB * 1024 * 1024;
        if ($file->getSize() > $maxSizeBytes) {
            throw new \InvalidArgumentException(
                "File size exceeds maximum allowed size of {$maxSizeMB}MB"
            );
        }

        // Get tenant ID from configuration
        $tenantId = config('app.tenant_id');

        // Sanitize filename: create a slug from the original filename
        $originalName = $file->getClientOriginalName();
        $filenameWithoutExtension = pathinfo($originalName, PATHINFO_FILENAME);
        $sanitizedFilename = Str::slug($filenameWithoutExtension);

        // Generate unique filename to avoid collisions
        $uniqueFilename = $sanitizedFilename . '_' . time() . '_' . Str::random(8) . '.' . $extension;

        // Define storage path
        $storagePath = "training/{$tenantId}/{$storageDirectory}";

        // Store the file
        $filePath = Storage::disk('public')->putFileAs(
            $storagePath,
            $file,
            $uniqueFilename
        );

        if (!$filePath) {
            throw new \Exception('Failed to store file');
        }

        // Get file size and mime type
        $fileSize = $file->getSize();
        $mimeType = $file->getMimeType();

        // Create database record
        try {
            $fileRecord = TrainingActivityFile::create([
                'tenant_id' => $tenantId,
                'session_id' => $sessionId,
                'activity_id' => $activityId,
                'file_type' => $fileType,
                'file_path' => $filePath,
                'file_name' => $originalName,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'phase' => $phase,
                'uploaded_by' => $userId,
            ]);

            return $fileRecord;
        } catch (\Exception $e) {
            // If database record creation fails, delete the uploaded file
            Storage::disk('public')->delete($filePath);
            throw new \Exception('Failed to create file record: ' . $e->getMessage());
        }
    }

    /**
     * Delete a file from storage and database
     *
     * Removes the physical file from storage and deletes the database record.
     * Verifies tenant ownership before deletion.
     *
     * @param string $fileId UUID of the file to delete
     * @return bool True if deletion was successful
     * @throws \Exception If file not found or deletion fails
     */
    public function deleteFile(string $fileId): bool
    {
        // Get tenant ID from configuration
        $tenantId = config('app.tenant_id');

        // Find the file record and verify tenant ownership
        $fileRecord = TrainingActivityFile::where('id', $fileId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Delete physical file from storage
        if ($fileRecord->file_path && Storage::disk('public')->exists($fileRecord->file_path)) {
            $deleted = Storage::disk('public')->delete($fileRecord->file_path);

            if (!$deleted) {
                throw new \Exception('Failed to delete physical file from storage');
            }
        }

        // Delete database record
        $fileRecord->delete();

        return true;
    }
}
