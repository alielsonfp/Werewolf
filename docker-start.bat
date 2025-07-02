@echo off
echo 🐺 LOBISOMEM ONLINE - Quick Start
echo ==============================

REM Parar containers antigos
echo 🛑 Parando containers antigos...
docker-compose -f docker-compose.dev.yml down --remove-orphans

REM Copiar .env se não existir
if not exist .env (
    echo 📋 Copiando .env.example para .env...
    copy .env.example .env
)

REM Subir containers
echo 🚀 Subindo containers...
docker-compose -f docker-compose.dev.yml up -d --build

REM Aguardar um pouco
echo ⏳ Aguardando containers ficarem prontos...
timeout /t 15 /nobreak >nul

REM Verificar status
echo 📊 Status dos containers:
docker-compose -f docker-compose.dev.yml ps

echo.
echo 🎉 PRONTO!
echo.
echo 📋 Verificações:
echo    Backend: http://localhost:3001/health
echo    PostgreSQL: localhost:5432 (werewolf/werewolf123)
echo    Redis: localhost:6379
echo.
echo 📱 Comandos úteis:
echo    Ver logs: docker-compose -f docker-compose.dev.yml logs -f
echo    Parar: docker-compose -f docker-compose.dev.yml down
echo.
pause