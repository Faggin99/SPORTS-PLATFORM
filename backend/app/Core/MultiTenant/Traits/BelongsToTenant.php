<?php

namespace App\Core\MultiTenant\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    /**
     * Boot trait - adiciona global scope automático
     */
    protected static function bootBelongsToTenant()
    {
        // Ao criar novo registro, seta tenant_id automaticamente
        static::creating(function ($model) {
            if (!$model->tenant_id && config('app.tenant_id')) {
                $model->tenant_id = config('app.tenant_id');
            }
        });

        // Adiciona where tenant_id em todas as queries
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (config('app.tenant_id')) {
                $builder->where($builder->getQuery()->from . '.tenant_id', config('app.tenant_id'));
            }
        });
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant()
    {
        return $this->belongsTo(\App\Core\Models\Tenant::class);
    }
}
