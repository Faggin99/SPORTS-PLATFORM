<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Services;

use App\Modules\TrainingManagement\Models\TrainingSession;
use App\Modules\TrainingManagement\Models\TrainingActivityBlock;
use App\Modules\TrainingManagement\Models\TrainingActivity;
use Illuminate\Support\Facades\DB;

/**
 * SessionService
 *
 * Handles business logic for training sessions and their associated activity blocks.
 * Manages the relationship between sessions, blocks, activities, and content.
 */
class SessionService
{
    /**
     * Update all blocks for a training session
     *
     * Processes an array of block data and updates or creates the associated
     * training activities. Handles content relationships, stages, groups, and
     * rest periods.
     *
     * @param string $sessionId The UUID of the training session
     * @param array $blocksData Array of block data with structure:
     *   [
     *     'block_id' => string (UUID),
     *     'title_id' => string|null (UUID of content title),
     *     'content_ids' => array|null (UUIDs of content items),
     *     'groups' => string|null (JSON or string),
     *     'duration' => int|null (minutes),
     *     'stages' => array|null (array of stage data),
     *     'is_rest' => bool (if true, clears activity data)
     *   ]
     * @return TrainingSession Updated session with all relations loaded
     * @throws \Exception If session not found or update fails
     */
    public function updateSessionBlocks(string $sessionId, array $blocksData): TrainingSession
    {
        // Find the training session
        $session = TrainingSession::findOrFail($sessionId);
        $tenantId = config('app.tenant_id');

        return DB::transaction(function () use ($session, $blocksData, $tenantId) {
            // Loop through each block data and process it
            foreach ($blocksData as $blockData) {
                // Find the block
                $block = TrainingActivityBlock::where('id', $blockData['block_id'])
                    ->where('tenant_id', $tenantId)
                    ->where('session_id', $session->id)
                    ->firstOrFail();

                // Check if this is a rest block
                $isRest = $blockData['is_rest'] ?? false;

                if ($isRest) {
                    // For rest blocks, clear or delete the associated activity
                    if ($block->activity_id) {
                        $activity = TrainingActivity::find($block->activity_id);
                        if ($activity) {
                            // Clear many-to-many relationships
                            $activity->contents()->detach();
                            $activity->stages()->delete();

                            // Delete the activity
                            $activity->delete();
                        }

                        // Clear the activity_id from the block
                        $block->update(['activity_id' => null]);
                    }

                    continue; // Skip to next block
                }

                // Handle regular activity block
                if ($block->activity_id) {
                    // Update existing activity
                    $activity = TrainingActivity::findOrFail($block->activity_id);

                    $activity->update([
                        'title_id' => $blockData['title_id'] ?? null,
                        'groups' => $blockData['groups'] ?? null,
                        'duration' => $blockData['duration'] ?? null,
                    ]);
                } else {
                    // Create new activity
                    $activity = TrainingActivity::create([
                        'tenant_id' => $tenantId,
                        'title_id' => $blockData['title_id'] ?? null,
                        'groups' => $blockData['groups'] ?? null,
                        'duration' => $blockData['duration'] ?? null,
                    ]);

                    // Link activity to block
                    $block->update(['activity_id' => $activity->id]);
                }

                // Sync many-to-many content relationships
                if (isset($blockData['content_ids']) && is_array($blockData['content_ids'])) {
                    $activity->contents()->sync($blockData['content_ids']);
                } else {
                    // If no content_ids provided, detach all
                    $activity->contents()->detach();
                }

                // Handle stages (one-to-many relationship)
                if (isset($blockData['stages']) && is_array($blockData['stages'])) {
                    // Delete existing stages
                    $activity->stages()->delete();

                    // Create new stages
                    foreach ($blockData['stages'] as $stageData) {
                        $activity->stages()->create([
                            'tenant_id' => $tenantId,
                            'name' => $stageData['name'] ?? '',
                            'duration' => $stageData['duration'] ?? null,
                            'description' => $stageData['description'] ?? null,
                            'order' => $stageData['order'] ?? 0,
                        ]);
                    }
                } else {
                    // If no stages provided, delete all existing stages
                    $activity->stages()->delete();
                }
            }

            // Return the updated session with all relations eager loaded
            return $session->load([
                'blocks' => function ($query) {
                    $query->orderBy('order')->with([
                        'activity' => function ($activityQuery) {
                            $activityQuery->with([
                                'title.content',
                                'contents',
                                'stages' => function ($stageQuery) {
                                    $stageQuery->orderBy('order');
                                }
                            ]);
                        }
                    ]);
                }
            ]);
        });
    }
}
