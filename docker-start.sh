#!/bin/bash

echo "🐺 LOBISOMEM ONLINE - Start Script"
echo "================================="

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Executando setup automático...${NC}"

# 1. Instalar dependências (NPM Workspaces)
echo -e "${BLUE}📦 Instalando dependências...${NC}"
npm install

# 2. Copiar .env se não existir
if [ ! -f .env ]; then
    echo -e "${BLUE}📄 Criando arquivo .env...${NC}"
    cp .env.example .env
fi

# 3. Subir containers
echo -e "${BLUE}🚀 Subindo containers Docker...${NC}"
npm run dev

echo -e "${GREEN}✅ Ambiente iniciado com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📋 URLs importantes:${NC}"
echo "   🌐 Backend: http://localhost:3001/health"
echo "   🗄️  PostgreSQL: localhost:5432"
echo "   📦 Redis: localhost:6379"
echo ""
echo -e "${YELLOW}🔧 Comandos úteis:${NC}"
echo "   📊 Ver logs: npm run dev:logs"
echo "   🛑 Parar: npm run dev:down"
echo "   🧹 Limpar: npm run clean"