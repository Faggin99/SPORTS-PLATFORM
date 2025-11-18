<?php

namespace App\Core\Auth\Services;

use App\Core\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    /**
     * Realiza login do usuário
     */
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return [
                'success' => false,
                'message' => 'Credenciais inválidas'
            ];
        }

        // Verifica se tenant está ativo
        if ($user->tenant->status !== 'active') {
            return [
                'success' => false,
                'message' => 'Tenant inativo'
            ];
        }

        // Cria token
        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'success' => true,
            'user' => $user->load('tenant'),
            'token' => $token
        ];
    }

    /**
     * Realiza logout do usuário
     */
    public function logout(): void
    {
        auth()->user()->currentAccessToken()->delete();
    }

    /**
     * Registra novo usuário
     */
    public function register(array $data): array
    {
        $user = User::create([
            'tenant_id' => $data['tenant_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? 'user',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'success' => true,
            'user' => $user->load('tenant'),
            'token' => $token
        ];
    }

    /**
     * Solicita recuperação de senha
     */
    public function forgotPassword(string $email): array
    {
        $user = User::where('email', $email)->first();

        if (!$user) {
            return [
                'success' => false,
                'message' => 'Email não encontrado'
            ];
        }

        // TODO: Implementar envio de email com token de reset

        return [
            'success' => true,
            'message' => 'Email de recuperação enviado'
        ];
    }

    /**
     * Reseta senha do usuário
     */
    public function resetPassword(array $data): array
    {
        // TODO: Validar token de reset

        $user = User::where('email', $data['email'])->first();

        if (!$user) {
            return [
                'success' => false,
                'message' => 'Usuário não encontrado'
            ];
        }

        $user->update([
            'password' => Hash::make($data['password'])
        ]);

        return [
            'success' => true,
            'message' => 'Senha alterada com sucesso'
        ];
    }
}
