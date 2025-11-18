<?php

namespace App\Modules\SportsArena\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Models\Event;

/**
 * Torneio esportivo
 */
class Tournament extends Model
{
    protected $fillable = [
        'event_id',
        'sport',
        'format',
        'team_size',
        'prizes',
        'status',
    ];

    protected $casts = [
        'prizes' => 'array',
    ];

    /**
     * Relacionamentos
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function categories()
    {
        return $this->hasMany(TournamentCategory::class);
    }

    public function registrations()
    {
        return $this->hasMany(TournamentRegistration::class);
    }

    public function matches()
    {
        return $this->hasMany(Match::class);
    }

    /**
     * Scopes
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'registration_open');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Acessors via event (tenant data)
     */
    public function getTenantIdAttribute()
    {
        return $this->event->tenant_id;
    }

    public function getTitleAttribute()
    {
        return $this->event->title;
    }

    public function getDescriptionAttribute()
    {
        return $this->event->description;
    }

    /**
     * Métodos auxiliares
     */
    public function isRegistrationOpen(): bool
    {
        return $this->status === 'registration_open'
               && $this->event->registration_deadline >= now();
    }

    public function getTotalTeams(): int
    {
        return $this->registrations()
                    ->where('status', 'approved')
                    ->count();
    }

    public function hasAvailableSlots(): bool
    {
        $totalSlots = $this->categories->sum('max_teams');
        return $this->getTotalTeams() < $totalSlots;
    }
}
