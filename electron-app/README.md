# Sports Platform - Electron Desktop App

Aplicação desktop baseada em Electron para o Sports Platform.

## Desenvolvimento

### Pré-requisitos
- Node.js instalado
- PHP e Composer instalados
- Backend Laravel configurado em `../backend`
- Frontend React buildado em `../frontend/dist`

### Executar em modo desenvolvimento

```bash
npm start
```

Isso irá:
1. Iniciar o backend Laravel na porta 8000
2. Iniciar o frontend Vite na porta 5173
3. Abrir a aplicação Electron apontando para http://localhost:5173

### Build para produção

#### Windows
```bash
npm run build:win
```
Gera instalador `.exe` em `dist/`

#### macOS
```bash
npm run build:mac
```
Gera instalador `.dmg` em `dist/`

#### Linux
```bash
npm run build:linux
```
Gera instalador `.AppImage` em `dist/`

## Estrutura

- `main.js` - Processo principal do Electron
- `assets/` - Ícones da aplicação
- `dist/` - Instaladores gerados pelo electron-builder

## Notas

- Em produção, o app carrega arquivos de `../frontend/dist/`
- O backend PHP é iniciado automaticamente com a aplicação
- Ícones personalizados devem ser colocados em `assets/`:
  - `icon.png` (512x512) para Linux
  - `icon.ico` para Windows
  - `icon.icns` para macOS
