# 🏗️ Arquitetura da Sports Platform

## 📐 Visão Geral da Arquitetura

A Sports Platform é uma aplicação SaaS multi-tenant modular, construída com separação clara entre **Core** (funcionalidades compartilhadas) e **Módulos** (funcionalidades específicas).

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │   Core    │  │  Sports      │  │  Training          │   │
│  │Components │  │  Arena       │  │  Management        │   │
│  └───────────┘  └──────────────┘  └────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
┌───────────────────────────▼─────────────────────────────────┐
│                      BACKEND (Laravel)                       │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │   Core    │  │  Sports      │  │  Training          │   │
│  │ Services  │  │  Arena       │  │  Management        │   │
│  └───────────┘  └──────────────┘  └────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    INFRASTRUCTURE                            │
│  ┌──────────┐  ┌──────┐  ┌────────┐  ┌─────────────────┐   │
│  │PostgreSQL│  │ Redis│  │MailHog │  │  File Storage   │   │
│  └──────────┘  └──────┘  └────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Princípios Arquiteturais

### 1. Separation of Concerns
- **Core**: Funcionalidades compartilhadas entre todos os módulos
- **Modules**: Funcionalidades específicas de domínio
- **Shared**: Utilitários e helpers reutilizáveis

### 2. Multi-Tenancy First
- Isolamento completo de dados por tenant
- Identificação por subdomínio
- Personalização por tenant (tema, logo, políticas)

### 3. Modularidade
- Módulos independentes e desacoplados
- Possibilidade de ativar/desativar módulos
- Facilidade para adicionar novos módulos

### 4. API-First
- Backend como API REST
- Frontend consome API de forma independente
- Possibilidade de múltiplos clientes (web, mobile)

## 🏛️ Camadas da Aplicação

### Backend (Laravel)

#### Camada 1: Core
Funcionalidades compartilhadas entre todos os módulos.

```
app/Core/
├── Auth/           → Autenticação e autorização
├── MultiTenant/    → Sistema multi-tenant
├── Payments/       → Processamento de pagamentos
├── Media/          → Upload e gestão de mídias
├── Notifications/  → Sistema de notificações
└── Models/         → Models compartilhados
```

**Responsabilidades:**
- Autenticação (Sanctum)
- Autorização (Spatie Permission)
- Identificação de tenant
- Processamento de pagamentos
- Upload de arquivos
- Notificações (email, SMS, push)

#### Camada 2: Modules
Funcionalidades específicas de cada domínio.

```
app/Modules/
├── SportsArena/
│   ├── Controllers/  → Lógica de request/response
│   ├── Models/       → Entidades do domínio
│   ├── Services/     → Lógica de negócio
│   ├── Requests/     → Validação de requests
│   ├── Resources/    → Transformação de responses
│   └── routes.php    → Rotas do módulo
│
└── TrainingManagement/
    └── (mesma estrutura)
```

**Características:**
- Independentes entre si
- Carregados dinamicamente via `ModuleServiceProvider`
- Rotas prefixadas automaticamente (`/api/sports-arena`, `/api/training-management`)

#### Camada 3: Shared
Utilitários e helpers compartilhados.

```
app/Shared/
├── Helpers/
│   ├── DateHelper.php
│   ├── MoneyHelper.php
│   └── StringHelper.php
└── Traits/
    ├── HasUuid.php
    ├── Searchable.php
    └── Auditable.php
```

### Frontend (React)

#### Camada 1: Core
Componentes e funcionalidades base.

```
src/core/
├── components/
│   ├── common/      → Componentes reutilizáveis
│   └── layout/      → Layout da aplicação
├── contexts/        → Estado global (Auth, Tenant, Theme)
├── hooks/           → Custom hooks
├── services/        → Comunicação com API
└── utils/           → Utilitários
```

#### Camada 2: Modules
Funcionalidades específicas de cada módulo.

```
src/modules/
├── sports-arena/
│   ├── components/  → Componentes específicos
│   ├── pages/       → Páginas do módulo
│   ├── services/    → API calls específicos
│   ├── hooks/       → Hooks específicos
│   └── routes.jsx   → Rotas do módulo
│
└── training-management/
    └── (mesma estrutura)
```

## 🔐 Sistema Multi-Tenancy

### Fluxo de Identificação

```
1. Request chega: arena1.localhost:5173
                    │
2. IdentifyTenant Middleware extrai subdomain: "arena1"
                    │
3. TenantService busca tenant no banco (com cache)
                    │
4. Tenant setado no container: app('tenant')
                    │
5. Config global setada: config('app.tenant_id')
                    │
6. Todos os models com BelongsToTenant aplicam scope automático
```

### BelongsToTenant Trait

```php
trait BelongsToTenant {
    // Boot automático
    protected static function bootBelongsToTenant() {
        // 1. Ao criar: adiciona tenant_id
        static::creating(function ($model) {
            $model->tenant_id = config('app.tenant_id');
        });

        // 2. Em queries: filtra por tenant_id
        static::addGlobalScope('tenant', function ($builder) {
            $builder->where('tenant_id', config('app.tenant_id'));
        });
    }
}
```

**Vantagens:**
- Isolamento automático de dados
- Sem necessidade de lembrar de filtrar por tenant
- Proteção contra vazamento de dados entre tenants

## 📊 Fluxo de Dados

### Request Completo (Exemplo: Criar Reserva)

```
┌──────────┐
│  CLIENT  │
└────┬─────┘
     │ POST /api/sports-arena/bookings
     │ { court_id: 1, date: "2025-10-28", ... }
     ▼
┌──────────────────────┐
│   FRONTEND (React)   │
│  bookingService.js   │
└────┬─────────────────┘
     │ axios.post()
     │ + Headers: Authorization, X-Tenant-ID
     ▼
┌──────────────────────┐
│  BACKEND (Laravel)   │
│                      │
│  1. Middlewares:     │
│     - API            │
│     - IdentifyTenant │ ← Seta tenant no contexto
│     - Auth:Sanctum   │ ← Valida token
│                      │
│  2. Routes:          │
│     Module routes    │
│                      │
│  3. Controller:      │
│     BookingController│
│     store()          │
│        │             │
│        ▼             │
│  4. Request:         │
│     StoreBooking     │
│     Request          │ ← Valida dados
│        │             │
│        ▼             │
│  5. Service:         │
│     BookingService   │ ← Lógica de negócio
│     createBooking()  │
│        │             │
│        ▼             │
│  6. Model:           │
│     Booking::create()│ ← tenant_id adicionado automaticamente
│        │             │
│        ▼             │
│  7. Resource:        │
│     BookingResource  │ ← Transforma response
│        │             │
└────────┼─────────────┘
         │ JSON Response
         ▼
┌──────────────────────┐
│   FRONTEND (React)   │
│  Atualiza estado     │
└──────────────────────┘
```

## 🗄️ Modelo de Dados

### Relacionamentos Principais

```
Tenant (1) ──────────── (N) Users
   │                         │
   │                         │
   ├─── (N) Resources        │
   │        │                │
   │        └─── (N) Bookings ─── (1) User
   │                  │
   │                  └─── (1) Transaction
   │
   ├─── (N) Plans
   │        │
   │        └─── (N) Subscriptions ─── (1) User
   │
   ├─── (N) Events
   │        │
   │        └─── (1) Tournament
   │                  │
   │                  ├─── (N) TournamentCategories
   │                  ├─── (N) TournamentRegistrations
   │                  └─── (N) Matches
   │
   └─── (N) Athletes
            │
            ├─── (N) AthleteEvaluations
            ├─── (N) TrainingSessions
            └─── (N) TrainingVideos
```

## 🔌 APIs e Integrações

### API REST Padrões

Todos os endpoints seguem o padrão REST:

```
GET    /api/{module}/{resource}           → Index (listar)
POST   /api/{module}/{resource}           → Store (criar)
GET    /api/{module}/{resource}/{id}      → Show (visualizar)
PUT    /api/{module}/{resource}/{id}      → Update (atualizar)
DELETE /api/{module}/{resource}/{id}      → Destroy (deletar)
```

### Exemplo - Sports Arena

```
GET    /api/sports-arena/courts
POST   /api/sports-arena/courts
GET    /api/sports-arena/courts/1
PUT    /api/sports-arena/courts/1
DELETE /api/sports-arena/courts/1
GET    /api/sports-arena/courts/1/availability
```

### Autenticação

**Sanctum** com tokens Bearer:

```
Authorization: Bearer {token}
```

### Respostas Padronizadas

#### Sucesso (200-299)
```json
{
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

#### Erro (400-599)
```json
{
  "message": "Erro descritivo",
  "errors": {
    "campo": ["mensagem de erro"]
  }
}
```

## 🚀 Escalabilidade

### Estratégias Implementadas

1. **Cache (Redis)**
   - Cache de tenants (3600s)
   - Cache de queries frequentes
   - Session storage

2. **Database Indexing**
   - Índices em `tenant_id` (todas as tabelas)
   - Índices em foreign keys
   - Índices em campos de busca frequente

3. **Eager Loading**
   - Evita N+1 queries
   - `with()` em relacionamentos comuns

4. **API Resources**
   - Transformação eficiente de responses
   - Controle de dados expostos

### Escalabilidade Futura

1. **Horizontal Scaling**
   - Stateless backend (ready for load balancer)
   - Redis para sessões compartilhadas

2. **Database Sharding**
   - Possibilidade de separar tenants por databases
   - Multi-database connection support

3. **CDN**
   - Assets estáticos
   - Uploads de mídia (S3 + CloudFront)

4. **Microservices**
   - Módulos podem ser separados em microservices
   - Comunicação via API REST ou eventos

## 🧪 Testes

### Estrutura de Testes

```
backend/tests/
├── Unit/           → Testes unitários (Models, Services)
├── Feature/        → Testes de integração (Controllers, API)
└── Integration/    → Testes de integração completa
```

### Estratégia de Testes

1. **Unit Tests**: Lógica de negócio isolada
2. **Feature Tests**: Endpoints da API
3. **Integration Tests**: Fluxos completos

## 📦 Deploy

### Ambientes

```
Development  → localhost (Docker)
Staging      → staging.plataforma.com
Production   → *.plataforma.com (multi-tenant)
```

### Checklist de Deploy

- [ ] Migrations executadas
- [ ] Cache limpo
- [ ] Config cached (`php artisan config:cache`)
- [ ] Routes cached (`php artisan route:cache`)
- [ ] Frontend build (`npm run build`)
- [ ] Assets publicados
- [ ] Backups configurados
- [ ] Monitoramento ativo

## 🔧 Manutenção

### Adicionando Novo Módulo

1. Criar estrutura de pastas
2. Criar Models, Controllers, Services
3. Criar arquivo `routes.php`
4. Registrar em `ModuleServiceProvider`
5. Criar migrations
6. Criar frontend (components, pages, services)
7. Registrar rotas no frontend

### Adicionando Nova Funcionalidade ao Core

1. Criar Service correspondente
2. Criar Models se necessário
3. Criar migrations
4. Atualizar documentação

---

**Mantido por**: Equipe de Desenvolvimento
**Última atualização**: Outubro 2025
