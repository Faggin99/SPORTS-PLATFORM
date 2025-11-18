<?php

declare(strict_types=1);

namespace App\Modules\TrainingManagement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
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
            'block_id' => $this->block_id,
            'title_id' => $this->title_id,
            'title' => new TitleResource($this->whenLoaded('title')),
            'groups' => $this->groups,
            'duration_minutes' => $this->duration_minutes,
            'is_rest' => $this->is_rest,
            'contents' => ContentResource::collection($this->whenLoaded('contents')),
            'stages' => StageResource::collection($this->whenLoaded('stages')),
            'files' => FileResource::collection($this->whenLoaded('files')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
