<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Modules\TrainingManagement\Policies\TrainingPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // Register model policies here if needed
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerTrainingGates();
    }

    /**
     * Register Training Management gates
     */
    protected function registerTrainingGates(): void
    {
        Gate::define('view-training', [TrainingPolicy::class, 'viewTraining']);
        Gate::define('manage-training', [TrainingPolicy::class, 'manageTraining']);
        Gate::define('upload-files', [TrainingPolicy::class, 'uploadFiles']);
        Gate::define('manage-athletes', [TrainingPolicy::class, 'manageAthletes']);
        Gate::define('view-athletes', [TrainingPolicy::class, 'viewAthletes']);
    }
}
