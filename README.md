# 🏗️ SPORTS PLATFORM - Plataforma SaaS Multi-Tenant

## 📋 Visão Geral

Plataforma **SaaS multi-tenant** modular para gestão de espaços esportivos e treinos. Sistema genérico que pode ser vendido para diferentes clientes (arenas, clubes, escolas de esporte) com personalização completa por tenant.

### Stack Tecnológico

- **Backend**: Laravel 11 + PHP 8.4
- **Frontend**: React 18 + Vite
- **Banco de Dados**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Email Testing**: MailHog
- **Containerização**: Docker Compose

## 🏛️ Arquitetura

### Multi-Tenancy

O sistema utiliza **identificação por subdomínio**:

```
arena1.plataforma.com → Tenant: Arena 1
clube2.plataforma.com → Tenant: Clube 2
```

#### Características:
- Isolamento de dados por `tenant_id`
- Personalização: logo, cores, políticas
- Global scope automático em todos os models
- Cache por tenant

### Estrutura Modular

```
┌─────────────────────────────────────────────────────┐
│              PLATAFORMA CORE (Base)                  │
│  Auth | Multi-Tenant | Payments | Media | Reports   │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼────────┐              ┌────────▼────────┐
│ SPORTS ARENA   │              │ TRAINING MGMT   │
│ (Módulo 1)     │              │ (Módulo 2)      │
└────────────────┘              └─────────────────┘
```

## 📦 Módulos

### MÓDULO 1 - SPORTS ARENA

Gestão completa de espaços esportivos:

- ✅ **Gestão de Quadras/Espaços**: CRUD, disponibilidade, preços
- ✅ **Sistema de Reservas**: Calendário, pagamentos (PIX, Cartão)
- ✅ **Planos e Assinaturas**: Mensal, Semestral, Anual
- ✅ **Sistema de Torneios**:
  - Múltiplos formatos (eliminatória, grupos, pontos corridos)
  - Chaveamento automático
  - Gestão de inscrições e pagamentos
  - Placares e classificação em tempo real
- ✅ **Controle de Bar**: Produtos, estoque, vendas
- ✅ **Eventos e Anúncios**
- ✅ **Controle Financeiro Completo**
- ✅ **Dashboards e Relatórios**

### MÓDULO 2 - TRAINING MANAGEMENT

Gestão profissional de treinos:

- ✅ **Biblioteca de Exercícios**: Vídeos, descrições, categorias
- ✅ **Planejamento de Treinos**: Templates, calendário, periodização
- ✅ **Execução de Treinos**: Checklist, cronômetro, presença
- ✅ **Histórico Completo**: Busca, filtros, comparações
- ✅ **Gestão de Atletas**: Perfis, avaliações, progressão
- ✅ **Biblioteca de Vídeos**: Organização, tags, busca
- ✅ **Analytics e Relatórios**
- ✅ **Comunicação com Atletas**

## 👥 Perfis de Usuário

| Perfil | Descrição | Permissões |
|--------|-----------|------------|
| **Super Admin** | Controle total | Múltiplas unidades, configurações globais |
| **Admin** | Gestão de unidade | CRUD recursos, usuários, relatórios |
| **User** | Cliente final | Reservas, torneios, planos |
| **Coach** | Treinador | Treinos, atletas, vídeos, analytics |

## 📁 Estrutura de Diretórios

### Backend

```
backend/
├── app/
│   ├── Core/                           # Funcionalidades compartilhadas
│   │   ├── Auth/                       # Autenticação
│   │   │   ├── Controllers/
│   │   │   ├── Services/
│   │   │   └── Requests/
│   │   ├── MultiTenant/                # Sistema multi-tenant
│   │   │   ├── Middleware/
│   │   │   │   └── IdentifyTenant.php
│   │   │   ├── Traits/
│   │   │   │   └── BelongsToTenant.php
│   │   │   ├── Services/
│   │   │   │   └── TenantService.php
│   │   │   └── Models/
│   │   │       └── Tenant.php
│   │   ├── Payments/                   # Pagamentos
│   │   │   ├── Services/
│   │   │   └── Gateways/
│   │   ├── Media/                      # Upload e processamento
│   │   │   └── Services/
│   │   ├── Notifications/              # Notificações
│   │   │   ├── Services/
│   │   │   └── Channels/
│   │   └── Models/                     # Models compartilhados
│   │       ├── User.php
│   │       ├── Tenant.php
│   │       ├── Resource.php
│   │       ├── Booking.php
│   │       ├── Plan.php
│   │       └── Transaction.php
│   │
│   ├── Modules/                        # Módulos da aplicação
│   │   ├── SportsArena/
│   │   │   ├── Controllers/
│   │   │   ├── Models/
│   │   │   ├── Services/
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── routes.php
│   │   └── TrainingManagement/
│   │       ├── Controllers/
│   │       ├── Models/
│   │       ├── Services/
│   │       ├── Requests/
│   │       ├── Resources/
│   │       └── routes.php
│   │
│   ├── Shared/                         # Utilities compartilhadas
│   │   ├── Helpers/
│   │   └── Traits/
│   │
│   └── Providers/
│       ├── ModuleServiceProvider.php
│       └── TenantServiceProvider.php
│
└── database/
    └── migrations/                     # 25 migrations
```

### Frontend

```
frontend/src/
├── core/                               # Core da aplicação
│   ├── components/
│   │   ├── common/                     # Componentes reutilizáveis
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Calendar/
│   │   │   └── ...
│   │   └── layout/                     # Layout
│   │       ├── Header/
│   │       ├── Sidebar/
│   │       └── Footer/
│   │
│   ├── contexts/                       # Estado global
│   │   ├── AuthContext.jsx
│   │   ├── TenantContext.jsx
│   │   └── ThemeContext.jsx
│   │
│   ├── hooks/                          # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useTenant.js
│   │   ├── useApi.js
│   │   └── ...
│   │
│   ├── services/                       # API calls
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── tenantService.js
│   │
│   ├── utils/                          # Utilitários
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── constants.js
│   │
│   └── pages/                          # Páginas públicas
│       ├── Landing/
│       ├── Auth/
│       └── NotFound.jsx
│
├── modules/                            # Módulos da aplicação
│   ├── sports-arena/
│   │   ├── components/
│   │   │   ├── quadras/
│   │   │   ├── torneios/
│   │   │   ├── bar/
│   │   │   └── dashboard/
│   │   ├── pages/
│   │   │   ├── user/
│   │   │   ├── admin/
│   │   │   └── superadmin/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── routes.jsx
│   │
│   └── training-management/
│       ├── components/
│       │   ├── exercises/
│       │   ├── sessions/
│       │   ├── athletes/
│       │   └── videos/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Planning/
│       │   ├── Execution/
│       │   ├── Athletes/
│       │   └── Analytics/
│       ├── services/
│       ├── hooks/
│       └── routes.jsx
│
└── routes/                             # Sistema de rotas
    ├── index.jsx
    ├── PrivateRoute.jsx
    └── PublicRoute.jsx
```

## 🗄️ Banco de Dados

### Migrations Principais

#### Core (8 migrations)
1. `create_tenants_table` - Tenants do sistema
2. `add_tenant_id_to_users_table` - Multi-tenancy em users
3. `create_resources_table` - Recursos genéricos (quadras, salas)
4. `create_bookings_table` - Reservas genéricas
5. `create_plans_table` - Planos de assinatura
6. `create_subscriptions_table` - Assinaturas dos usuários
7. `create_events_table` - Eventos genéricos
8. `create_transactions_table` - Transações financeiras

#### Sports Arena (9 migrations)
9. `create_courts_table` - Quadras (extends resources)
10. `create_tournaments_table` - Torneios
11. `create_tournament_categories_table` - Categorias de torneios
12. `create_tournament_registrations_table` - Inscrições
13. `create_matches_table` - Jogos dos torneios
14. `create_bar_products_table` - Produtos do bar
15. `create_bar_sales_table` - Vendas do bar
16. `create_stock_movements_table` - Movimentações de estoque

#### Training Management (9 migrations)
17. `create_exercises_table` - Biblioteca de exercícios
18. `create_training_sessions_table` - Sessões de treino
19. `create_training_exercises_table` - Pivot (treino ↔ exercício)
20. `create_athletes_table` - Atletas
21. `create_athlete_evaluations_table` - Avaliações de atletas
22. `create_athlete_attendance_table` - Presença nos treinos
23. `create_training_videos_table` - Vídeos de treinos
24. `create_training_templates_table` - Templates de treino
25. `create_athlete_groups_table` - Grupos de atletas

## 🚀 Como Usar

### Pré-requisitos

- Docker & Docker Compose
- Node.js 18+
- Composer

### Instalação

1. **Clone o repositório**
```bash
git clone <repo-url>
cd sports-platform
```

2. **Inicie os containers Docker**
```bash
docker-compose up -d
```

3. **Configure o Backend**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
```

4. **Configure o Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Acessos

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **MailHog**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔧 Configuração Multi-Tenant

### Criando um Tenant

```php
use App\Core\MultiTenant\Services\TenantService;

$tenantService = app(TenantService::class);

$tenant = $tenantService->create([
    'name' => 'Arena Copacabana',
    'subdomain' => 'arena1',
    'theme_config' => [
        'primary_color' => '#FF6B35',
        'secondary_color' => '#004E89',
    ],
    'policies' => [
        'booking_cancellation_hours' => 24,
        'refund_percentage' => 80,
    ],
]);
```

### Configurando Hosts Locais

Para testar multi-tenancy localmente, adicione ao arquivo `hosts`:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
**Linux/Mac**: `/etc/hosts`

```
127.0.0.1 arena1.localhost
127.0.0.1 clube2.localhost
```

Acesse: `http://arena1.localhost:5173`

## 📝 Desenvolvimento

### Adicionando um Novo Módulo

1. **Crie a estrutura do módulo**
```bash
mkdir -p backend/app/Modules/NovoModulo/{Controllers,Models,Services,Requests,Resources}
mkdir -p frontend/src/modules/novo-modulo/{components,pages,services,hooks}
```

2. **Registre em ModuleServiceProvider**
```php
protected $modules = [
    'SportsArena',
    'TrainingManagement',
    'NovoModulo', // Adicione aqui
];
```

3. **Crie o arquivo de rotas**
```php
// backend/app/Modules/NovoModulo/routes.php
Route::get('/exemplo', [ExemploController::class, 'index']);
```

### Criando um Model com Multi-Tenancy

```php
<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\MultiTenant\Traits\BelongsToTenant;

class MinhaEntidade extends Model
{
    use BelongsToTenant; // Adiciona scope automático por tenant

    protected $fillable = ['name', 'description'];

    // Relacionamentos, scopes, etc.
}
```

O trait `BelongsToTenant` automaticamente:
- Adiciona `tenant_id` ao criar registros
- Filtra queries por `tenant_id`
- Cria relacionamento com `Tenant`

## 🧪 Testes

```bash
# Backend
cd backend
php artisan test

# Frontend
cd frontend
npm run test
```

## 📚 Documentação Adicional

- [Documentação da API](./docs/API.md)
- [Guia de Contribuição](./docs/CONTRIBUTING.md)
- [Arquitetura Detalhada](./docs/ARCHITECTURE.md)
- [Guia de Deploy](./docs/DEPLOY.md)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autores

- **Seu Nome** - *Desenvolvimento Inicial*

## 🙏 Agradecimentos

- Laravel Framework
- React Team
- Comunidade Open Source

---

**Feito com ❤️ para a comunidade esportiva**
