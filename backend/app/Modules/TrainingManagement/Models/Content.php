<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Content extends Model
{
    use HasUlids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name',
        'abbreviation',
        'description',
        'color'
    ];

    // Relacionamentos
    public function titles()
    {
        return $this->hasMany(ActivityTitle::class, 'content_id');
    }

    public function activities()
    {
        return $this->belongsToMany(TrainingActivity::class, 'training_activity_contents');
    }
}
