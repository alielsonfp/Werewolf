@echo off
echo 🔧 QUICK FIX - Corrigindo problema do Prisma
echo ============================================

echo 🛑 Parando containers...
docker-compose -f docker-compose.dev.yml down

echo 🧹 Limpando imagens antigas...
docker-compose -f docker-compose.dev.yml down --rmi all

echo 🚀 Rebuilding com correção...
docker-compose -f docker-compose.dev.yml up --build

echo.
echo ✅ Fix aplicado! 
echo 📋 O que foi corrigido:
echo    - Mudou de Alpine para Debian (melhor compatibilidade Prisma)
echo    - Adicionou dependências necessárias
echo    - Corrigiu health check
echo.