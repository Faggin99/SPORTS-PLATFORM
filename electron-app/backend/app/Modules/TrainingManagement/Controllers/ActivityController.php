<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\TrainingActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ActivityController
 *
 * Manages training activities
 */
class ActivityController extends Controller
{
    /**
     * Create a new training activity
     *
     * POST /api/training-management/activities
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // TODO: Use StoreActivityRequest for validation
        $validated = $request->validate([
            'block_id' => 'required|exists:training_activity_blocks,id',
            'titleId' => 'nullable|exists:activity_titles,id',
            'description' => 'nullable|string',
            'group' => 'nullable|string',
            'groups' => 'nullable|array',
            'groups.*' => 'string',
            'duration_minutes' => 'nullable|integer|min:1',
            'is_rest' => 'nullable|boolean',
            'selectedContents' => 'nullable|array',
            'selectedContents.*' => 'exists:contents,id',
            'selectedStages' => 'nullable|array',
            'selectedStages.*' => 'exists:stages,id',
        ]);

        // Add tenant_id from authenticated user
        $validated['tenant_id'] = $request->user()->tenant_id;

        // If is_rest is true, clear title and related fields
        if ($validated['is_rest'] ?? false) {
            $validated['titleId'] = null;
        }

        // Handle group field (convert single group to array)
        if (isset($validated['group'])) {
            $validated['groups'] = $validated['group'] ? [$validated['group']] : [];
        }

        // Create activity with basic fields
        $activity = TrainingActivity::create([
            'block_id' => $validated['block_id'],
            'title_id' => $validated['titleId'] ?? null,
            'description' => $validated['description'] ?? null,
            'groups' => $validated['groups'] ?? null,
            'duration_minutes' => $validated['duration_minutes'] ?? null,
            'is_rest' => $validated['is_rest'] ?? false,
            'tenant_id' => $validated['tenant_id'],
        ]);

        // Sync contents relationship if provided
        if (isset($validated['selectedContents'])) {
            $activity->contents()->sync($validated['selectedContents']);
        }

        // Create stages if provided
        if (isset($validated['selectedStages'])) {
            $stageModels = \App\Modules\TrainingManagement\Models\Stage::whereIn('id', $validated['selectedStages'])->get();
            foreach ($stageModels as $index => $stage) {
                $activity->stages()->create([
                    'stage_name' => $stage->name,
                    'order' => $index + 1,
                ]);
            }
        }

        // Load relationships
        $activity->load(['title', 'contents', 'stages']);

        return response()->json($activity, 201);
    }

    /**
     * Update an existing training activity
     *
     * PUT /api/training-management/activities/{id}
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // TODO: Use UpdateActivityRequest for validation
        $validated = $request->validate([
            'titleId' => 'nullable|exists:activity_titles,id',
            'description' => 'nullable|string',
            'group' => 'nullable|string',
            'groups' => 'nullable|array',
            'groups.*' => 'string',
            'duration_minutes' => 'nullable|integer|min:1',
            'is_rest' => 'nullable|boolean',
            'selectedContents' => 'nullable|array',
            'selectedContents.*' => 'exists:contents,id',
            'selectedStages' => 'nullable|array',
            'selectedStages.*' => 'exists:stages,id',
        ]);

        $activity = TrainingActivity::findOrFail($id);

        // If is_rest is true, clear title and related fields
        if ($validated['is_rest'] ?? false) {
            $validated['titleId'] = null;
            $validated['selectedContents'] = [];
            $validated['selectedStages'] = [];
        }

        // Handle group field (convert single group to array)
        if (isset($validated['group'])) {
            $validated['groups'] = $validated['group'] ? [$validated['group']] : [];
        }

        // Update basic fields
        $activity->update([
            'title_id' => $validated['titleId'] ?? $activity->title_id,
            'description' => $validated['description'] ?? $activity->description,
            'groups' => $validated['groups'] ?? $activity->groups,
            'duration_minutes' => $validated['duration_minutes'] ?? $activity->duration_minutes,
            'is_rest' => $validated['is_rest'] ?? $activity->is_rest,
        ]);

        // Sync contents relationship if provided
        if (isset($validated['selectedContents'])) {
            $activity->contents()->sync($validated['selectedContents']);
        }

        // Update stages if provided
        if (isset($validated['selectedStages'])) {
            // Delete old stages
            $activity->stages()->delete();

            // Create new stages from selected stage IDs
            $stageModels = \App\Modules\TrainingManagement\Models\Stage::whereIn('id', $validated['selectedStages'])->get();
            foreach ($stageModels as $index => $stage) {
                $activity->stages()->create([
                    'stage_name' => $stage->name,
                    'order' => $index + 1,
                ]);
            }
        }

        // Reload relationships
        $activity->load(['title', 'contents', 'stages']);

        return response()->json($activity, 200);
    }

    /**
     * Delete a training activity
     *
     * DELETE /api/training-management/activities/{id}
     *
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $id): JsonResponse
    {
        $activity = TrainingActivity::findOrFail($id);
        $activity->delete();

        return response()->json(null, 204);
    }
}
