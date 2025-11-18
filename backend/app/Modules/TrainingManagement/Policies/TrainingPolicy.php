<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Policies;

use App\Core\Models\User;

/**
 * Training Management Policy
 *
 * Handles authorization for training management features
 */
class TrainingPolicy
{
    /**
     * Determine if user can view training data
     */
    public function viewTraining(User $user): bool
    {
        // Coaches and admins can view training
        return in_array($user->role, ['admin', 'coach', 'staff']);
    }

    /**
     * Determine if user can manage training (create, update, delete)
     */
    public function manageTraining(User $user): bool
    {
        // Only coaches and admins can manage training
        return in_array($user->role, ['admin', 'coach']);
    }

    /**
     * Determine if user can upload files
     */
    public function uploadFiles(User $user): bool
    {
        // Coaches and admins can upload files
        return in_array($user->role, ['admin', 'coach']);
    }

    /**
     * Determine if user can manage athletes
     */
    public function manageAthletes(User $user): bool
    {
        // Only admins can manage athletes roster
        return $user->role === 'admin';
    }

    /**
     * Determine if user can view athletes
     */
    public function viewAthletes(User $user): bool
    {
        // Coaches, staff, and admins can view athletes
        return in_array($user->role, ['admin', 'coach', 'staff']);
    }
}
