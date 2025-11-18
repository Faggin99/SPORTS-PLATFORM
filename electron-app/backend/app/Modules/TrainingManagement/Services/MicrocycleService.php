<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Services;

use App\Modules\TrainingManagement\Models\TrainingMicrocycle;
use App\Modules\TrainingManagement\Models\TrainingSession;
use App\Modules\TrainingManagement\Models\TrainingActivityBlock;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * MicrocycleService
 *
 * Handles automatic creation of weekly microcycles with 7 sessions and 42 blocks.
 * Provides business logic for microcycle management and structure generation.
 */
class MicrocycleService
{
    /**
     * Block names for each training session (6 blocks per session)
     */
    private const BLOCK_NAMES = [
        'Aquecimento',
        'Preparatório',
        'Atividade 1',
        'Atividade 2',
        'Atividade 3',
        'Complementos',
    ];

    /**
     * Day names for each session in the week
     */
    private const DAY_NAMES = [
        'Segunda',
        'Terça',
        'Quarta',
        'Quinta',
        'Sexta',
        'Sábado',
        'Domingo',
    ];

    /**
     * Get or create microcycle for a specific ISO week
     *
     * Retrieves an existing microcycle for the given week identifier, or creates
     * a new one with complete structure (7 training sessions + 42 blocks).
     *
     * @param string $weekIdentifier ISO week format: "YYYY-WW" (e.g., "2025-15")
     * @return TrainingMicrocycle Microcycle with eager loaded sessions and blocks
     * @throws \InvalidArgumentException If week identifier format is invalid
     * @throws \Exception If microcycle creation fails
     */
    public function getOrCreateMicrocycle(string $weekIdentifier): TrainingMicrocycle
    {
        // Parse week identifier to extract year and week number
        $parts = explode('-', $weekIdentifier);
        if (count($parts) !== 2 || !is_numeric($parts[0]) || !is_numeric($parts[1])) {
            throw new \InvalidArgumentException("Invalid week identifier format. Expected 'YYYY-WW', got: {$weekIdentifier}");
        }

        $year = (int) $parts[0];
        $week = (int) $parts[1];

        // Validate week number
        if ($week < 1 || $week > 53) {
            throw new \InvalidArgumentException("Invalid week number. Must be between 1 and 53, got: {$week}");
        }

        // Calculate start and end dates for the ISO week
        $startDate = Carbon::now()->setISODate($year, $week, 1)->startOfDay();
        $endDate = Carbon::now()->setISODate($year, $week, 7)->endOfDay();

        // Get tenant ID from configuration
        $tenantId = config('app.tenant_id');

        // Check if microcycle already exists for this week and tenant
        $microcycle = TrainingMicrocycle::where('tenant_id', $tenantId)
            ->where('week_identifier', $weekIdentifier)
            ->first();

        // If microcycle exists, return it with relations (optimized single query)
        if ($microcycle) {
            return $microcycle->load([
                'sessions' => function ($query) {
                    $query->orderBy('day_of_week');
                },
                'sessions.blocks' => function ($query) {
                    $query->orderBy('order');
                },
                'sessions.blocks.activity',
                'sessions.blocks.activity.title',
                'sessions.blocks.activity.contents',
                'sessions.blocks.activity.stages',
            ]);
        }

        // Create new microcycle with complete structure in a transaction
        return DB::transaction(function () use ($weekIdentifier, $startDate, $endDate, $tenantId) {
            // Create the microcycle
            $microcycle = TrainingMicrocycle::create([
                'tenant_id' => $tenantId,
                'week_identifier' => $weekIdentifier,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'name' => "Microciclo Semana {$weekIdentifier}",
            ]);

            // Create 7 training sessions (one for each day of the week)
            foreach (self::DAY_NAMES as $dayIndex => $dayName) {
                $sessionDate = $startDate->copy()->addDays($dayIndex);

                // Create training session
                $session = TrainingSession::create([
                    'tenant_id' => $tenantId,
                    'microcycle_id' => $microcycle->id,
                    'day_of_week' => $dayIndex + 1, // 1-7 (Monday-Sunday)
                    'day_name' => $dayName,
                    'date' => $sessionDate,
                ]);

                // Create 6 activity blocks for this session
                foreach (self::BLOCK_NAMES as $blockIndex => $blockName) {
                    TrainingActivityBlock::create([
                        'tenant_id' => $tenantId,
                        'session_id' => $session->id,
                        'name' => $blockName,
                        'order' => $blockIndex + 1, // 1-6
                    ]);
                }
            }

            // Return microcycle with eager loaded relations (optimized)
            return $microcycle->load([
                'sessions' => function ($query) {
                    $query->orderBy('day_of_week');
                },
                'sessions.blocks' => function ($query) {
                    $query->orderBy('order');
                },
            ]);
        });
    }
}
