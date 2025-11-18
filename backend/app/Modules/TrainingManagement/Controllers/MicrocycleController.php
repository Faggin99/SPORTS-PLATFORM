<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Services\MicrocycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MicrocycleController
 *
 * Manages weekly training microcycles
 */
class MicrocycleController extends Controller
{
    /**
     * Get or create a microcycle by week identifier
     *
     * GET /api/training-management/microcycles/{weekIdentifier}
     *
     * @param string $weekIdentifier Week identifier (e.g., "2024-W01")
     * @param MicrocycleService $service
     * @return JsonResponse
     */
    public function show(string $weekIdentifier, MicrocycleService $service, Request $request): JsonResponse
    {
        // Define tenant_id do usuário autenticado no config para uso pelo serviço
        $user = $request->user();
        config(['app.tenant_id' => $user->tenant_id]);

        $microcycle = $service->getOrCreateMicrocycle($weekIdentifier);

        return response()->json($microcycle, 200);
    }
}
