<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class Athlete extends Model
{
    use HasUlids, BelongsToTenant;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name',
        'position',
        'jersey_number',
        'status',
        'observation',
        'group',
        'photo_url',
        'tenant_id'
    ];

    // Scopes
    public function scopeByGroup($query, $group)
    {
        return $query->where('group', $group);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
