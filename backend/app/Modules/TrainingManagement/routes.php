<?php

use Illuminate\Support\Facades\Route;
use App\Modules\TrainingManagement\Controllers\MicrocycleController;
use App\Modules\TrainingManagement\Controllers\SessionController;
use App\Modules\TrainingManagement\Controllers\ActivityController;
use App\Modules\TrainingManagement\Controllers\TitleController;
use App\Modules\TrainingManagement\Controllers\ContentController;
use App\Modules\TrainingManagement\Controllers\AthleteController;
use App\Modules\TrainingManagement\Controllers\FileController;
use App\Modules\TrainingManagement\Controllers\SessionFileController;
use App\Modules\TrainingManagement\Controllers\StatsController;

/*
|--------------------------------------------------------------------------
| Training Management Module Routes
|--------------------------------------------------------------------------
|
| All routes are automatically prefixed with /api/training-management
| and protected with auth:sanctum middleware via ModuleServiceProvider
|
*/

Route::middleware(['auth:sanctum'])->group(function () {

    // Microcycles - Weekly training cycles
    Route::get('microcycles/{weekIdentifier}', [MicrocycleController::class, 'show']);

    // Sessions - Individual training sessions
    Route::get('sessions/{id}', [SessionController::class, 'show']);
    Route::put('sessions/{id}', [SessionController::class, 'update']);
    Route::patch('sessions/{id}/type', [SessionController::class, 'updateType']);

    // Activities - Training activities
    Route::post('activities', [ActivityController::class, 'store']);
    Route::put('activities/{id}', [ActivityController::class, 'update']);
    Route::delete('activities/{id}', [ActivityController::class, 'destroy']);

    // Titles - Activity titles
    Route::get('titles', [TitleController::class, 'index']);
    Route::post('titles', [TitleController::class, 'store']);
    Route::put('titles/{id}', [TitleController::class, 'update']);
    Route::delete('titles/{id}', [TitleController::class, 'destroy']);

    // Contents - Training content categories (read-only)
    Route::get('contents', [ContentController::class, 'index']);

    // Stages - Training activity stages (read-only)
    Route::get('stages', [\App\Modules\TrainingManagement\Controllers\StageController::class, 'index']);

    // Athletes - Player roster management
    Route::get('athletes', [AthleteController::class, 'index']);
    Route::post('athletes', [AthleteController::class, 'store']);
    Route::put('athletes/{id}', [AthleteController::class, 'update']);
    Route::delete('athletes/{id}', [AthleteController::class, 'destroy']);
    Route::post('athletes/batch-update-groups', [AthleteController::class, 'batchUpdateGroups']);

    // Files - Upload and management
    Route::post('files/upload', [FileController::class, 'upload']);
    Route::delete('files/{id}', [FileController::class, 'destroy']);

    // Session Files - Upload and management for training sessions
    Route::post('sessions/{sessionId}/files', [SessionFileController::class, 'store']);
    Route::get('sessions/{sessionId}/files', [SessionFileController::class, 'index']);
    Route::get('session-files/{fileId}', [SessionFileController::class, 'show']);
    Route::delete('session-files/{fileId}', [SessionFileController::class, 'destroy']);

    // Statistics - Training statistics and analytics
    Route::get('stats', [StatsController::class, 'index']);
});
