#!/bin/bash

# 🐺 LOBISOMEM ONLINE - Setup Script
# Configura todo o ambiente de desenvolvimento

set -e

echo "🐺 LOBISOMEM ONLINE - Setup Inicial"
echo "=================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs coloridos
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    log_error "Docker não está instalado! Instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose não está instalado! Instale o Docker Compose primeiro."
    exit 1
fi

log_success "Docker e Docker Compose encontrados!"

# Verificar se Node.js está instalado (para desenvolvimento local)
if ! command -v node &> /dev/null; then
    log_warning "Node.js não encontrado. Será usado apenas via Docker."
else
    NODE_VERSION=$(node --version)
    log_success "Node.js encontrado: $NODE_VERSION"
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    log_info "Criando arquivo .env..."
    cp .env.example .env
    log_success "Arquivo .env criado! Edite conforme necessário."
else
    log_info "Arquivo .env já existe."
fi

# Criar diretórios necessários
log_info "Criando diretórios necessários..."
mkdir -p database/seeds
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p nginx/logs

# Parar containers existentes
log_info "Parando containers existentes..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Construir e iniciar containers
log_info "Construindo e iniciando containers..."
docker-compose -f docker-compose.dev.yml up -d --build

# Aguardar containers ficarem prontos
log_info "Aguardando containers ficarem prontos..."
sleep 10

# Verificar se PostgreSQL está pronto
log_info "Verificando PostgreSQL..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -h localhost -U werewolf; do
    log_info "Aguardando PostgreSQL..."
    sleep 2
done
log_success "PostgreSQL está pronto!"

# Verificar se Redis está pronto
log_info "Verificando Redis..."
until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping; do
    log_info "Aguardando Redis..."
    sleep 2
done
log_success "Redis está pronto!"

# Instalar dependências do backend
if [ -f backend/package.json ]; then
    log_info "Instalando dependências do backend..."
    cd backend
    npm install
    log_success "Dependências do backend instaladas!"
    
    # Gerar cliente Prisma
    log_info "Gerando cliente Prisma..."
    npx prisma generate
    log_success "Cliente Prisma gerado!"
    
    # Executar migrations
    log_info "Executando migrations..."
    npx prisma db push
    log_success "Migrations executadas!"
    
    # Voltar ao diretório raiz
    cd ..
else
    log_warning "package.json do backend não encontrado. Pulando instalação de dependências."
fi

# Verificar se o backend está respondendo
log_info "Verificando se o backend está respondendo..."
sleep 5
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log_success "Backend está respondendo na porta 3001!"
else
    log_warning "Backend não está respondendo ainda. Pode demorar alguns minutos para ficar pronto."
fi

# Exibir status dos containers
log_info "Status dos containers:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🎉 SETUP CONCLUÍDO!"
echo "==================="
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique se todos os containers estão rodando: docker-compose -f docker-compose.dev.yml ps"
echo "   2. Acesse o backend: http://localhost:3001/health"
echo "   3. PostgreSQL: localhost:5432 (werewolf/werewolf123)"
echo "   4. Redis: localhost:6379"
echo ""
echo "📱 Comandos úteis:"
echo "   • Ver logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   • Parar: docker-compose -f docker-compose.dev.yml down"
echo "   • Reiniciar: docker-compose -f docker-compose.dev.yml restart"
echo "   • Prisma Studio: cd backend && npx prisma studio"
echo ""
echo "🐺 Happy coding! 🚀"