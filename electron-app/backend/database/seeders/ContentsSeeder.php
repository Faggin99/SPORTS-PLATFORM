<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\TrainingManagement\Models\Content;
use App\Core\Models\Tenant;

class ContentsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Contents are global system data, not tenant-specific
        $contents = [
            ['name' => 'Bola Parada Ofensiva', 'abbreviation' => 'BPO', 'description' => 'Situações de bola parada ofensiva'],
            ['name' => 'Bola Parada Defensiva', 'abbreviation' => 'BPD', 'description' => 'Situações de bola parada defensiva'],
            ['name' => 'Transição Ofensiva', 'abbreviation' => 'TO', 'description' => 'Transição do estado defensivo para ofensivo'],
            ['name' => 'Transição Defensiva', 'abbreviation' => 'TD', 'description' => 'Transição do estado ofensivo para defensivo'],
            ['name' => 'Organização Ofensiva', 'abbreviation' => 'OO', 'description' => 'Organização do jogo ofensivo'],
            ['name' => 'Organização Defensiva', 'abbreviation' => 'OD', 'description' => 'Organização do jogo defensivo'],
            ['name' => 'Físico', 'abbreviation' => 'FIS', 'description' => 'Preparação física e condicionamento'],
            ['name' => 'Todos', 'abbreviation' => 'TOD', 'description' => 'Conteúdo que engloba todos os aspectos do jogo'],
        ];

        foreach ($contents as $contentData) {
            Content::firstOrCreate(
                ['name' => $contentData['name']],
                [
                    'abbreviation' => $contentData['abbreviation'],
                    'description' => $contentData['description'],
                ]
            );
        }

        $this->command->info('Conteúdos de treinamento criados com sucesso!');
    }
}
