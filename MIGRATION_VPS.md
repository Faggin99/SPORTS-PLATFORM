# Sports Platform - Plano de Migracaoo Supabase -> VPS Self-Hosted

## Visao Geral do Sistema

**Sports Platform** e uma plataforma web para treinadores de futebol/futsal gerenciarem:
- **Treinos** (microciclos semanais, sessoes diarias, atividades por bloco)
- **Jogos** (escalacao, eventos, gols, cartoes)
- **Plantel** (atletas, grupos, posicoes)
- **Clubes** (multi-clube por usuario)
- **Quadro Tatico** (animacoes de jogadas com exportacao de video)
- **Estatisticas** (graficos de treino e jogos)

### Arquitetura Atual
- **Frontend**: React 19 + Vite + Tailwind CSS (SPA)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (3 buckets: profile-photos, club-logos, session-files)
- **Desktop**: Electron (empacota o frontend)

### Arquitetura Nova (VPS)
- **Frontend**: React 19 (servido pelo Nginx como arquivos estaticos)
- **Backend API**: Node.js + Express (substituindo chamadas diretas ao Supabase)
- **Banco**: PostgreSQL 16 (self-hosted)
- **Auth**: JWT com bcrypt (substituindo Supabase Auth)
- **Storage**: Local filesystem + Nginx (substituindo Supabase Storage)
- **Proxy**: Nginx (SSL + static files + API proxy + file serving)
- **Process Manager**: PM2 (manter Node.js rodando)
- **SSL**: Let's Encrypt (Certbot)

---

## FASE 1 - Configurar VPS (Servidor Limpo)

### 1.1 Acesso e Atualizacao

```bash
# Conectar via SSH
ssh root@143.198.156.198

# Atualizar sistema
apt update && apt upgrade -y

# Criar usuario nao-root
adduser deploy
usermod -aG sudo deploy

# Configurar SSH key (opcional mas recomendado)
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
```

### 1.2 Instalar Dependencias

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Nginx
apt install -y nginx

# Certbot (SSL)
apt install -y certbot python3-certbot-nginx

# PM2
npm install -g pm2

# Ferramentas
apt install -y git curl unzip build-essential
```

### 1.3 Configurar PostgreSQL

```bash
# Acessar como postgres
sudo -u postgres psql

# Criar banco e usuario
CREATE USER sports_admin WITH PASSWORD 'SENHA_SEGURA_AQUI';
CREATE DATABASE sports_platform OWNER sports_admin;
GRANT ALL PRIVILEGES ON DATABASE sports_platform TO sports_admin;

# Habilitar extensoes necessarias
\c sports_platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\q
```

### 1.4 Configurar Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## FASE 2 - Backend API (Node.js + Express)

### 2.1 Estrutura do Backend

```
/home/deploy/sports-platform/
  backend/
    server.js                 # Entry point
    package.json
    .env
    src/
      config/
        database.js           # PostgreSQL connection pool
        auth.js               # JWT config
        storage.js            # File upload config
      middleware/
        auth.js               # JWT verification middleware
        tenant.js             # Tenant isolation middleware
        upload.js             # Multer file upload
      routes/
        auth.js               # Login, register, profile
        clubs.js              # CRUD clubes
        athletes.js           # CRUD atletas
        microcycles.js        # Microciclos + sessoes
        sessions.js           # Sessoes de treino
        activities.js         # Atividades
        games.js              # Jogos + eventos
        stats.js              # Estatisticas
        plays.js              # Jogadas taticas
        files.js              # Upload/download de arquivos
      services/
        authService.js
        clubService.js
        athleteService.js
        trainingService.js
        gameService.js
        statsService.js
        playService.js
        fileService.js
    migrations/
      001_create_users.sql
      002_create_clubs.sql
      003_create_athletes.sql
      004_create_training.sql
      005_create_games.sql
      006_create_tactical.sql
      007_create_files.sql
  frontend/
    dist/                     # Build do React (arquivos estaticos)
  uploads/                    # Arquivos enviados pelos usuarios
    profile-photos/
    club-logos/
    session-files/
```

### 2.2 Schema do Banco (Completo)

```sql
-- ============================================
-- TABELA DE USUARIOS (substitui Supabase Auth)
-- ============================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  profile_photo TEXT,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'trainer',
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- CLUBES
-- ============================================
CREATE TABLE clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clubs_tenant ON clubs(tenant_id);

-- ============================================
-- ATLETAS
-- ============================================
CREATE TABLE athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  jersey_number INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  observation TEXT,
  "group" VARCHAR(50),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_athletes_tenant ON athletes(tenant_id);
CREATE INDEX idx_athletes_club ON athletes(club_id);
CREATE INDEX idx_athletes_tenant_group ON athletes(tenant_id, "group");

-- ============================================
-- CONTEUDOS (Biblioteca)
-- ============================================
CREATE TABLE contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(20),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contents_tenant ON contents(tenant_id);

-- ============================================
-- ETAPAS (Biblioteca)
-- ============================================
CREATE TABLE stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stages_tenant ON stages(tenant_id);

-- ============================================
-- TITULOS DE ATIVIDADES (Templates)
-- ============================================
CREATE TABLE activity_titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_titles_tenant ON activity_titles(tenant_id);
CREATE INDEX idx_activity_titles_content ON activity_titles(content_id);

-- ============================================
-- MICROCICLOS DE TREINO
-- ============================================
CREATE TABLE training_microcycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  week_identifier VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_microcycles_tenant_week ON training_microcycles(tenant_id, week_identifier);
CREATE INDEX idx_microcycles_tenant_start ON training_microcycles(tenant_id, start_date);

-- ============================================
-- SESSOES DE TREINO
-- ============================================
CREATE TABLE training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microcycle_id UUID NOT NULL REFERENCES training_microcycles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  day_name VARCHAR(50),
  day_of_week INTEGER,
  session_type VARCHAR(50) DEFAULT 'training',
  opponent_name VARCHAR(255),
  match_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date, club_id)
);

CREATE INDEX idx_sessions_tenant_date ON training_sessions(tenant_id, date);
CREATE INDEX idx_sessions_microcycle ON training_sessions(microcycle_id);

-- ============================================
-- BLOCOS DE ATIVIDADE
-- ============================================
CREATE TABLE training_activity_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  name VARCHAR(255),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_blocks_session ON training_activity_blocks(session_id, "order");

-- ============================================
-- ATIVIDADES DE TREINO
-- ============================================
CREATE TABLE training_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES training_activity_blocks(id) ON DELETE CASCADE,
  title_id UUID REFERENCES activity_titles(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  groups JSONB DEFAULT '[]',
  is_rest BOOLEAN DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_block ON training_activities(block_id);
CREATE INDEX idx_activities_tenant ON training_activities(tenant_id);

-- ============================================
-- CONTEUDOS DA ATIVIDADE (Many-to-Many)
-- ============================================
CREATE TABLE training_activity_contents (
  activity_id UUID NOT NULL REFERENCES training_activities(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, content_id)
);

-- ============================================
-- ETAPAS DA ATIVIDADE
-- ============================================
CREATE TABLE training_activity_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES training_activities(id) ON DELETE CASCADE,
  stage_name VARCHAR(255),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_stages_activity ON training_activity_stages(activity_id, "order");

-- ============================================
-- ARQUIVOS DE SESSAO
-- ============================================
CREATE TABLE training_activity_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES training_activities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  file_name VARCHAR(255),
  file_path TEXT,
  mime_type VARCHAR(100),
  file_size BIGINT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_files_session ON training_activity_files(session_id);
CREATE INDEX idx_files_tenant ON training_activity_files(tenant_id);

-- ============================================
-- JOGADORES DA PARTIDA
-- ============================================
CREATE TABLE match_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'starter',
  minutes_played INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

-- ============================================
-- EVENTOS DA PARTIDA
-- ============================================
CREATE TABLE match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  team VARCHAR(50),
  goal_type VARCHAR(50),
  minute INTEGER,
  player_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_match_events_session ON match_events(session_id);

-- ============================================
-- JOGADAS TATICAS
-- ============================================
CREATE TABLE tactical_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('football_11', 'futsal')),
  field_view TEXT NOT NULL DEFAULT 'full',
  team_a_color TEXT NOT NULL DEFAULT '#3b82f6',
  team_b_color TEXT NOT NULL DEFAULT '#ef4444',
  keyframes JSONB NOT NULL DEFAULT '[]',
  animation_speed NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tactical_plays_tenant ON tactical_plays(tenant_id);
CREATE INDEX idx_tactical_plays_club ON tactical_plays(club_id);
CREATE INDEX idx_tactical_plays_updated ON tactical_plays(updated_at DESC);
```

### 2.3 Dados Padrao (Seed)

```sql
-- Conteudos padrao (tenant_id NULL = disponivel para todos)
INSERT INTO contents (id, tenant_id, name, abbreviation) VALUES
  (gen_random_uuid(), NULL, 'Bola Parada Ofensiva', 'BPO'),
  (gen_random_uuid(), NULL, 'Bola Parada Defensiva', 'BPD'),
  (gen_random_uuid(), NULL, 'Organizacao Ofensiva', 'OO'),
  (gen_random_uuid(), NULL, 'Organizacao Defensiva', 'OD'),
  (gen_random_uuid(), NULL, 'Transicao Ofensiva', 'TO'),
  (gen_random_uuid(), NULL, 'Transicao Defensiva', 'TD'),
  (gen_random_uuid(), NULL, 'Fisico', 'FIS'),
  (gen_random_uuid(), NULL, 'Tecnico', 'TEC'),
  (gen_random_uuid(), NULL, 'Tatico', 'TAT'),
  (gen_random_uuid(), NULL, 'Recreativo', 'REC');

-- Etapas padrao
INSERT INTO stages (id, tenant_id, name) VALUES
  (gen_random_uuid(), NULL, 'Aquecimento'),
  (gen_random_uuid(), NULL, 'Parte Principal'),
  (gen_random_uuid(), NULL, 'Volta a Calma');
```

---

## FASE 3 - Endpoints da API

### Autenticacao

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Login (retorna JWT) |
| GET | /api/auth/me | Dados do usuario logado |
| PUT | /api/auth/profile | Atualizar perfil |
| PUT | /api/auth/password | Alterar senha |
| POST | /api/auth/forgot-password | Enviar email de reset |
| POST | /api/auth/upload-photo | Upload foto de perfil |

### Clubes

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/clubs | Listar clubes do usuario |
| GET | /api/clubs/:id | Buscar clube |
| POST | /api/clubs | Criar clube |
| PUT | /api/clubs/:id | Atualizar clube |
| DELETE | /api/clubs/:id | Deletar clube |
| POST | /api/clubs/:id/logo | Upload logo |

### Atletas

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/athletes | Listar atletas (filtro por club_id, group) |
| GET | /api/athletes/:id | Buscar atleta |
| POST | /api/athletes | Criar atleta |
| PUT | /api/athletes/:id | Atualizar atleta |
| DELETE | /api/athletes/:id | Deletar atleta |
| PUT | /api/athletes/batch-groups | Atualizar grupos em lote |

### Treinos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/microcycles?week=YYYY-WW&club_id=X | Buscar microciclo |
| POST | /api/microcycles/ensure | Criar/buscar estrutura |
| GET | /api/sessions/:id | Buscar sessao completa |
| PUT | /api/sessions/:id | Salvar blocos/atividades |
| PUT | /api/sessions/:id/type | Alterar tipo (treino/jogo) |

### Atividades

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/contents | Listar conteudos |
| GET | /api/stages | Listar etapas |
| GET | /api/titles | Listar titulos de atividades |
| POST | /api/titles | Criar titulo |
| PUT | /api/titles/:id | Atualizar titulo |
| PUT | /api/titles/:id/archive | Arquivar titulo |

### Jogos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/games/:sessionId | Buscar dados do jogo |
| POST | /api/games/:sessionId | Salvar dados do jogo |

### Estatisticas

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/stats/training | Estatisticas de treino |
| GET | /api/stats/games | Estatisticas de jogos |

### Jogadas Taticas

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/plays | Listar jogadas |
| GET | /api/plays/:id | Buscar jogada |
| POST | /api/plays | Criar jogada |
| PUT | /api/plays/:id | Atualizar jogada |
| DELETE | /api/plays/:id | Deletar jogada |

### Arquivos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | /api/files/upload | Upload arquivo |
| GET | /api/files/session/:sessionId | Listar arquivos da sessao |
| DELETE | /api/files/:id | Deletar arquivo |
| GET | /uploads/* | Servir arquivo (via Nginx) |

---

## FASE 4 - Configuracao Nginx

```nginx
server {
    listen 80;
    server_name tactiplan.faggin.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tactiplan.faggin.com.br;

    ssl_certificate /etc/letsencrypt/live/tactiplan.faggin.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tactiplan.faggin.com.br/privkey.pem;

    # Cabecalhos de seguranca
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React SPA)
    root /home/deploy/sports-platform/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Limite de upload (50MB)
        client_max_body_size 50M;
    }

    # Servir uploads estaticamente
    location /uploads/ {
        alias /home/deploy/sports-platform/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache de assets estaticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL com Certbot

```bash
# Antes de gerar SSL, aponte o DNS A record para o IP da VPS
certbot --nginx -d tactiplan.faggin.com.br
```

---

## FASE 5 - DNS

### Configuracoes necessarias no provedor de dominio

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 143.198.156.198 | 300 |
| A | www | 143.198.156.198 | 300 |
| CNAME | www | tactiplan.faggin.com.br | 300 |

---

## FASE 6 - Mudancas no Frontend

### O que muda:
1. **Remover** `@supabase/supabase-js` do package.json
2. **Remover** `frontend/src/lib/supabase.js`
3. **Substituir** todos os services que usam `supabase.from()` por chamadas HTTP via axios
4. **Substituir** `supabase.auth` por chamadas ao `/api/auth/*`
5. **Substituir** `supabase.storage` por upload via `/api/files/*`
6. **Atualizar** `.env` para apontar para a API:

```env
VITE_API_URL=https://tactiplan.faggin.com.br/api
VITE_APP_NAME="Sports Platform"
VITE_APP_ENV=production
```

### Padrao novo dos services:

```javascript
// Antes (Supabase direto):
const { data, error } = await supabase
  .from('clubs')
  .select('*')
  .eq('tenant_id', tenantId);

// Depois (API REST):
const { data } = await api.get('/clubs');
// tenant_id extraido do JWT no backend automaticamente
```

---

## FASE 7 - Exportar Dados do Supabase

### Via SQL Editor do Supabase ou pg_dump:

```bash
# Se tiver acesso direto ao PostgreSQL do Supabase:
pg_dump -h db.kashktmwcktxfdjkxgki.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --table=clubs \
  --table=athletes \
  --table=training_microcycles \
  --table=training_sessions \
  --table=training_activity_blocks \
  --table=training_activities \
  --table=training_activity_contents \
  --table=training_activity_stages \
  --table=training_activity_files \
  --table=contents \
  --table=stages \
  --table=activity_titles \
  --table=match_players \
  --table=match_events \
  --table=tactical_plays \
  > dados_exportados.sql
```

### Exportar usuarios (via SQL Editor):

```sql
SELECT id, email, encrypted_password, 
       raw_user_meta_data->>'name' as name,
       raw_user_meta_data->>'phone' as phone,
       raw_user_meta_data->>'bio' as bio,
       raw_user_meta_data->>'profile_photo' as profile_photo,
       email_confirmed_at, created_at
FROM auth.users;
```

---

## FASE 8 - Deploy e Manutencao

### Iniciar a aplicacao com PM2

```bash
cd /home/deploy/sports-platform/backend
pm2 start server.js --name sports-api
pm2 save
pm2 startup  # auto-start no boot
```

### Monitoramento

```bash
pm2 status         # ver status
pm2 logs sports-api # ver logs
pm2 restart sports-api # reiniciar
```

### Backup automatico do banco

```bash
# Criar script de backup
cat > /home/deploy/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/home/deploy/backups
mkdir -p $BACKUP_DIR
pg_dump -U sports_admin sports_platform > $BACKUP_DIR/backup_$DATE.sql
# Manter apenas ultimos 30 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +31 | xargs rm -f 2>/dev/null
EOF

chmod +x /home/deploy/backup.sh

# Agendar backup diario as 3h
(crontab -l 2>/dev/null; echo "0 3 * * * /home/deploy/backup.sh") | crontab -
```

---

## CHECKLIST DE MIGRACAOO

### VPS
- [ ] Servidor acessivel via SSH
- [ ] Node.js 20 instalado
- [ ] PostgreSQL 16 instalado e configurado
- [ ] Nginx instalado
- [ ] PM2 instalado
- [ ] Firewall configurado (22, 80, 443)

### DNS
- [ ] Dominio apontando para IP da VPS (registro A)
- [ ] SSL gerado com Certbot
- [ ] HTTPS funcionando

### Backend
- [ ] Banco de dados criado com schema completo
- [ ] Dados seed inseridos (conteudos, etapas)
- [ ] API Node.js rodando com PM2
- [ ] Todas as rotas implementadas e testadas
- [ ] Pasta de uploads criada com permissoes

### Frontend
- [ ] Services refatorados (Supabase -> API REST)
- [ ] Build de producao gerado
- [ ] Deploy no Nginx
- [ ] .env de producao configurado

### Dados
- [ ] Usuarios exportados do Supabase
- [ ] Dados de treino exportados
- [ ] Dados de jogos exportados
- [ ] Jogadas taticas exportadas
- [ ] Arquivos/imagens migrados

### Testes
- [ ] Login/registro funcionando
- [ ] CRUD de clubes
- [ ] CRUD de atletas
- [ ] Criar/editar treinos
- [ ] Criar/editar jogos
- [ ] Quadro tatico salvar/carregar
- [ ] Upload de arquivos
- [ ] Estatisticas

---

## INFORMACOES PARA CLAUDE CODE NA VPS

Ao abrir o Claude Code na VPS, fornecer este contexto:

> Este projeto e o Sports Platform, uma plataforma web para treinadores esportivos.
> O arquivo MIGRATION_VPS.md na raiz do projeto contem toda a documentacao.
> A fase atual e implementar o backend Node.js + Express seguindo o schema SQL
> e os endpoints documentados. O frontend React ja existe e precisa ser refatorado
> para usar a API REST ao inves do Supabase direto.

O Claude Code tera acesso a:
1. Este documento (MIGRATION_VPS.md)
2. Todo o codigo fonte do frontend em `frontend/src/`
3. Os services atuais que usam Supabase (referencia para implementar os endpoints)
