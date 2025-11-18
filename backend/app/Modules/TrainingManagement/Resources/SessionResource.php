<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'microcycle_id' => $this->microcycle_id,
            'date' => $this->date->format('Y-m-d'),
            'day_name' => $this->day_name,
            'blocks' => BlockResource::collection($this->whenLoaded('blocks')),
            'files' => FileResource::collection($this->whenLoaded('files')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
