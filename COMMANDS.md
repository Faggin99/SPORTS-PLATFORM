# 🔧 Comandos Úteis - Sports Platform

## 📋 Índice
- [Backend (Laravel)](#backend-laravel)
- [Frontend (React)](#frontend-react)
- [Docker](#docker)
- [Git](#git)
- [Desenvolvimento](#desenvolvimento)

---

## Backend (Laravel)

### Inicialização

```bash
# Instalar dependências
composer install

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Executar migrations
php artisan migrate

# Popular banco de dados
php artisan db:seed
php artisan db:seed --class=DemoSeeder

# Iniciar servidor
php artisan serve
# Acesso: http://localhost:8000
```

### Migrations

```bash
# Criar migration
php artisan make:migration create_table_name

# Executar migrations
php artisan migrate

# Reverter última migration
php artisan migrate:rollback

# Reverter todas migrations
php artisan migrate:reset

# Resetar e re-executar
php artisan migrate:fresh

# Resetar e popular
php artisan migrate:fresh --seed
```

### Models

```bash
# Criar model
php artisan make:model Core/Models/ModelName

# Criar model com migration
php artisan make:model Core/Models/ModelName -m

# Criar model completo (migration, factory, seeder)
php artisan make:model Core/Models/ModelName -mfs
```

### Controllers

```bash
# Criar controller
php artisan make:controller Module/ControllerName

# Criar resource controller (CRUD completo)
php artisan make:controller Module/ControllerName --resource

# Criar API resource controller
php artisan make:controller Module/ControllerName --api
```

### Requests (Validação)

```bash
# Criar form request
php artisan make:request Module/StoreResourceRequest
```

### Resources (Transformers)

```bash
# Criar API resource
php artisan make:resource Module/ResourceNameResource
```

### Seeders

```bash
# Criar seeder
php artisan make:seeder TableNameSeeder

# Executar seeder específico
php artisan db:seed --class=TableNameSeeder
```

### Cache

```bash
# Limpar cache da aplicação
php artisan cache:clear

# Limpar cache de configuração
php artisan config:clear

# Limpar cache de rotas
php artisan route:clear

# Limpar cache de views
php artisan view:clear

# Limpar TODOS os caches
php artisan optimize:clear
```

### Otimização (Produção)

```bash
# Cache de configurações
php artisan config:cache

# Cache de rotas
php artisan route:cache

# Cache de views
php artisan view:cache

# Otimização completa
php artisan optimize
```

### Tinker (Console Interativo)

```bash
# Abrir Tinker
php artisan tinker

# Exemplos de uso dentro do Tinker:
User::all()
User::find(1)
User::create(['name' => 'Teste', ...])
```

### Logs

```bash
# Ver logs em tempo real (Windows - PowerShell)
Get-Content storage/logs/laravel.log -Wait

# Ver logs em tempo real (Linux/Mac)
tail -f storage/logs/laravel.log
```

---

## Frontend (React)

### Inicialização

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
# Acesso: http://localhost:5173
```

### Desenvolvimento

```bash
# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint

# Lint com fix automático
npm run lint -- --fix
```

### Componentes

```bash
# Estrutura para novo componente
# frontend/src/core/components/common/NomeComponente/
#   ├── NomeComponente.jsx
#   ├── NomeComponente.module.css
#   └── index.js
```

---

## Docker

### Gerenciamento de Containers

```bash
# Iniciar todos os containers
docker-compose up -d

# Ver status dos containers
docker ps

# Ver logs de todos os containers
docker-compose logs -f

# Ver logs de container específico
docker-compose logs -f postgres
docker-compose logs -f redis

# Parar containers
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Reconstruir containers
docker-compose up -d --build
```

### PostgreSQL

```bash
# Acessar PostgreSQL via CLI
docker exec -it sports-platform-db psql -U postgres -d sports_platform

# Comandos dentro do psql:
\dt                 # Listar tabelas
\d table_name       # Descrever tabela
SELECT * FROM users;  # Query
\q                  # Sair

# Backup do banco
docker exec sports-platform-db pg_dump -U postgres sports_platform > backup.sql

# Restore do banco
docker exec -i sports-platform-db psql -U postgres sports_platform < backup.sql
```

### Redis

```bash
# Acessar Redis CLI
docker exec -it sports-platform-redis redis-cli

# Comandos dentro do redis-cli:
KEYS *              # Listar todas as chaves
GET key_name        # Ver valor de uma chave
DEL key_name        # Deletar chave
FLUSHALL            # Limpar TUDO (cuidado!)
```

---

## Git

### Fluxo Básico

```bash
# Ver status
git status

# Adicionar arquivos
git add .
git add arquivo.txt

# Commit
git commit -m "feat: descrição da feature"

# Push
git push origin main

# Pull
git pull origin main
```

### Branches

```bash
# Criar nova branch
git checkout -b feature/nova-funcionalidade

# Trocar de branch
git checkout main

# Listar branches
git branch

# Deletar branch
git branch -d feature/nome-branch

# Merge branch
git checkout main
git merge feature/nova-funcionalidade
```

### Convenções de Commit

```bash
# feat: nova funcionalidade
git commit -m "feat: adicionar sistema de torneios"

# fix: correção de bug
git commit -m "fix: corrigir cálculo de reembolso"

# docs: documentação
git commit -m "docs: atualizar README com instruções"

# refactor: refatoração
git commit -m "refactor: melhorar service de pagamentos"

# test: testes
git commit -m "test: adicionar testes para BookingService"

# chore: tarefas gerais
git commit -m "chore: atualizar dependências"
```

---

## Desenvolvimento

### Criar Novo Tenant

```bash
# Via Tinker
php artisan tinker

# Dentro do Tinker:
use App\Core\MultiTenant\Services\TenantService;
$service = app(TenantService::class);
$tenant = $service->create([
    'name' => 'Minha Arena',
    'subdomain' => 'minha-arena',
]);
```

### Criar Novo Usuário

```bash
# Via Tinker
php artisan tinker

# Dentro do Tinker:
use App\Core\Models\User;
User::create([
    'tenant_id' => 1,
    'name' => 'Nome Usuário',
    'email' => 'email@example.com',
    'password' => bcrypt('senha123'),
    'role' => 'admin'
]);
```

### Teste de API

```bash
# Usando curl

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@arena1.com","password":"password"}'

# Request autenticado
curl -X GET http://localhost:8000/api/sports-arena/courts \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "X-Tenant-ID: 1"
```

### Configurar Hosts (Multi-Tenancy Local)

#### Windows
```powershell
# Abrir Notepad como Administrador
notepad C:\Windows\System32\drivers\etc\hosts

# Adicionar:
127.0.0.1 arena1.localhost
127.0.0.1 clube2.localhost
```

#### Linux/Mac
```bash
sudo nano /etc/hosts

# Adicionar:
127.0.0.1 arena1.localhost
127.0.0.1 clube2.localhost
```

### Reset Completo do Projeto

```bash
# Backend
cd backend
composer install
php artisan migrate:fresh --seed
php artisan cache:clear
php artisan config:clear

# Frontend
cd frontend
rm -rf node_modules
npm install

# Docker
docker-compose down -v
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Erro: "Class not found"
```bash
composer dump-autoload
php artisan optimize:clear
```

### Erro: "Connection refused" (PostgreSQL)
```bash
docker ps  # Verificar se container está rodando
docker-compose up -d postgres
```

### Erro: "CORS" no Frontend
```bash
# Verificar configuração em backend/config/cors.php
# Verificar se VITE_API_URL está correto no frontend/.env
```

### Erro: "Tenant não identificado"
```bash
# Verificar:
# 1. Arquivo hosts configurado
# 2. Acessando com subdomínio (ex: arena1.localhost)
# 3. Tenant existe no banco de dados
```

---

## 📚 Recursos Adicionais

### Artisan Úteis

```bash
# Listar todos os comandos
php artisan list

# Listar rotas
php artisan route:list

# Informações sobre rota específica
php artisan route:list --name=api.

# Criar symbolic link para storage
php artisan storage:link

# Executar queue worker
php artisan queue:work

# Limpar jobs failed
php artisan queue:flush
```

### Composer

```bash
# Atualizar dependências
composer update

# Adicionar pacote
composer require nome/pacote

# Adicionar pacote dev
composer require --dev nome/pacote

# Remover pacote
composer remove nome/pacote

# Verificar pacotes desatualizados
composer outdated
```

### NPM

```bash
# Atualizar dependências
npm update

# Adicionar pacote
npm install nome-pacote

# Adicionar pacote dev
npm install -D nome-pacote

# Remover pacote
npm uninstall nome-pacote

# Verificar pacotes desatualizados
npm outdated

# Auditar segurança
npm audit
npm audit fix
```

---

**Dica**: Adicione este arquivo aos seus favoritos para acesso rápido! 📌
