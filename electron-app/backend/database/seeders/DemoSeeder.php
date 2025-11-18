<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Core\Models\Tenant;
use App\Core\Models\User;
use App\Core\MultiTenant\Services\TenantService;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    /**
     * Popula banco com dados de demonstração
     */
    public function run(): void
    {
        $this->command->info('🌱 Criando dados de demonstração...');

        // Cria Tenants
        $this->createTenants();

        // Cria Usuários
        $this->createUsers();

        $this->command->info('✅ Dados de demonstração criados com sucesso!');
    }

    /**
     * Cria tenants de exemplo
     */
    private function createTenants(): void
    {
        $this->command->info('📦 Criando tenants...');

        $tenantService = app(TenantService::class);

        // Tenant 1: Arena Copacabana
        $tenantService->create([
            'name' => 'Arena Copacabana',
            'subdomain' => 'arena1',
            'theme_config' => [
                'primary_color' => '#FF6B35',
                'secondary_color' => '#004E89',
                'accent_color' => '#F77F00',
                'background' => '#FFFFFF',
                'text' => '#1F2937',
            ],
            'settings' => [
                'timezone' => 'America/Sao_Paulo',
                'currency' => 'BRL',
                'language' => 'pt_BR',
            ],
            'policies' => [
                'booking_cancellation_hours' => 24,
                'refund_percentage' => 80,
                'booking_min_advance_hours' => 2,
            ],
        ]);

        // Tenant 2: Clube Barra
        $tenantService->create([
            'name' => 'Clube Barra',
            'subdomain' => 'clube2',
            'theme_config' => [
                'primary_color' => '#3B82F6',
                'secondary_color' => '#10B981',
                'accent_color' => '#8B5CF6',
                'background' => '#FFFFFF',
                'text' => '#1F2937',
            ],
            'settings' => [
                'timezone' => 'America/Sao_Paulo',
                'currency' => 'BRL',
                'language' => 'pt_BR',
            ],
            'policies' => [
                'booking_cancellation_hours' => 48,
                'refund_percentage' => 100,
                'booking_min_advance_hours' => 4,
            ],
        ]);

        $this->command->info('✅ 2 tenants criados');
    }

    /**
     * Cria usuários de exemplo
     */
    private function createUsers(): void
    {
        $this->command->info('👥 Criando usuários...');

        // Arena Copacabana - Users
        $admin1 = User::create([
            'tenant_id' => 1,
            'name' => 'Admin Arena',
            'email' => 'admin@arena1.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $user1 = User::create([
            'tenant_id' => 1,
            'name' => 'João Silva',
            'email' => 'joao@arena1.com',
            'password' => Hash::make('password'),
            'role' => 'user',
        ]);

        $coach1 = User::create([
            'tenant_id' => 1,
            'name' => 'Carlos Treinador',
            'email' => 'carlos@arena1.com',
            'password' => Hash::make('password'),
            'role' => 'coach',
        ]);

        // Clube Barra - Users
        $admin2 = User::create([
            'tenant_id' => 2,
            'name' => 'Admin Clube',
            'email' => 'admin@clube2.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $user2 = User::create([
            'tenant_id' => 2,
            'name' => 'Maria Santos',
            'email' => 'maria@clube2.com',
            'password' => Hash::make('password'),
            'role' => 'user',
        ]);

        $this->command->info('✅ 5 usuários criados');
        $this->command->newLine();
        $this->command->info('📧 Credenciais de acesso:');
        $this->command->info('   Arena 1 Admin: admin@arena1.com / password');
        $this->command->info('   Arena 1 User: joao@arena1.com / password');
        $this->command->info('   Arena 1 Coach: carlos@arena1.com / password');
        $this->command->info('   Clube 2 Admin: admin@clube2.com / password');
        $this->command->info('   Clube 2 User: maria@clube2.com / password');
    }
}
