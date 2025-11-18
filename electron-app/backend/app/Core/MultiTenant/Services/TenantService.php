<?php

namespace App\Core\MultiTenant\Services;

use App\Core\Models\Tenant;
use Illuminate\Support\Facades\Cache;

class TenantService
{
    /**
     * Busca tenant por subdomínio (com cache)
     */
    public function findBySubdomain(string $subdomain): ?Tenant
    {
        return Cache::remember("tenant.{$subdomain}", 3600, function () use ($subdomain) {
            return Tenant::where('subdomain', $subdomain)->first();
        });
    }

    /**
     * Busca tenant padrão para desenvolvimento local
     */
    public function getDefaultTenant(): ?Tenant
    {
        return Cache::remember('tenant.default', 3600, function () {
            return Tenant::where('status', 'active')->first();
        });
    }

    /**
     * Cria novo tenant
     */
    public function create(array $data): Tenant
    {
        $tenant = Tenant::create([
            'name' => $data['name'],
            'subdomain' => $data['subdomain'],
            'domain' => $data['domain'] ?? null,
            'logo' => $data['logo'] ?? null,
            'theme_config' => $data['theme_config'] ?? $this->defaultTheme(),
            'settings' => $data['settings'] ?? [],
            'policies' => $data['policies'] ?? $this->defaultPolicies(),
            'status' => 'active',
        ]);

        // Limpa cache
        Cache::forget("tenant.{$tenant->subdomain}");

        return $tenant;
    }

    /**
     * Atualiza configurações do tenant
     */
    public function updateConfig(int $tenantId, array $config): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->update($config);

        // Limpa cache
        Cache::forget("tenant.{$tenant->subdomain}");

        return $tenant->fresh();
    }

    /**
     * Tema padrão
     */
    private function defaultTheme(): array
    {
        return [
            'primary_color' => '#3B82F6',
            'secondary_color' => '#10B981',
            'accent_color' => '#F59E0B',
            'background' => '#FFFFFF',
            'text' => '#1F2937',
        ];
    }

    /**
     * Políticas padrão
     */
    private function defaultPolicies(): array
    {
        return [
            'booking_cancellation_hours' => 24,
            'refund_percentage' => 100,
            'booking_min_advance_hours' => 2,
        ];
    }
}
