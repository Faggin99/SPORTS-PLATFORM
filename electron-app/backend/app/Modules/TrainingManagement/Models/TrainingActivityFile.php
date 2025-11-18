<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class TrainingActivityFile extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'activity_id',
        'session_id',
        'file_path',
        'file_type',
        'phase',
        'original_name',
        'file_size',
        'mime_type',
        'created_by',
        'tenant_id'
    ];

    // Relacionamentos
    public function session()
    {
        return $this->belongsTo(TrainingSession::class, 'session_id');
    }

    public function activity()
    {
        return $this->belongsTo(TrainingActivity::class, 'activity_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Core\Models\User::class, 'created_by');
    }

    // Accessor para URL pública
    public function getUrlAttribute()
    {
        return asset('storage/' . $this->file_path);
    }
}
