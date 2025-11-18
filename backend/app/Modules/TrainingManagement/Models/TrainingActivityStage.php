<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class TrainingActivityStage extends Model
{
    use HasUlids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'activity_id',
        'stage_name',
        'order'
    ];

    // Relacionamentos
    public function activity()
    {
        return $this->belongsTo(TrainingActivity::class, 'activity_id');
    }
}
