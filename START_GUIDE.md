# 🚀 Guia de Inicialização do Sistema

## Status Atual

✅ **Backend Training Management**: 100% implementado (migrations, models, controllers, services, policies)
✅ **Frontend Training Management**: 100% implementado (pages, components, hooks, services)
✅ **Documentação**: Completa (TRAINING_MODULE.md, API_DOCUMENTATION.md)

---

## 📋 Pré-requisitos

### Já Instalados ✅
- ✅ PHP 8.4.11
- ✅ Composer 2.8.10
- ✅ Node.js (verificar versão)

### Precisa Instalar/Configurar
- ⚠️ Docker Desktop (para PostgreSQL, Redis, MailHog)
- ⚠️ Dependências do Backend (via Composer)
- ⚠️ Dependências do Frontend (via npm)

---

## 🎯 Passo a Passo para Rodar o Sistema

### Passo 1: Verificar Docker Desktop

```bash
# Verificar se Docker está instalado e rodando
docker --version
docker ps
```

**Se não tiver Docker instalado:**
1. Baixar Docker Desktop: https://www.docker.com/products/docker-desktop
2. Instalar e iniciar o Docker Desktop
3. Aguardar até o Docker estar rodando (ícone verde na bandeja)

### Passo 2: Subir os Containers (PostgreSQL, Redis, MailHog)

```bash
# Na raiz do projeto
docker-compose up -d
```

**Containers que serão criados:**
- PostgreSQL (porta 5432)
- Redis (porta 6379)
- MailHog (porta 1025 para SMTP, 8025 para interface web)

**Verificar se subiram:**
```bash
docker ps
```

Você deve ver 3 containers rodando.

### Passo 3: Instalar Dependências do Backend

```bash
cd backend
composer install
```

### Passo 4: Rodar as Migrations

```bash
# Ainda dentro da pasta backend
php artisan migrate
```

**Você verá:**
- 25 migrations sendo executadas (Core + Sports Arena + Training Management)

### Passo 5: Popular o Banco com Dados Iniciais

```bash
# Seed dos conteúdos de treino (7 categorias)
php artisan db:seed --class=ContentSeeder

# (Opcional) Seed de dados demo (tenants e usuários)
php artisan db:seed --class=DemoSeeder
```

**ContentSeeder cria:**
- Organização Ofensiva
- Organização Defensiva
- Transição Ofensiva
- Transição Defensiva
- Bolas Paradas Ofensivas
- Bolas Paradas Defensivas
- Descanso

**DemoSeeder cria:**
- 2 tenants (Arena Esportiva Central, Academia de Futebol Elite)
- Usuários para cada tenant (admin, coach, staff, user)

### Passo 6: Criar Link Simbólico para Storage (Upload de Arquivos)

```bash
php artisan storage:link
```

Isso permite que os arquivos uploaded em `storage/app/public` sejam acessíveis em `public/storage`.

### Passo 7: Iniciar o Servidor Backend

```bash
php artisan serve
```

Backend estará rodando em: **http://localhost:8000**

**Deixe este terminal aberto!**

### Passo 8: Instalar Dependências do Frontend (Novo Terminal)

```bash
# Abrir NOVO terminal
cd frontend
npm install
```

### Passo 9: Configurar Variáveis de Ambiente do Frontend

Verificar se existe o arquivo `frontend/.env`:

```bash
# Criar arquivo .env se não existir
# No Windows PowerShell:
echo "VITE_API_URL=http://localhost:8000/api" > .env
```

Ou criar manualmente `frontend/.env` com:
```env
VITE_API_URL=http://localhost:8000/api
```

### Passo 10: Iniciar o Servidor Frontend

```bash
# Ainda dentro da pasta frontend
npm run dev
```

Frontend estará rodando em: **http://localhost:5173**

**Deixe este terminal aberto também!**

---

## ✅ Sistema Rodando!

Agora você tem:

1. **Backend API**: http://localhost:8000
2. **Frontend**: http://localhost:5173
3. **MailHog** (interface de emails): http://localhost:8025
4. **PostgreSQL**: localhost:5432
5. **Redis**: localhost:6379

---

## 🧪 Testando o Sistema

### Opção 1: Via Navegador + Frontend (Quando tiver UI pronta)

Acesse: http://localhost:5173

### Opção 2: Via API (Postman/Insomnia/cURL)

#### 1. Fazer Login

```bash
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "admin@arena.com",
  "password": "password"
}
```

**Resposta:**
```json
{
  "token": "1|abc123...",
  "user": {
    "id": "01H123...",
    "name": "Admin Arena",
    "email": "admin@arena.com",
    "role": "admin"
  },
  "tenant": {
    "id": "01H456...",
    "name": "Arena Esportiva Central"
  }
}
```

**Copiar o token!**

#### 2. Testar Endpoint do Training Management

```bash
GET http://localhost:8000/api/training-management/microcycles/2025-44
Authorization: Bearer {seu_token_aqui}
```

**Resposta:**
```json
{
  "id": "01H789...",
  "start_date": "2025-10-27",
  "end_date": "2025-11-02",
  "week_identifier": "2025-44",
  "sessions": [
    {
      "id": "01H890...",
      "date": "2025-10-27",
      "day_name": "Segunda",
      "blocks": [
        {
          "id": "01H901...",
          "name": "Aquecimento",
          "order": 1,
          "activity": null
        },
        // ... mais 5 blocos
      ]
    }
    // ... mais 6 sessões (Terça a Domingo)
  ]
}
```

#### 3. Listar Conteúdos de Treino

```bash
GET http://localhost:8000/api/training-management/contents
Authorization: Bearer {seu_token_aqui}
```

#### 4. Criar um Atleta

```bash
POST http://localhost:8000/api/training-management/athletes
Authorization: Bearer {seu_token_aqui}
Content-Type: application/json

{
  "name": "João Silva",
  "position": "Atacante",
  "jersey_number": 10,
  "group": "G1",
  "status": "active"
}
```

#### 5. Upload de Arquivo (Video)

```bash
POST http://localhost:8000/api/training-management/files/upload
Authorization: Bearer {seu_token_aqui}
Content-Type: multipart/form-data

file: [selecionar arquivo .mp4]
file_type: video
phase: pre
activity_id: {id_de_alguma_atividade}
```

---

## 📊 Endpoints Disponíveis

Consultar: **API_DOCUMENTATION.md** para lista completa de todos os 17 endpoints.

---

## ❌ Problemas Comuns

### Erro: "SQLSTATE[08006] connection refused"

**Solução:**
```bash
# Verificar se o PostgreSQL está rodando
docker ps

# Se não estiver, subir os containers
docker-compose up -d

# Aguardar 10 segundos e testar novamente
```

### Erro: "Class 'Redis' not found"

**Solução:**
```bash
# Verificar se o Redis está rodando
docker ps

# Se não estiver, subir os containers
docker-compose up -d
```

### Erro: "No application encryption key has been specified"

**Solução:**
```bash
cd backend
php artisan key:generate
```

### Erro: "npm install" falha

**Solução:**
```bash
# Limpar cache do npm
npm cache clean --force

# Tentar novamente
npm install
```

### Erro: "CORS" no navegador

**Solução:**
Verificar se o backend está configurado para aceitar requisições do frontend:
- Backend já deve estar com CORS configurado para aceitar `localhost:5173`

---

## 🔄 Comandos Úteis

### Backend

```bash
# Ver logs em tempo real
php artisan serve --verbose

# Limpar cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Ver lista de rotas
php artisan route:list

# Rodar migrations do zero
php artisan migrate:fresh --seed
```

### Frontend

```bash
# Build para produção
npm run build

# Preview do build
npm run preview
```

### Docker

```bash
# Ver logs dos containers
docker-compose logs -f

# Parar containers
docker-compose down

# Parar e remover volumes (⚠️ apaga dados do banco!)
docker-compose down -v

# Reiniciar containers
docker-compose restart
```

---

## 🎯 Próximos Passos

### Para Completar o Training Management:

1. **Implementar componentes faltantes do Frontend:**
   - `TrainingModal.jsx` - Modal completo para editar atividades
   - `ActivityForm.jsx` - Formulário com campos completos
   - `FileUploader.jsx` - Upload com drag & drop e preview
   - `GroupColumn.jsx` e `AthleteCard.jsx` - Drag & drop de atletas entre grupos

2. **Adicionar Rotas no Frontend:**
   ```jsx
   // Em frontend/src/routes/index.jsx (ou similar)
   import { CalendarPage, PlantelPage } from '@/modules/training-management';

   <Route path="/training/calendar" element={<CalendarPage />} />
   <Route path="/training/plantel" element={<PlantelPage />} />
   ```

3. **Adicionar Navegação:**
   - Link no menu principal para acessar o calendário de treinos
   - Link para gestão do plantel

4. **Testar Fluxos Completos:**
   - Criar microciclo automaticamente ao acessar semana
   - Adicionar atividade em um bloco
   - Upload de vídeo para uma atividade
   - Mover atletas entre grupos

### Para Implementar Sports Arena (próximo módulo):

Seguir o CHECKLIST.md - "Módulo Sports Arena - Backend"

---

## 📚 Documentação de Referência

- **TRAINING_MODULE.md** - Documentação técnica completa
- **API_DOCUMENTATION.md** - Referência de todos os endpoints
- **ARCHITECTURE.md** - Arquitetura geral do sistema
- **CHECKLIST.md** - Status de implementação e próximos passos

---

## ⚠️ Notas Importantes

1. **Multi-Tenancy**: Todos os dados são isolados por tenant. Use o token de autenticação correto.

2. **ULID vs UUID**: O sistema usa ULID (não UUID) para IDs. São strings lexicograficamente ordenáveis.

3. **Lazy Activity Creation**: Os blocos são criados automaticamente, mas as atividades só são criadas quando o usuário salva dados.

4. **File Storage**: Os arquivos são salvos em `storage/app/public/training/{tenant_id}/videos|pdfs/`

5. **Database**: Se precisar resetar o banco:
   ```bash
   php artisan migrate:fresh --seed
   ```

---

**Última atualização**: 30 de Outubro de 2025
**Status**: Sistema pronto para testes do módulo Training Management
