<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\TrainingSession;
use App\Modules\TrainingManagement\Services\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SessionController
 *
 * Manages individual training sessions
 */
class SessionController extends Controller
{
    /**
     * Get a training session by ID
     *
     * GET /api/training-management/sessions/{id}
     *
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $id): JsonResponse
    {
        $session = TrainingSession::with([
            'blocks.activity.title.content',
            'blocks.activity.contents',
            'blocks.activity.stages',
            'files'
        ])->find($id);

        if (!$session) {
            return response()->json([
                'message' => 'Training session not found'
            ], 404);
        }

        return response()->json($session, 200);
    }

    /**
     * Update a training session
     *
     * PUT /api/training-management/sessions/{id}
     *
     * @param Request $request
     * @param string $id
     * @param SessionService $service
     * @return JsonResponse
     */
    public function update(Request $request, string $id, SessionService $service): JsonResponse
    {
        // TODO: Use UpdateSessionRequest for validation
        $request->validate([
            'blocks' => 'required|array',
            'blocks.*.id' => 'sometimes|exists:training_blocks,id',
            'blocks.*.order_index' => 'required|integer|min:0',
        ]);

        $session = TrainingSession::find($id);

        if (!$session) {
            return response()->json([
                'message' => 'Training session not found'
            ], 404);
        }

        $updatedSession = $service->updateSessionBlocks($id, $request->input('blocks'));

        return response()->json($updatedSession, 200);
    }

    /**
     * Update session type (training, rest, or match)
     *
     * PATCH /api/training-management/sessions/{id}/type
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function updateType(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'session_type' => 'required|in:training,rest,match',
            'opponent_name' => 'nullable|string|max:255',
        ]);

        $session = TrainingSession::find($id);

        if (!$session) {
            return response()->json([
                'message' => 'Training session not found'
            ], 404);
        }

        $session->update([
            'session_type' => $request->input('session_type'),
            'opponent_name' => $request->input('opponent_name'),
        ]);

        // Reload with relationships
        $session->load([
            'blocks.activity.title.content',
            'blocks.activity.contents',
            'blocks.activity.stages',
            'files'
        ]);

        return response()->json($session, 200);
    }
}
