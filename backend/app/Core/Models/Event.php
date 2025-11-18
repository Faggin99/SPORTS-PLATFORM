<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;

/**
 * Eventos genéricos (torneios, workshops, etc)
 */
class Event extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'created_by',
        'type',
        'title',
        'description',
        'banner',
        'start_date',
        'end_date',
        'start_time',
        'max_participants',
        'registration_fee',
        'registration_deadline',
        'status',
        'metadata',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'registration_deadline' => 'date',
        'registration_fee' => 'decimal:2',
        'metadata' => 'array',
    ];

    /**
     * Relacionamentos
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tournament()
    {
        return $this->hasOne(\App\Modules\SportsArena\Models\Tournament::class);
    }

    /**
     * Scopes
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeOngoing($query)
    {
        return $query->where('status', 'ongoing');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_date', '>', now())
                     ->where('status', 'published')
                     ->orderBy('start_date');
    }

    /**
     * Métodos auxiliares
     */
    public function isRegistrationOpen(): bool
    {
        return $this->status === 'published'
               && $this->registration_deadline >= now();
    }

    public function hasAvailableSlots(): bool
    {
        if (!$this->max_participants) {
            return true;
        }

        // TODO: Contar participantes inscritos
        return true;
    }
}
