<?php

namespace App\Modules\TrainingManagement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\TrainingManagement\Models\TrainingSession;
use App\Modules\TrainingManagement\Models\TrainingActivity;
use App\Modules\TrainingManagement\Models\Content;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatsController extends Controller
{
    /**
     * Get training statistics for a given period
     */
    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $period = $request->input('period', 'month');

        // Calculate date range based on period
        $endDate = Carbon::now();
        $startDate = match($period) {
            'week' => Carbon::now()->subWeek(),
            'month' => Carbon::now()->subMonth(),
            '3months' => Carbon::now()->subMonths(3),
            'custom' => Carbon::parse($request->input('start_date', Carbon::now()->subMonth())),
            default => Carbon::now()->subMonth(),
        };

        if ($period === 'custom' && $request->has('end_date')) {
            $endDate = Carbon::parse($request->input('end_date'));
        }

        // Get all sessions in the period with their activities
        $sessions = TrainingSession::where('tenant_id', $tenantId)
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['blocks.activity.title', 'blocks.activity.contents', 'blocks.activity.stages'])
            ->get();

        // Calculate basic stats
        $totalSessions = $sessions->count();
        $totalMinutes = 0;
        $sessionsWithActivities = 0;

        // Content distribution - count by day
        $contentDayCounts = [];
        $titleCounts = [];
        $groupMinutes = ['G1' => 0, 'G2' => 0, 'G3' => 0, 'Transição' => 0, 'DM' => 0];
        $dayMinutes = [
            'Segunda' => 0,
            'Terça' => 0,
            'Quarta' => 0,
            'Quinta' => 0,
            'Sexta' => 0,
            'Sábado' => 0,
            'Domingo' => 0,
        ];

        // Main content IDs (6 principais)
        $mainContentAbbrs = ['OOF', 'ODF', 'TOF', 'TDF', 'BPOF', 'BPDF'];

        foreach ($sessions as $session) {
            $sessionHasActivity = false;
            $sessionTotalMinutes = 0;
            $sessionContents = []; // Track which contents appeared in this session (day)

            foreach ($session->blocks as $block) {
                $activity = $block->activity;
                if (!$activity) continue;

                $sessionHasActivity = true;
                $duration = $activity->duration_minutes ?? 0;
                $sessionTotalMinutes += $duration;
                $totalMinutes += $duration;

                // Collect contents for this session
                if ($activity->contents) {
                    foreach ($activity->contents as $content) {
                        $abbr = $content->abbreviation ?? substr($content->name, 0, 2);

                        // Ignore "Físico"
                        if (strtolower($content->name) === 'físico') {
                            continue;
                        }

                        // If "Todos", count 1 for each of the 6 main contents
                        if (strtolower($content->name) === 'todos') {
                            foreach ($mainContentAbbrs as $mainAbbr) {
                                $sessionContents[$mainAbbr] = true;
                            }
                        } else {
                            // Regular content
                            $sessionContents[$abbr] = true;
                        }
                    }
                }

                // Count titles (ignore if activity has "Físico" content)
                if ($activity->title) {
                    $hasFisico = false;
                    if ($activity->contents) {
                        foreach ($activity->contents as $content) {
                            if (strtolower($content->name) === 'físico') {
                                $hasFisico = true;
                                break;
                            }
                        }
                    }

                    // Only count if it doesn't have "Físico" content
                    if (!$hasFisico) {
                        $titleKey = $activity->title->title;
                        if (!isset($titleCounts[$titleKey])) {
                            $titleCounts[$titleKey] = 0;
                        }
                        $titleCounts[$titleKey]++;
                    }
                }

                // Count groups
                if ($activity->groups && is_array($activity->groups)) {
                    foreach ($activity->groups as $group) {
                        if (isset($groupMinutes[$group])) {
                            $groupMinutes[$group] += $duration;
                        }
                    }
                }
            }

            if ($sessionHasActivity) {
                $sessionsWithActivities++;
                // Add to day totals
                if (isset($dayMinutes[$session->day_name])) {
                    $dayMinutes[$session->day_name] += $sessionTotalMinutes;
                }

                // Aggregate session's unique contents into day counts
                foreach ($sessionContents as $abbr => $exists) {
                    if (!isset($contentDayCounts[$abbr])) {
                        $contentDayCounts[$abbr] = 0;
                    }
                    $contentDayCounts[$abbr]++;
                }
            }
        }

        // Calculate averages
        $avgMinutesPerSession = $sessionsWithActivities > 0
            ? round($totalMinutes / $sessionsWithActivities)
            : 0;

        // Calculate utilization rate (sessions with activities / total sessions)
        $utilizationRate = $totalSessions > 0
            ? round(($sessionsWithActivities / $totalSessions) * 100, 1)
            : 0;

        // Sort and get top 5 titles
        arsort($titleCounts);
        $topTitles = [];
        $count = 0;
        foreach ($titleCounts as $title => $uses) {
            if ($count >= 5) break;
            $topTitles[] = [
                'title' => $title,
                'count' => $uses,
            ];
            $count++;
        }

        // Format content distribution with colors
        $contentColors = [
            'OOF' => '#3b82f6',
            'ODF' => '#ef4444',
            'TOF' => '#10b981',
            'TDF' => '#f59e0b',
            'BPOF' => '#8b5cf6',
            'BPDF' => '#ec4899',
        ];

        $contentNames = [
            'OOF' => 'Org. Ofensiva',
            'ODF' => 'Org. Defensiva',
            'TOF' => 'Trans. Ofensiva',
            'TDF' => 'Trans. Defensiva',
            'BPOF' => 'Bola Parada Of.',
            'BPDF' => 'Bola Parada Def.',
        ];

        $contentDistribution = [];
        foreach ($mainContentAbbrs as $abbr) {
            $count = $contentDayCounts[$abbr] ?? 0;
            $contentDistribution[] = [
                'name' => $contentNames[$abbr] ?? $abbr,
                'abbr' => $abbr,
                'value' => $count,
                'color' => $contentColors[$abbr] ?? '#6b7280',
            ];
        }

        // Format duration by day
        $durationByDay = [];
        foreach ($dayMinutes as $day => $minutes) {
            $durationByDay[] = [
                'day' => $day,
                'minutes' => $minutes,
            ];
        }

        // Format group distribution
        $groupDistribution = [];
        $groupNames = [
            'G1' => 'Grupo 1',
            'G2' => 'Grupo 2',
            'G3' => 'Grupo 3',
            'Transição' => 'Transição',
            'DM' => 'DM',
        ];

        foreach ($groupMinutes as $group => $minutes) {
            $groupDistribution[] = [
                'group' => $groupNames[$group] ?? $group,
                'minutes' => $minutes,
            ];
        }

        return response()->json([
            'totalSessions' => $sessionsWithActivities,
            'totalMinutes' => $totalMinutes,
            'avgMinutesPerSession' => $avgMinutesPerSession,
            'utilizationRate' => $utilizationRate,
            'contentDistribution' => $contentDistribution,
            'durationByDay' => $durationByDay,
            'topTitles' => $topTitles,
            'groupDistribution' => $groupDistribution,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }
}
