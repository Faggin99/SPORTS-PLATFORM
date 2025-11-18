<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\ActivityTitle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * TitleController
 *
 * Manages activity titles
 */
class TitleController extends Controller
{
    /**
     * Get all activity titles with optional filtering
     *
     * GET /api/training-management/titles
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = ActivityTitle::with('content');

        // Filter by content_id if provided
        if ($request->has('content_id')) {
            $query->where('content_id', $request->input('content_id'));
        }

        // Handle pagination
        if ($request->input('per_page') === 'all') {
            $titles = $query->get();
        } else {
            $titles = $query->paginate(15);
        }

        return response()->json($titles, 200);
    }

    /**
     * Create a new activity title
     *
     * POST /api/training-management/titles
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // TODO: Use StoreTitleRequest for validation
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content_id' => 'required|exists:contents,id',
            'description' => 'nullable|string',
        ]);

        // Add tenant_id from authenticated user
        $validated['tenant_id'] = $request->user()->tenant_id;

        $title = ActivityTitle::create($validated);

        // Load the content relationship
        $title->load('content');

        return response()->json($title, 201);
    }

    /**
     * Update an existing activity title
     *
     * PUT /api/training-management/titles/{id}
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // TODO: Use UpdateTitleRequest for validation
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content_id' => 'nullable|exists:contents,id',
            'description' => 'nullable|string',
        ]);

        $title = ActivityTitle::findOrFail($id);
        $title->update($validated);

        // Reload the content relationship
        $title->load('content');

        return response()->json($title, 200);
    }

    /**
     * Delete an activity title
     *
     * DELETE /api/training-management/titles/{id}
     *
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $id): JsonResponse
    {
        $title = ActivityTitle::findOrFail($id);
        $title->delete();

        return response()->json(null, 204);
    }
}
