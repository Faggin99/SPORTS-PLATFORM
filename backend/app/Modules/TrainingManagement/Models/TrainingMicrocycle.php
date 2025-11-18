<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class TrainingMicrocycle extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'week_identifier',
        'name',
        'start_date',
        'end_date',
        'tenant_id'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    // Relacionamentos
    public function sessions()
    {
        return $this->hasMany(TrainingSession::class, 'microcycle_id');
    }
}
