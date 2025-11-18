<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Modules\TrainingManagement\Models\Content;
use Illuminate\Support\Facades\DB;

class ContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contents = [
            [
                'name' => 'Organização Ofensiva',
                'description' => 'Conteúdos relacionados à organização ofensiva da equipe',
                'color' => '#4CAF50',
            ],
            [
                'name' => 'Organização Defensiva',
                'description' => 'Conteúdos relacionados à organização defensiva da equipe',
                'color' => '#2196F3',
            ],
            [
                'name' => 'Transição Ofensiva',
                'description' => 'Conteúdos relacionados à transição defesa-ataque',
                'color' => '#FF9800',
            ],
            [
                'name' => 'Transição Defensiva',
                'description' => 'Conteúdos relacionados à transição ataque-defesa',
                'color' => '#F44336',
            ],
            [
                'name' => 'Bola Parada Ofensiva',
                'description' => 'Conteúdos relacionados a bolas paradas ofensivas',
                'color' => '#9C27B0',
            ],
            [
                'name' => 'Bola Parada Defensiva',
                'description' => 'Conteúdos relacionados a bolas paradas defensivas',
                'color' => '#607D8B',
            ],
            [
                'name' => 'Descanso',
                'description' => 'Período de descanso ou recuperação',
                'color' => '#9E9E9E',
            ],
        ];

        foreach ($contents as $content) {
            // Use updateOrCreate to make seeder idempotent
            Content::updateOrCreate(
                ['name' => $content['name']],
                $content
            );
        }

        $this->command->info('✅ ' . count($contents) . ' conteúdos criados/atualizados com sucesso!');
    }
}
