<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'subdomain',
        'domain',
        'logo',
        'theme_config',
        'settings',
        'policies',
        'status',
    ];

    protected $casts = [
        'theme_config' => 'array',
        'settings' => 'array',
        'policies' => 'array',
    ];

    /**
     * Relacionamentos
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
