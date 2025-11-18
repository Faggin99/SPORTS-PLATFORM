<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;

/**
 * Transações financeiras
 */
class Transaction extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'type',
        'transactionable_type',
        'transactionable_id',
        'amount',
        'payment_method',
        'payment_id',
        'status',
        'description',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * Relacionamentos
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento polimórfico
     */
    public function transactionable()
    {
        return $this->morphTo();
    }

    /**
     * Scopes
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Accessors
     */
    public function getFormattedAmountAttribute(): string
    {
        return 'R$ ' . number_format($this->amount, 2, ',', '.');
    }
}
