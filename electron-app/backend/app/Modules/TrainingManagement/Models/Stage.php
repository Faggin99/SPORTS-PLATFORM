<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Stage extends Model
{
    use HasUlids;

    protected $table = 'stages';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name',
        'content_name',
        'description',
        'order'
    ];

    protected $casts = [
        'order' => 'integer',
    ];
}
