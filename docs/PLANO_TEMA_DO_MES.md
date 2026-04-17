# Plano de Implementacao - Tema do Mes

## Contexto
Treinadores de escolinha definem mensalmente um foco de trabalho (ex: "Organizacao Ofensiva"). 
Querem declarar essa intencao no sistema e acompanhar a aderencia ao longo do mes.

---

## FASE 1 - Backend (API + Banco)

### 1.1 Nova tabela `monthly_themes`

```sql
CREATE TABLE IF NOT EXISTS monthly_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,  -- formato "2026-04"
  primary_content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  secondary_content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, club_id, month)
);

CREATE INDEX idx_monthly_themes_tenant_club ON monthly_themes(tenant_id, club_id, month);
```

### 1.2 Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/themes?month=2026-04&club_id=X | Buscar tema do mes |
| PUT | /api/themes | Criar/atualizar tema do mes (upsert) |
| DELETE | /api/themes/:id | Remover tema do mes |
| GET | /api/themes/adherence?month=2026-04&club_id=X | Calcular % de aderencia |

### 1.3 Arquivo: `backend-node/src/routes/themes.js`

**GET /api/themes** - Retorna o tema do mes para o club
```javascript
// SELECT * FROM monthly_themes 
// WHERE tenant_id = $1 AND club_id = $2 AND month = $3
// JOIN contents para trazer nome do conteudo primario e secundario
```

**PUT /api/themes** - Upsert (cria ou atualiza)
```javascript
// INSERT INTO monthly_themes (...) VALUES (...)
// ON CONFLICT (tenant_id, club_id, month) 
// DO UPDATE SET primary_content_id = $4, secondary_content_id = $5, description = $6
```

**GET /api/themes/adherence** - Calcula aderencia
```javascript
// 1. Buscar o tema do mes (primary_content_id, secondary_content_id)
// 2. Buscar todas as atividades do mes (via sessions.date no range do mes)
// 3. Contar quantas atividades tem o conteudo do tema nos training_activity_contents
// 4. Retornar { total_activities, themed_activities, adherence_percent }
```

### 1.4 Registrar rota no server.js
```javascript
const themesRoutes = require('./src/routes/themes');
app.use('/api/themes', themesRoutes);
```

---

## FASE 2 - Frontend - Seletor no Calendario

### 2.1 Novo service: `themeService.js`

```javascript
// getTheme(month, clubId) -> GET /api/themes?month=...&club_id=...
// saveTheme(data) -> PUT /api/themes
// deleteTheme(id) -> DELETE /api/themes/:id
// getAdherence(month, clubId) -> GET /api/themes/adherence?month=...&club_id=...
```

### 2.2 Componente: `MonthlyThemeBanner.jsx`

Localizado acima do calendario semanal na TrainingPage.

**Quando nao tem tema definido:**
```
┌────────────────────────────────────────────┐
│  📋 Definir tema do mes   [Escolher]       │
└────────────────────────────────────────────┘
```

**Quando tem tema:**
```
┌────────────────────────────────────────────┐
│  🎯 Tema de Abril: Org. Ofensiva (72%)    │
│     Secundario: Transicao Ofensiva    [✏️] │
└────────────────────────────────────────────┘
```

- Banner discreto, altura ~48px
- Mostra % de aderencia em tempo real
- Botao de editar abre modal de selecao
- No mobile: compacto, 1 linha "🎯 OO (72%)" com tap pra expandir

### 2.3 Modal: `ThemeSelectionModal.jsx`

- Dropdown para selecionar conteudo primario (lista de contents)
- Dropdown opcional para conteudo secundario
- Campo de texto para descricao/meta do mes
- Botoes Salvar/Cancelar

### 2.4 Destaque visual nos blocos de treino

Na `TrainingPage.jsx`, quando um bloco de atividade contem o conteudo do tema:

- Borda esquerda colorida (3px, cor do conteudo tema)
- Ou um mini badge "🎯" no canto do bloco
- Sutil, nao invasivo

---

## FASE 3 - Frontend - Estatisticas

### 3.1 Card de aderencia na `TrainingStatsPage.jsx`

Novo card no topo das estatisticas:

```
┌─────────────────────────────┐
│  Tema do Mes: Org. Ofensiva │
│                              │
│      ████████░░  72%         │
│                              │
│  23 de 32 atividades         │
│  Meta: foco em construcao    │
└─────────────────────────────┘
```

- Barra de progresso circular ou linear
- Mostra total de atividades vs atividades com o tema
- Se nao tem tema definido, mostra "Nenhum tema definido para este mes"

### 3.2 Historico de temas (opcional futuro)

- Lista dos ultimos 6 meses com tema + aderencia
- Permite ver evolucao ao longo do tempo

---

## FASE 4 - Integracao

### 4.1 Arquivos a criar
- `backend-node/migrations/003_monthly_themes.sql`
- `backend-node/src/routes/themes.js`
- `frontend/src/services/themeService.js`
- `frontend/src/components/training/MonthlyThemeBanner.jsx`
- `frontend/src/components/training/ThemeSelectionModal.jsx`

### 4.2 Arquivos a modificar
- `backend-node/server.js` - adicionar rota
- `frontend/src/pages/TrainingPage.jsx` - adicionar banner + destaque nos blocos
- `frontend/src/pages/TrainingStatsPage.jsx` - adicionar card de aderencia

### 4.3 Ordem de implementacao
1. Migration SQL + rota backend (30 min)
2. Service frontend (10 min)
3. Banner + Modal de selecao (45 min)
4. Destaque visual nos blocos (20 min)
5. Card de estatisticas (30 min)
6. Testes e ajustes mobile (20 min)

**Estimativa total: ~2.5 horas**

---

## Regras de negocio

- Cada clube tem seu proprio tema do mes (multi-club)
- Tema e opcional - nao obriga o treinador a nada
- 1 conteudo primario obrigatorio + 1 secundario opcional
- Aderencia = (atividades com conteudo tema / total atividades do mes) * 100
- Se trocar o tema no meio do mes, recalcula com o novo
- Meses sem tema mostram "Nenhum tema definido"
## ADICAO - Mensagem de Resultado na Dashboard

Quando na aba de stats com periodo mensal e tema cadastrado, mostrar card:
- >= 75%: Parabens! Cumpriu o objetivo, X% dos treinos focados em tema. (verde)
- 50-74%: Cumpriu parcialmente, X% focados em tema. (amarelo)
- < 50%: Objetivo nao alcancado. Apenas X% focados em tema. (vermelho)
- 0%: Nenhuma atividade relacionada ao tema do mes.
Card destacado no topo das stats com tema + % + total (18 de 24 atividades).
