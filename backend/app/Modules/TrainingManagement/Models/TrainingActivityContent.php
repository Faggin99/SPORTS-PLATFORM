<?php

namespace App\Modules\TrainingManagement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class TrainingActivityContent extends Model
{
    use HasUlids;

    protected $table = 'training_activity_contents';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'activity_id',
        'content_id'
    ];

    // Relacionamentos
    public function activity()
    {
        return $this->belongsTo(TrainingActivity::class, 'activity_id');
    }

    public function content()
    {
        return $this->belongsTo(Content::class, 'content_id');
    }
}
