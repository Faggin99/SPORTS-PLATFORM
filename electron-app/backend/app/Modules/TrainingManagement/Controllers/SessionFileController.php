<?php

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\SessionFile;
use App\Modules\TrainingManagement\Models\TrainingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SessionFileController extends Controller
{
    /**
     * Upload file to a training session
     */
    public function store(Request $request, $sessionId)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:5242880', // 5GB max (5120MB * 1024)
            'title' => 'required|string|max:255',
        ]);

        $session = TrainingSession::where('id', $sessionId)
            ->where('tenant_id', $request->user()->tenant_id)
            ->firstOrFail();

        $file = $request->file('file');

        // Generate unique file name
        $fileName = time() . '_' . $file->getClientOriginalName();
        $filePath = $file->storeAs(
            'training-files/' . $request->user()->tenant_id . '/' . $sessionId,
            $fileName,
            'public'
        );

        // Determine file type (image, video, document)
        $mimeType = $file->getMimeType();
        $fileType = 'document';
        if (str_starts_with($mimeType, 'image/')) {
            $fileType = 'image';
        } elseif (str_starts_with($mimeType, 'video/')) {
            $fileType = 'video';
        }

        $sessionFile = SessionFile::create([
            'tenant_id' => $request->user()->tenant_id,
            'session_id' => $sessionId,
            'file_name' => $file->getClientOriginalName(),
            'title' => $validated['title'],
            'file_path' => $filePath,
            'file_type' => $fileType,
            'file_size' => $file->getSize(),
            'mime_type' => $mimeType,
        ]);

        return response()->json($sessionFile, 201);
    }

    /**
     * Get all files for a training session
     */
    public function index(Request $request, $sessionId)
    {
        $files = SessionFile::where('session_id', $sessionId)
            ->where('tenant_id', $request->user()->tenant_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($files);
    }

    /**
     * Delete a file
     */
    public function destroy(Request $request, $fileId)
    {
        $file = SessionFile::where('id', $fileId)
            ->where('tenant_id', $request->user()->tenant_id)
            ->firstOrFail();

        // Delete physical file
        if (Storage::disk('public')->exists($file->file_path)) {
            Storage::disk('public')->delete($file->file_path);
        }

        $file->delete();

        return response()->json(['message' => 'File deleted successfully']);
    }

    /**
     * Download/serve a file
     */
    public function show(Request $request, $fileId)
    {
        $file = SessionFile::where('id', $fileId)
            ->where('tenant_id', $request->user()->tenant_id)
            ->firstOrFail();

        if (!Storage::disk('public')->exists($file->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->response($file->file_path, $file->file_name);
    }
}
