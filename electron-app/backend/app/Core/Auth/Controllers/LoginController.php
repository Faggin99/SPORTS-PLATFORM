<?php

namespace App\Core\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Core\Auth\Requests\LoginRequest;
use App\Core\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;

class LoginController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Login do usuário
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $result = $this->authService->login($credentials);

        if (!$result['success']) {
            return response()->json([
                'message' => $result['message']
            ], 401);
        }

        return response()->json([
            'message' => 'Login realizado com sucesso',
            'user' => $result['user'],
            'token' => $result['token'],
        ]);
    }

    /**
     * Logout do usuário
     */
    public function logout(): JsonResponse
    {
        $this->authService->logout();

        return response()->json([
            'message' => 'Logout realizado com sucesso'
        ]);
    }

    /**
     * Retorna dados do usuário autenticado
     */
    public function me(): JsonResponse
    {
        return response()->json([
            'user' => auth()->user()
        ]);
    }
}
