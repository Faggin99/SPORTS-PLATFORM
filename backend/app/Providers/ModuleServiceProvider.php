<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class ModuleServiceProvider extends ServiceProvider
{
    /**
     * Módulos disponíveis
     */
    protected $modules = [
        'SportsArena',
        'TrainingManagement',
    ];

    /**
     * Register services
     */
    public function register(): void
    {
        // Registrar services dos módulos se necessário
    }

    /**
     * Bootstrap services - carrega rotas dos módulos
     */
    public function boot(): void
    {
        foreach ($this->modules as $module) {
            $routeFile = app_path("Modules/{$module}/routes.php");

            if (file_exists($routeFile)) {
                Route::middleware(['api', 'identify.tenant', 'auth:sanctum'])
                    ->prefix("api/{$this->getModulePrefix($module)}")
                    ->group($routeFile);
            }
        }
    }

    /**
     * Retorna prefixo da rota do módulo
     */
    private function getModulePrefix(string $module): string
    {
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $module));
    }
}
