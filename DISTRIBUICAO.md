# 📦 Guia de Distribuição - Sports Platform

## Opções de Distribuição

### 1️⃣ INSTALADOR DESKTOP (.exe)

#### Gerar Instalador
```bash
# Build frontend
cd frontend
npm run build

# Build instalador Windows
cd ../electron-app
npm run build:win
```

**Arquivo gerado:** `electron-app/dist/Sports Platform Setup 1.0.0.exe`

#### Distribuir
- **Google Drive:** Upload + compartilhar link
- **WeTransfer:** https://wetransfer.com (até 2GB)
- **Pen Drive:** Copiar arquivo físico
- **GitHub Releases:** `gh release create v1.0.0 *.exe`

#### ⚠️ Limitação Atual
O instalador NÃO inclui backend. Usuário precisa:
- Backend online (hospedar no Railway/Heroku), OU
- Configurar backend localmente

---

### 2️⃣ PWA - INSTALÁVEL PELO NAVEGADOR

#### Hospedar Online

**Frontend - Vercel (Grátis):**
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

**Backend - Railway (Grátis):**
1. Acesse https://railway.app
2. Conecte GitHub
3. Deploy automático

#### Como Usuário Instala
1. Acessa o site no Chrome
2. Clica no ícone "Instalar" na barra de endereço
3. App instalado como PWA

---

### 3️⃣ ACESSO REMOTO

#### Opção A: Tailscale (VPN)
```bash
# Instalar em ambos PCs: https://tailscale.com
# Acesso via IP privado: http://100.x.x.x:5173
```

#### Opção B: ngrok (Túnel)
```bash
npm install -g ngrok
ngrok http 5173  # Frontend
ngrok http 8000  # Backend
```

---

## 🎯 RECOMENDAÇÃO

### Para Teste Rápido (Hoje)
1. Use ngrok para expor localhost
2. Envie links para usuário
3. Ele acessa pelo navegador

### Para Produção (Recomendado)
1. Hospede backend no Railway (grátis)
2. Hospede frontend no Vercel (grátis)
3. Usuário instala PWA pelo navegador
4. OU gere .exe apontando para backend online

---

## 🔧 Melhorias Futuras

### Incluir Backend no .exe
Para distribuir .exe com backend embutido:

1. **Incluir PHP portable:**
```json
// electron-app/package.json
"files": [
  "main.js",
  "php-portable/**",
  "../backend/**"
]
```

2. **Modificar main.js:**
```javascript
// Usar PHP portable ao invés de 'php' do sistema
const phpPath = path.join(__dirname, 'php-portable', 'php.exe')
laravelProcess = spawn(phpPath, ['artisan', 'serve'])
```

3. **Incluir banco SQLite:**
```php
// backend/.env
DB_CONNECTION=sqlite
DB_DATABASE=../database/database.sqlite
```

---

## 📊 Comparação

| Método | Facilidade | Custo | Backend Incluso |
|--------|-----------|-------|----------------|
| .exe (atual) | ⭐⭐⭐ | Grátis | ❌ |
| .exe (melhorado) | ⭐⭐⭐⭐ | Grátis | ✅ |
| PWA (online) | ⭐⭐⭐⭐⭐ | Grátis | ✅ |
| ngrok | ⭐⭐ | Grátis* | N/A |

*ngrok grátis tem limitações

---

## 🚀 Próximos Passos

Escolha uma opção e me avise para implementar!
