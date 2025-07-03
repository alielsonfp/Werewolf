#!/bin/bash
# 🐺 LOBISOMEM ONLINE - Setup Authentication System
# Complete setup for authentication functionality

set -e

echo "🐺 WEREWOLF ONLINE - Authentication Setup"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function for colored output
log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
log_info "Checking Docker..."
if ! docker ps >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi
log_success "Docker is running"

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Build and start containers
log_info "Building and starting containers..."
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for containers to be ready
log_info "Waiting for containers to be ready..."
sleep 15

# Check if PostgreSQL is ready
log_info "Checking PostgreSQL..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -h localhost -U werewolf >/dev/null 2>&1; do
    log_info "Waiting for PostgreSQL..."
    sleep 2
done
log_success "PostgreSQL is ready"

# Check if Redis is ready
log_info "Checking Redis..."
until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping >/dev/null 2>&1; do
    log_info "Waiting for Redis..."
    sleep 2
done
log_success "Redis is ready"

# Wait a bit more for backend to be ready
log_info "Waiting for backend to initialize..."
sleep 10

# Push database schema
log_info "Setting up database schema..."
docker-compose -f docker-compose.dev.yml exec -T backend npx prisma db push
log_success "Database schema created"

# Generate Prisma client
log_info "Generating Prisma client..."
docker-compose -f docker-compose.dev.yml exec -T backend npx prisma generate
log_success "Prisma client generated"

# Run seeds
log_info "Seeding database with test data..."
docker-compose -f docker-compose.dev.yml exec -T backend npm run db:seed
log_success "Database seeded"

# Check backend health
log_info "Checking backend health..."
sleep 5
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_success "Backend is healthy and responding"
else
    log_warning "Backend health check failed. Checking logs..."
    docker-compose -f docker-compose.dev.yml logs backend --tail=20
fi

# Display container status
log_info "Container status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo -e "${GREEN}🎉 AUTHENTICATION SETUP COMPLETE!${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}📋 Available endpoints:${NC}"
echo " 🌐 Backend API: http://localhost:3001"
echo " 🏥 Health Check: http://localhost:3001/health"
echo " 📚 API Docs: http://localhost:3001/api"
echo " 🗄 PostgreSQL: localhost:5432 (werewolf/werewolf123)"
echo " 📦 Redis: localhost:6379"
echo " 🎨 Prisma Studio: cd backend && npm run db:studio"
echo ""
echo -e "${YELLOW}🔑 Test user credentials:${NC}"
echo " Admin: admin@werewolf.com / admin123"
echo " Player: player1@test.com / player123"
echo " Newbie: newbie@test.com / newbie123"
echo ""
echo -e "${YELLOW}🧪 Test authentication:${NC}"
echo " chmod +x scripts/test-auth.sh && ./scripts/test-auth.sh"
echo ""
echo -e "${YELLOW}📱 Useful commands:${NC}"
echo " View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo " Stop: docker-compose -f docker-compose.dev.yml down"
echo " Restart: docker-compose -f docker-compose.dev.yml restart"
echo " Reset DB: cd backend && npm run db:reset && npm run db:seed"
echo ""
echo -e "${GREEN}🐺 Happy coding! 🚀${NC}"