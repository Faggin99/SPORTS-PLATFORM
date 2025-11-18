<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\Content;
use Illuminate\Http\JsonResponse;

/**
 * ContentController
 *
 * Manages training content categories (read-only)
 */
class ContentController extends Controller
{
    /**
     * Get all training contents
     *
     * GET /api/training-management/contents
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $contents = cache()->remember('training_contents', 3600, function () {
            return Content::orderBy('name')->get();
        });

        return response()->json($contents, 200);
    }
}
