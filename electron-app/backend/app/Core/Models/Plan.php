<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;

/**
 * Planos de assinatura
 */
class Plan extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'price',
        'interval',
        'duration_months',
        'features',
        'has_booking_priority',
        'included_hours',
        'discount_percentage',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'has_booking_priority' => 'boolean',
        'discount_percentage' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Relacionamentos
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeMonthly($query)
    {
        return $query->where('interval', 'monthly');
    }

    /**
     * Accessors
     */
    public function getFormattedPriceAttribute(): string
    {
        return 'R$ ' . number_format($this->price, 2, ',', '.');
    }

    public function getPricePerMonthAttribute(): float
    {
        return $this->price / $this->duration_months;
    }
}
