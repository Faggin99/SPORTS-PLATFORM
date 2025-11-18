<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class ActivityTitle extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'title',
        'content_id',
        'description',
        'tenant_id'
    ];

    // Relacionamentos
    public function content()
    {
        return $this->belongsTo(Content::class, 'content_id');
    }

    public function activities()
    {
        return $this->hasMany(TrainingActivity::class, 'title_id');
    }
}
