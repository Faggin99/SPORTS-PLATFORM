# 🚀 BUILD STANDALONE - Instalador Completo

Este guia ensina como gerar um instalador `.exe` que funciona 100% offline, sem precisar instalar PHP, banco de dados ou nada!

## ✅ O que está incluído no instalador:

- ✅ PHP portable (não precisa ter PHP instalado)
- ✅ Laravel backend completo
- ✅ React frontend
- ✅ Banco SQLite (dados salvos localmente)
- ✅ Tudo em um único `.exe`

## 📋 Pré-requisitos

Certifique-se de ter instalado:
- Node.js (já instalado ✅)
- Composer (para instalar dependências do Laravel)

## 🔧 Passo a Passo

### 1. Instalar dependências do backend

```bash
cd backend
composer install --optimize-autoloader --no-dev
cd ..
```

### 2. Build do frontend

```bash
cd frontend
npm run build
cd ..
```

### 3. Baixar PHP portable

```bash
cd electron-app
npm run setup-php
```

Isso vai baixar e configurar o PHP automaticamente (~30MB).

### 4. Gerar instalador

```bash
npm run build:win
```

## 📦 Resultado

O instalador será gerado em:
```
electron-app/dist/Sports Platform Setup 1.0.0.exe
```

**Tamanho estimado:** ~150-200MB (inclui PHP + Laravel + React + dependências)

## 🎯 Distribuir

Depois de gerar o `.exe`, você pode:

1. **Google Drive:**
   - Upload do arquivo
   - Compartilhar link

2. **WeTransfer:**
   - https://wetransfer.com
   - Enviar por email

3. **Pen Drive:**
   - Copiar arquivo físico

## 📝 O que acontece quando o usuário instala:

1. Clica no `.exe`
2. Escolhe pasta de instalação
3. App é instalado
4. Atalho criado na área de trabalho
5. Ao abrir pela primeira vez:
   - PHP inicia automaticamente
   - Banco SQLite é criado
   - Migrations rodam automaticamente
   - App abre pronto para usar!

## 🔍 Detalhes Técnicos

### Banco de Dados
- **Localização:** `C:\Users\[Usuario]\AppData\Roaming\sports-platform-desktop\database.sqlite`
- **Tipo:** SQLite
- **Backup:** Copiar arquivo database.sqlite

### Logs
- **Localização:** Console do Electron (F12 para abrir DevTools)
- **Laravel logs:** Backend executa em memória

### Atualização
Para atualizar o app:
1. Gerar novo `.exe` com versão atualizada
2. Usuário instala por cima
3. Dados do banco são preservados

## ⚠️ Limitações

- ❌ Funciona apenas offline (não sincroniza entre PCs)
- ✅ Cada PC tem seu próprio banco de dados
- ✅ Ideal para uso individual/familiar

## 🛠️ Troubleshooting

### "PHP não encontrado"
- Execute: `npm run setup-php`
- Verifique se `electron-app/php-portable/php.exe` existe

### "Banco não cria"
- Verifique permissões da pasta `AppData`
- Execute app como administrador

### ".exe muito grande"
- Normal! Inclui PHP + Laravel completo
- Compactação pode reduzir ~20-30%

## 🎉 Pronto!

Agora você pode distribuir o app para qualquer pessoa, sem precisar configurar nada! 🚀
