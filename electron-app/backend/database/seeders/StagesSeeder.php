<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\TrainingManagement\Models\Stage;
use App\Core\Models\Tenant;

class StagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing stages to rebuild with new structure
        Stage::truncate();

        // Stages organized by content type
        $stages = [
            // Organização Ofensiva
            ['name' => '1ª fase de construção', 'content_name' => 'Organização Ofensiva', 'description' => 'Primeira fase de construção', 'order' => 1],
            ['name' => '2ª fase de construção', 'content_name' => 'Organização Ofensiva', 'description' => 'Segunda fase de construção', 'order' => 2],
            ['name' => 'Criação', 'content_name' => 'Organização Ofensiva', 'description' => 'Fase de criação', 'order' => 3],
            ['name' => 'Finalização', 'content_name' => 'Organização Ofensiva', 'description' => 'Fase de finalização', 'order' => 4],

            // Organização Defensiva
            ['name' => 'Bloco alto', 'content_name' => 'Organização Defensiva', 'description' => 'Defesa em bloco alto', 'order' => 5],
            ['name' => 'Bloco médio', 'content_name' => 'Organização Defensiva', 'description' => 'Defesa em bloco médio', 'order' => 6],
            ['name' => 'Bloco baixo', 'content_name' => 'Organização Defensiva', 'description' => 'Defesa em bloco baixo', 'order' => 7],

            // Transição Ofensiva
            ['name' => 'Segurança', 'content_name' => 'Transição Ofensiva', 'description' => 'Segurança na transição ofensiva', 'order' => 8],
            ['name' => 'Gestão', 'content_name' => 'Transição Ofensiva', 'description' => 'Gestão da transição ofensiva', 'order' => 9],
            ['name' => 'Vertical', 'content_name' => 'Transição Ofensiva', 'description' => 'Verticalização na transição ofensiva', 'order' => 10],

            // Transição Defensiva
            ['name' => 'Pós perca', 'content_name' => 'Transição Defensiva', 'description' => 'Ação imediata após perda da bola', 'order' => 11],
            ['name' => 'Temporização', 'content_name' => 'Transição Defensiva', 'description' => 'Temporização na transição defensiva', 'order' => 12],

            // Bola Parada Ofensiva (mesmas etapas para BP Ofensiva e Defensiva)
            ['name' => 'Falta lateral', 'content_name' => 'Bola Parada Ofensiva', 'description' => 'Falta lateral ofensiva', 'order' => 13],
            ['name' => 'Falta frontal', 'content_name' => 'Bola Parada Ofensiva', 'description' => 'Falta frontal ofensiva', 'order' => 14],
            ['name' => 'Arremesso lateral', 'content_name' => 'Bola Parada Ofensiva', 'description' => 'Arremesso lateral ofensivo', 'order' => 15],
            ['name' => 'Pênalti', 'content_name' => 'Bola Parada Ofensiva', 'description' => 'Pênalti ofensivo', 'order' => 16],
            ['name' => 'Escanteio', 'content_name' => 'Bola Parada Ofensiva', 'description' => 'Escanteio ofensivo', 'order' => 17],

            // Bola Parada Defensiva (mesmas etapas)
            ['name' => 'Falta lateral', 'content_name' => 'Bola Parada Defensiva', 'description' => 'Falta lateral defensiva', 'order' => 18],
            ['name' => 'Falta frontal', 'content_name' => 'Bola Parada Defensiva', 'description' => 'Falta frontal defensiva', 'order' => 19],
            ['name' => 'Arremesso lateral', 'content_name' => 'Bola Parada Defensiva', 'description' => 'Arremesso lateral defensivo', 'order' => 20],
            ['name' => 'Pênalti', 'content_name' => 'Bola Parada Defensiva', 'description' => 'Pênalti defensivo', 'order' => 21],
            ['name' => 'Escanteio', 'content_name' => 'Bola Parada Defensiva', 'description' => 'Escanteio defensivo', 'order' => 22],
        ];

        foreach ($stages as $stageData) {
            Stage::create($stageData);
        }

        $this->command->info('Etapas de treinamento criadas com sucesso!');
    }
}
