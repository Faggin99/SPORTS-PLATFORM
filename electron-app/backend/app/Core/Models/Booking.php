<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;
use Carbon\Carbon;

/**
 * Reserva genérica de recursos
 */
class Booking extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'resource_id',
        'user_id',
        'date',
        'start_time',
        'end_time',
        'amount',
        'discount',
        'final_amount',
        'payment_method',
        'payment_status',
        'payment_id',
        'status',
        'notes',
        'cancelled_at',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Relacionamentos
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->morphOne(Transaction::class, 'transactionable');
    }

    /**
     * Scopes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('date', '>=', Carbon::today())
                     ->whereIn('status', ['pending', 'confirmed'])
                     ->orderBy('date')
                     ->orderBy('start_time');
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Accessors & Mutators
     */
    public function getFullDateTimeAttribute()
    {
        return Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->start_time);
    }

    public function getDurationInMinutesAttribute()
    {
        $start = Carbon::parse($this->start_time);
        $end = Carbon::parse($this->end_time);

        return $end->diffInMinutes($start);
    }

    /**
     * Métodos auxiliares
     */
    public function canBeCancelled(): bool
    {
        if ($this->status === 'cancelled' || $this->status === 'completed') {
            return false;
        }

        $tenant = $this->tenant;
        $cancellationHours = $tenant->policies['booking_cancellation_hours'] ?? 24;

        $bookingDateTime = $this->getFullDateTimeAttribute();

        return now()->diffInHours($bookingDateTime, false) >= $cancellationHours;
    }

    public function calculateRefund(): float
    {
        if (!$this->canBeCancelled()) {
            return 0;
        }

        $tenant = $this->tenant;
        $refundPercentage = $tenant->policies['refund_percentage'] ?? 100;

        return ($this->final_amount * $refundPercentage) / 100;
    }
}
