<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;

/**
 * Assinaturas de usuários
 */
class Subscription extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'plan_id',
        'start_date',
        'end_date',
        'next_billing_date',
        'status',
        'used_hours',
        'cancelled_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'next_billing_date' => 'date',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Relacionamentos
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Métodos auxiliares
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && $this->end_date >= now();
    }

    public function daysRemaining(): int
    {
        if (!$this->isActive()) {
            return 0;
        }

        return now()->diffInDays($this->end_date, false);
    }

    public function canUse(): bool
    {
        return $this->isActive();
    }
}
