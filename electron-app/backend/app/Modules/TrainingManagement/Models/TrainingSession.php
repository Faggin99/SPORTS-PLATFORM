<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class TrainingSession extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'microcycle_id',
        'date',
        'day_name',
        'day_of_week',
        'session_type',
        'opponent_name',
        'tenant_id'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    // Session type constants
    public const TYPE_TRAINING = 'training';
    public const TYPE_REST = 'rest';
    public const TYPE_MATCH = 'match';

    // Relacionamentos
    public function microcycle()
    {
        return $this->belongsTo(TrainingMicrocycle::class, 'microcycle_id');
    }

    public function blocks()
    {
        return $this->hasMany(TrainingActivityBlock::class, 'session_id')->orderBy('order');
    }

    public function files()
    {
        return $this->hasMany(SessionFile::class, 'session_id');
    }
}
