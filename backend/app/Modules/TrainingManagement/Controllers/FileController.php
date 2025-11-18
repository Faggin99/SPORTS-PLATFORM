<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Services\FileUploadService;
use App\Modules\TrainingManagement\Models\TrainingActivityFile;
use App\Modules\TrainingManagement\Resources\FileResource;
use App\Modules\TrainingManagement\Requests\UploadFileRequest;
use Illuminate\Http\JsonResponse;

/**
 * File upload and management controller
 */
class FileController extends Controller
{
    /**
     * Upload a new file (video or PDF)
     */
    public function upload(
        UploadFileRequest $request,
        FileUploadService $service
    ): JsonResponse {
        $file = $service->uploadFile(
            file: $request->file('file'),
            fileType: $request->input('file_type'),
            phase: $request->input('phase'),
            sessionId: $request->input('session_id'),
            activityId: $request->input('activity_id'),
            userId: auth()->id()
        );

        return response()->json(
            new FileResource($file->load('creator')),
            201
        );
    }

    /**
     * Delete a file
     */
    public function destroy(string $id, FileUploadService $service): JsonResponse
    {
        $file = TrainingActivityFile::findOrFail($id);

        $service->deleteFile($id);

        return response()->json(null, 204);
    }
}
