# 🚀 Guia de Início Rápido - Sports Platform

## Configuração Inicial Completa

### 1️⃣ Pré-requisitos

Certifique-se de ter instalado:
- ✅ Docker & Docker Compose
- ✅ Node.js 18+ e npm
- ✅ Composer (PHP)

### 2️⃣ Iniciar Serviços Docker

```bash
# Na raiz do projeto
docker-compose up -d
```

**Serviços disponíveis:**
- PostgreSQL: porta 5432
- Redis: porta 6379
- MailHog: http://localhost:8025

### 3️⃣ Configurar Backend (Laravel)

```bash
# Entre na pasta do backend
cd backend

# Instale as dependências
composer install

# Configure o ambiente
cp .env.example .env

# Gere a chave da aplicação
php artisan key:generate

# Execute as migrations
php artisan migrate

# (Opcional) Execute os seeders
php artisan db:seed

# Inicie o servidor
php artisan serve
```

**Backend rodando em:** http://localhost:8000

### 4️⃣ Configurar Frontend (React)

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

**Frontend rodando em:** http://localhost:5173

### 5️⃣ Configurar Multi-Tenancy Local

#### Windows

Edite o arquivo: `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1 arena1.localhost
127.0.0.1 clube2.localhost
127.0.0.1 teste.localhost
```

#### Linux/Mac

Edite o arquivo: `/etc/hosts`

```bash
sudo nano /etc/hosts
```

Adicione:
```
127.0.0.1 arena1.localhost
127.0.0.1 clube2.localhost
127.0.0.1 teste.localhost
```

### 6️⃣ Criar Primeiro Tenant

Use o Tinker ou crie um seeder:

```bash
cd backend
php artisan tinker
```

```php
use App\Core\MultiTenant\Services\TenantService;

$service = app(TenantService::class);

$tenant = $service->create([
    'name' => 'Arena Teste',
    'subdomain' => 'arena1',
    'theme_config' => [
        'primary_color' => '#3B82F6',
        'secondary_color' => '#10B981',
    ]
]);

echo "Tenant criado: {$tenant->name} ({$tenant->subdomain})";
```

### 7️⃣ Criar Primeiro Usuário

```php
use App\Core\Models\User;

$user = User::create([
    'tenant_id' => 1,
    'name' => 'Admin Teste',
    'email' => 'admin@arena1.com',
    'password' => bcrypt('password'),
    'role' => 'admin'
]);

echo "Usuário criado: {$user->email}";
```

### 8️⃣ Testar Acesso

1. Acesse: http://arena1.localhost:5173
2. Faça login com:
   - Email: `admin@arena1.com`
   - Senha: `password`

## ✅ Checklist de Verificação

- [ ] Docker containers rodando (`docker ps`)
- [ ] PostgreSQL acessível (porta 5432)
- [ ] Redis acessível (porta 6379)
- [ ] Backend Laravel servindo em http://localhost:8000
- [ ] Frontend React servindo em http://localhost:5173
- [ ] Migrations executadas
- [ ] Tenant criado
- [ ] Usuário admin criado
- [ ] Arquivo hosts configurado
- [ ] Login funcionando

## 🐛 Problemas Comuns

### Erro: "SQLSTATE[08006] Connection refused"

**Solução:** Verifique se o PostgreSQL está rodando:
```bash
docker ps | grep postgres
```

### Erro: "Class 'Predis\Client' not found"

**Solução:** Instale o Predis:
```bash
cd backend
composer require predis/predis
```

### Erro: "Tenant não identificado"

**Solução:** Verifique:
1. Arquivo hosts configurado corretamente
2. Acessando com subdomínio (ex: arena1.localhost)
3. Tenant existe no banco de dados

### Frontend não conecta com API

**Solução:** Verifique o arquivo `.env` do frontend:
```env
VITE_API_URL=http://localhost:8000/api
```

## 📚 Próximos Passos

1. **Explore a documentação**: Leia o [README.md](./README.md) completo
2. **Entenda a arquitetura**: Veja [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
3. **Configure módulos**: Ative os módulos que deseja usar
4. **Customize**: Personalize cores, logo e políticas do tenant
5. **Desenvolva**: Crie novos recursos seguindo a estrutura modular

## 💡 Comandos Úteis

### Backend

```bash
# Ver logs do Laravel
tail -f storage/logs/laravel.log

# Limpar cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Recriar banco de dados
php artisan migrate:fresh --seed

# Gerar migration
php artisan make:migration create_table_name

# Gerar model
php artisan make:model Core/Models/ModelName

# Gerar controller
php artisan make:controller Module/ControllerName
```

### Frontend

```bash
# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

### Docker

```bash
# Ver logs dos containers
docker-compose logs -f

# Parar containers
docker-compose down

# Reconstruir containers
docker-compose up -d --build

# Acessar PostgreSQL
docker exec -it sports-platform-db psql -U postgres -d sports_platform
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `backend/storage/logs/laravel.log`
2. Verifique o console do navegador (F12)
3. Abra uma issue no GitHub
4. Consulte a documentação completa

---

**Pronto para começar!** 🎉

Acesse http://arena1.localhost:5173 e comece a explorar a plataforma.
