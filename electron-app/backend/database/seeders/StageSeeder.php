<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\TrainingManagement\Models\Stage;

class StageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stages = [
            ['name' => '1ª Etapa de construção', 'description' => 'Primeira etapa de construção', 'order' => 1],
            ['name' => '2ª Etapa de construção', 'description' => 'Segunda etapa de construção', 'order' => 2],
            ['name' => 'Criação', 'description' => 'Etapa de criação', 'order' => 3],
            ['name' => 'Finalização', 'description' => 'Etapa de finalização', 'order' => 4],
        ];

        foreach ($stages as $stage) {
            Stage::updateOrCreate(
                ['name' => $stage['name']],
                $stage
            );
        }

        $this->command->info('✅ Etapas criadas/atualizadas com sucesso!');
    }
}
