<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class TrainingActivity extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'block_id',
        'title_id',
        'description',
        'groups',
        'is_rest',
        'duration_minutes',
        'tenant_id'
    ];

    protected $casts = [
        'groups' => 'array',
        'is_rest' => 'boolean',
    ];

    // Relacionamentos
    public function block()
    {
        return $this->belongsTo(TrainingActivityBlock::class, 'block_id');
    }

    public function title()
    {
        return $this->belongsTo(ActivityTitle::class, 'title_id');
    }

    public function contents()
    {
        return $this->belongsToMany(
            Content::class,
            'training_activity_contents',
            'activity_id',
            'content_id'
        );
    }

    public function stages()
    {
        return $this->hasMany(TrainingActivityStage::class, 'activity_id')->orderBy('order');
    }

    public function files()
    {
        return $this->hasMany(TrainingActivityFile::class, 'activity_id');
    }
}
