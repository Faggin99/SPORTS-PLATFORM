<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\MultiTenant\Traits\BelongsToTenant;

/**
 * Recurso genérico (quadras, salas, equipamentos)
 */
class Resource extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'category',
        'description',
        'capacity',
        'features',
        'price_per_hour',
        'availability',
        'metadata',
        'status',
    ];

    protected $casts = [
        'features' => 'array',
        'availability' => 'array',
        'metadata' => 'array',
        'price_per_hour' => 'decimal:2',
    ];

    /**
     * Relacionamentos
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'active');
    }
}
