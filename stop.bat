@echo off
echo ========================================
echo   Parando Sports Platform
echo ========================================
echo.

echo [1/2] Parando servicos Docker...
cd /d "%~dp0"
docker-compose down

echo.
echo [2/2] Fechando janelas do Backend e Frontend...
taskkill /FI "WindowTitle eq Backend - Laravel*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Frontend - React*" /T /F >nul 2>&1

echo.
echo ========================================
echo   Aplicacao parada com sucesso!
echo ========================================
echo.
pause
