<?php

namespace App\Core\MultiTenant\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Core\MultiTenant\Services\TenantService;

class IdentifyTenant
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * Identifica o tenant pelo subdomínio e seta no contexto da aplicação
     */
    public function handle(Request $request, Closure $next)
    {
        $host = $request->getHost();
        $subdomain = $this->extractSubdomain($host);

        // Em desenvolvimento local sem subdomínio, usa tenant padrão
        if (!$subdomain && config('app.env') === 'local') {
            $tenant = $this->tenantService->getDefaultTenant();

            if ($tenant && $tenant->status === 'active') {
                app()->instance('tenant', $tenant);
                config(['app.tenant_id' => $tenant->id]);
                config(['app.tenant' => $tenant]);
                return $next($request);
            }
        }

        if (!$subdomain) {
            return response()->json(['error' => 'Tenant não identificado'], 400);
        }

        $tenant = $this->tenantService->findBySubdomain($subdomain);

        if (!$tenant || $tenant->status !== 'active') {
            return response()->json(['error' => 'Tenant inválido ou inativo'], 403);
        }

        // Seta tenant no container para ser acessado globalmente
        app()->instance('tenant', $tenant);

        // Define tenant_id no config para facilitar acesso
        config(['app.tenant_id' => $tenant->id]);
        config(['app.tenant' => $tenant]);

        return $next($request);
    }

    /**
     * Extrai subdomínio do host
     * Ex: arena1.localhost -> arena1
     *     clube2.plataforma.com -> clube2
     */
    private function extractSubdomain(string $host): ?string
    {
        // Remove porta se houver
        $host = explode(':', $host)[0];

        $parts = explode('.', $host);

        // Se tiver só uma parte (localhost) ou for IP, não tem subdomínio
        if (count($parts) <= 1 || filter_var($host, FILTER_VALIDATE_IP)) {
            return null;
        }

        // Retorna primeira parte como subdomínio
        return $parts[0];
    }
}
