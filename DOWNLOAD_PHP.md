# 📥 Como Baixar PHP Portable Manualmente

O script automático teve problema. Siga estes passos para baixar manualmente:

## Passo 1: Baixar PHP

Acesse um destes links:

### Opção 1: PHP.net (Oficial)
https://windows.php.net/downloads/releases/php-8.2.27-nts-Win32-vs16-x64.zip

### Opção 2: PHP Downloads (Alternativo)
https://windows.php.net/download/

Procure por: **PHP 8.2.x NTS x64 Thread Safe**

## Passo 2: Extrair

1. Baixe o arquivo .zip (~30MB)
2. Extraia TODO o conteúdo para:
   ```
   C:\Users\arthu\sports-platform\electron-app\php-portable\
   ```

3. Verifique se existe o arquivo:
   ```
   C:\Users\arthu\sports-platform\electron-app\php-portable\php.exe
   ```

## Passo 3: Configurar php.ini

1. Copie o arquivo `php.ini-development` para `php.ini`
2. Abra `php.ini` em um editor de texto
3. Encontre e descomente (remover `;`) estas linhas:

```ini
extension=fileinfo
extension=mbstring
extension=openssl
extension=pdo_sqlite
extension=sqlite3
```

## Passo 4: Gerar Instalador

Depois que o PHP estiver configurado, volte para o terminal e execute:

```bash
cd electron-app
npm run build:win
```

---

## ⚡ ATALHO - Se você tem PHP instalado

Se você já tem PHP 8.x instalado no seu PC, pode pular isso e o Electron vai usar o PHP do sistema temporariamente. O build vai incluir todo o backend, só não vai incluir o PHP.exe.

Nesse caso, quem instalar o app vai precisar ter PHP instalado.

---

## 🔄 Alternativa: Build Sem PHP Portable

Você pode gerar o instalador sem incluir o PHP. Nesse caso:

1. Remova esta linha do `electron-app/package.json`:
   ```json
   "php-portable/**/*",
   ```

2. Build:
   ```bash
   cd electron-app
   npm run build:win
   ```

3. **Limitação:** Quem instalar precisará ter PHP instalado no PC.

---

Qual opção prefere?
1. Baixar PHP manualmente (~5 minutos)
2. Build sem PHP (mais rápido, mas precisa PHP instalado)
