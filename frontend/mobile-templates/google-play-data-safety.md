# Google Play — Data Safety declaration (pré-preenchido pra copiar)

Responde direto no Play Console → **App content** → **Data safety**.

## 1. Data collection and security

**Does your app collect or share any of the required user data types?**
→ **Yes**

**Is all of the user data collected by your app encrypted in transit?**
→ **Yes** (HTTPS/TLS 1.2+ obrigatório em toda a API)

**Do you provide a way for users to request that their data is deleted?**
→ **Yes** (endpoint DELETE /api/auth/me + UI em Configurações → Zona de perigo)

## 2. Data types

### Personal info

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| Name | ✅ Yes | ❌ No | Required | App functionality, Account management | No |
| Email address | ✅ Yes | ❌ No | Required | App functionality, Account management, Communications | No |
| User IDs | ✅ Yes | ❌ No | Required | App functionality, Account management, Analytics | No |
| Phone number | ❌ No | | | | |
| Address | ❌ No | | | | |

### Financial info

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| Purchase history | ✅ Yes | ❌ No | Required | App functionality, Account management | No |
| Credit card, bank details | ❌ No (processado por Mercado Pago externamente) | | | | |

### Photos and videos

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| Photos | ✅ Yes | ❌ No | Optional (só se o usuário anexar foto de atleta) | App functionality | No |
| Videos | ❌ No | | | | |

### App activity

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| App interactions | ✅ Yes | ❌ No | Required | Analytics (Plausible, sem cookies) | Yes |
| In-app search history | ❌ No | | | | |
| Installed apps | ❌ No | | | | |
| Other user-generated content | ✅ Yes (treinos, escalações, eventos de jogo, tática) | ❌ No | Required | App functionality | No |

### App info and performance

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| Crash logs | ✅ Yes (Sentry) | ✅ Yes (Sentry Inc.) | Required | Analytics, Diagnostics | No |
| Diagnostics | ✅ Yes | ✅ Yes (Sentry Inc.) | Required | Analytics, Diagnostics | No |
| Other app performance data | ❌ No | | | | |

### Device or other IDs

| Data type | Collected? | Shared? | Optional? | Purpose(s) | Ephemeral? |
|-----------|-----------|---------|-----------|-----------|-----------|
| Device or other IDs | ❌ No | | | | |

## Categorias NÃO coletadas (confirmar como "No")

- Location (Approximate, Precise)
- Personal info: Race, ethnicity, sexual orientation, political/religious beliefs
- Health and fitness data
- Messages (Emails, SMS, other in-app)
- Audio recordings
- Files and docs
- Calendar
- Contacts
- Web browsing
- **Ads or app functionality (advertising identifiers)** → ❌ No

## 3. Security practices

- ✅ **Data is encrypted in transit** — TLS 1.2+
- ✅ **You can request that data be deleted** — DELETE /api/auth/me + UI
- ✅ **Committed to Play Families Policy** → **No** (não é família)
- ✅ **Independent security review** → **No** (não temos ainda)

## 4. Content rating (questionário separado)

Todas as respostas: **No**.
- Violence
- Sexual content
- Profanity or crude humor
- Controlled substances
- Simulated gambling
- Users can interact / share personal info
- Shares user location
- Digital purchases (o pagamento é externo pelo navegador → responder **No** aqui)

Rating final esperado: **Everyone / Livre**.

## 5. Target audience and content

- **Target age**: 13-15, 16-17, 18+ (ok todos os três — treinadores)
- **Appeals to children**: **No** (é pra treinadores adultos)
