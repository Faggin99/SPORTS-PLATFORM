<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Core\Auth\LoginController;
use App\Http\Controllers\Core\Auth\ProfileController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Rotas de Autenticação
Route::prefix('auth')->group(function () {
    Route::post('/login', [LoginController::class, 'login']);
    Route::post('/logout', [LoginController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [LoginController::class, 'me'])->middleware('auth:sanctum');
});

// Rotas de Perfil
Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
    Route::get('/', [ProfileController::class, 'show']);
    Route::put('/', [ProfileController::class, 'update']);
    Route::post('/photo', [ProfileController::class, 'uploadPhoto']);
    Route::delete('/photo', [ProfileController::class, 'deletePhoto']);
});

// As rotas dos módulos são carregadas automaticamente via ModuleServiceProvider
// Prefixos:
// - /api/sports-arena/*
// - /api/training-management/*
