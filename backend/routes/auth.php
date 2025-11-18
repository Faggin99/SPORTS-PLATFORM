<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Core\Auth\LoginController;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me', [LoginController::class, 'me'])->middleware('auth:sanctum');
