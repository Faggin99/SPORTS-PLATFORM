<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\Athlete;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * AthleteController
 *
 * Manages athletes and group assignments
 */
class AthleteController extends Controller
{
    /**
     * Get all athletes with optional filtering
     *
     * GET /api/training-management/athletes
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = Athlete::query();

        // Filter by group if provided
        if ($request->has('group')) {
            $query->where('group', $request->input('group'));
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        // Don't filter by status by default - return all athletes

        $athletes = $query->orderBy('name')->get();

        return response()->json($athletes, 200);
    }

    /**
     * Create a new athlete
     *
     * POST /api/training-management/athletes
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // TODO: Use StoreAthleteRequest for validation
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'jersey_number' => 'nullable|integer|min:1|max:99',
            'group' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,injured,suspended,inactive',
            'observation' => 'nullable|string',
        ]);

        // Set default status if not provided
        if (!isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        $athlete = Athlete::create($validated);

        return response()->json($athlete, 201);
    }

    /**
     * Update an existing athlete
     *
     * PUT /api/training-management/athletes/{id}
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // TODO: Use UpdateAthleteRequest for validation
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'position' => 'nullable|string|max:100',
            'jersey_number' => 'nullable|integer|min:1|max:99',
            'group' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,injured,suspended,inactive',
            'observation' => 'nullable|string',
        ]);

        $athlete = Athlete::findOrFail($id);
        $athlete->update($validated);

        return response()->json($athlete, 200);
    }

    /**
     * Delete an athlete
     *
     * DELETE /api/training-management/athletes/{id}
     *
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $id): JsonResponse
    {
        $athlete = Athlete::findOrFail($id);
        $athlete->delete();

        return response()->json([
            'message' => 'Athlete deleted successfully'
        ], 200);
    }

    /**
     * Batch update athlete groups (for drag-and-drop functionality)
     *
     * POST /api/training-management/athletes/batch-update-groups
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function batchUpdateGroups(Request $request): JsonResponse
    {
        // TODO: Use BatchUpdateGroupsRequest for validation
        $validated = $request->validate([
            'athletes' => 'required|array',
            'athletes.*.id' => 'required|exists:athletes,id',
            'athletes.*.group' => 'nullable|string|max:50',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['athletes'] as $athleteData) {
                Athlete::where('id', $athleteData['id'])
                    ->update(['group' => $athleteData['group']]);
            }
        });

        return response()->json([
            'message' => 'Athlete groups updated successfully',
            'updated_count' => count($validated['athletes'])
        ], 200);
    }
}
