<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class TrainingActivityBlock extends Model
{
    use HasUlids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'session_id',
        'name',
        'order'
    ];

    // Relacionamentos
    public function session()
    {
        return $this->belongsTo(TrainingSession::class, 'session_id');
    }

    public function activity()
    {
        return $this->hasOne(TrainingActivity::class, 'block_id');
    }
}
