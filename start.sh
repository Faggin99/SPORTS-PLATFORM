#!/bin/bash

echo "========================================"
echo "   Iniciando Sports Platform"
echo "========================================"
echo ""

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "[ERRO] Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

echo "[1/3] Iniciando serviços Docker (PostgreSQL, Redis, MailHog)..."
docker-compose up -d

# Aguarda serviços subirem
sleep 3

echo ""
echo "[2/3] Iniciando Backend (Laravel)..."
cd backend
php artisan serve > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

# Aguarda backend iniciar
sleep 2

echo ""
echo "[3/3] Iniciando Frontend (React + Vite)..."
cd frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "   Aplicação iniciada com sucesso!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "MailHog:  http://localhost:8025"
echo ""
echo "PIDs:"
echo "  Backend:  $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "Para parar, pressione Ctrl+C"

# Aguarda interrupção
trap "docker-compose down; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
