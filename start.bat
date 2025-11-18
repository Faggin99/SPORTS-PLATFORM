@echo off
chcp 65001 >nul
echo ========================================
echo   Iniciando Sports Platform
echo ========================================
echo.

:: Verifica se Docker esta rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Docker nao esta rodando. Iniciando Docker Desktop...

    :: Tenta encontrar o Docker Desktop
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    ) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    ) else if exist "%LOCALAPPDATA%\Docker\Docker Desktop.exe" (
        start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe"
    ) else (
        echo [ERRO] Docker Desktop nao encontrado. Instale o Docker Desktop primeiro.
        echo Download: https://www.docker.com/products/docker-desktop
        pause
        exit /b 1
    )

    echo Aguardando Docker iniciar...
    :wait_docker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo Ainda aguardando Docker...
        goto wait_docker
    )
    echo Docker iniciado com sucesso!
    echo.
)

echo [1/3] Iniciando servicos Docker (PostgreSQL, Redis, MailHog)...
cd /d "%~dp0"
docker-compose up -d

:: Aguarda um pouco para os servicos subirem
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Iniciando Backend (Laravel) em background...
cd /d "%~dp0backend"
start /B php artisan serve

:: Aguarda backend iniciar
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Iniciando Frontend (React + Vite)...
cd /d "%~dp0frontend"

echo.
echo ========================================
echo   Aplicacao iniciada com sucesso!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo MailHog:  http://localhost:8025
echo.
echo Pressione Ctrl+C para parar todos os servicos
echo.

:: Inicia o frontend no terminal atual (mantem terminal aberto)
call npm run dev
