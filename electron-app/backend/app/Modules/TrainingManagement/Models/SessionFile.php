<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class SessionFile extends Model
{
    use HasUlids, BelongsToTenant;

    protected $table = 'training_session_files';

    protected $fillable = [
        'tenant_id',
        'session_id',
        'file_name',
        'title',
        'file_path',
        'file_type',
        'file_size',
        'mime_type',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TrainingSession::class, 'session_id');
    }

    /**
     * Get the full URL for the file
     */
    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }
}
