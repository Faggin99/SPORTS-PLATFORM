<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\Stage;
use Illuminate\Http\JsonResponse;

/**
 * StageController
 *
 * Manages training activity stages (global, read-only)
 */
class StageController extends Controller
{
    /**
     * Get all training stages, optionally filtered by content
     *
     * GET /api/training-management/stages?content=Organização Ofensiva
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $contentName = request()->query('content');

        if ($contentName) {
            $stages = Stage::where('content_name', $contentName)
                ->orderBy('order')
                ->get();
        } else {
            $stages = cache()->remember('training_stages', 3600, function () {
                return Stage::orderBy('order')->get();
            });
        }

        return response()->json($stages);
    }
}
