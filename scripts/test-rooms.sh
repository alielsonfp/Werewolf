#!/bin/bash
# 🐺 LOBISOMEM ONLINE - Room API Testing Script
# Testa todos os endpoints de salas

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL da API
API_URL="http://localhost:3001"

# Função para logs coloridos
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

# Função para fazer request e verificar
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local expected_status=${5:-200}
    
    log_info "Testing $method $endpoint"
    
    if [ -n "$token" ]; then
        headers="-H \"Authorization: Bearer $token\""
    else
        headers=""
    fi
    
    if [ -n "$data" ]; then
        response=$(eval curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" \
            "$API_URL$endpoint")
    else
        response=$(eval curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            $headers \
            "$API_URL$endpoint")
    fi
    
    # Separar body e status
    body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    echo "Response: $body"
    
    if [ "$status" = "$expected_status" ]; then
        log_success "Status $status (expected $expected_status)"
        echo "$body"
    else
        log_error "Status $status (expected $expected_status)"
        echo "$body"
        return 1
    fi
}

echo "🐺 LOBISOMEM ONLINE - Room API Testing"
echo "======================================"

# 1. Verificar se o servidor está rodando
log_info "Checking if server is running..."
if ! curl -s "$API_URL/health" > /dev/null; then
    log_error "Server is not running at $API_URL"
    echo "Start the server with: npm run dev"
    exit 1
fi
log_success "Server is running"

# 2. Registrar um usuário de teste para ter token
log_info "Registering test user..."
user_data='{
    "email": "testuser@rooms.com",
    "username": "RoomTester",
    "password": "Test123!",
    "confirmPassword": "Test123!"
}'

response=$(make_request "POST" "/api/auth/register" "$user_data" "" "201" 2>/dev/null || echo "")
if [ -z "$response" ]; then
    log_warning "User already exists, trying to login..."
    login_data='{
        "email": "testuser@rooms.com",
        "password": "Test123!"
    }'
    response=$(make_request "POST" "/api/auth/login" "$login_data" "" "200")
fi

# Extrair token
token=$(echo "$response" | jq -r '.data.accessToken' 2>/dev/null || echo "")
if [ -z "$token" ] || [ "$token" = "null" ]; then
    log_error "Failed to get authentication token"
    exit 1
fi
log_success "Got authentication token"

# 3. Testar listagem de salas (vazia inicialmente)
log_info "Testing GET /api/rooms (empty list)"
make_request "GET" "/api/rooms" "" "$token" "200"

# 4. Criar sala pública
log_info "Testing POST /api/rooms (public room)"
public_room_data='{
    "name": "Sala Pública Teste",
    "isPrivate": false,
    "maxPlayers": 10,
    "maxSpectators": 3
}'
response=$(make_request "POST" "/api/rooms" "$public_room_data" "$token" "201")
public_room_id=$(echo "$response" | jq -r '.data.room.id' 2>/dev/null)
log_success "Created public room: $public_room_id"

# 5. Criar sala privada
log_info "Testing POST /api/rooms (private room)"
private_room_data='{
    "name": "Sala Privada Teste",
    "isPrivate": true,
    "maxPlayers": 8,
    "maxSpectators": 2
}'
response=$(make_request "POST" "/api/rooms" "$private_room_data" "$token" "201")
private_room_id=$(echo "$response" | jq -r '.data.room.id' 2>/dev/null)
private_room_code=$(echo "$response" | jq -r '.data.room.code' 2>/dev/null)
log_success "Created private room: $private_room_id with code: $private_room_code"

# 6. Testar listagem de salas (agora com salas)
log_info "Testing GET /api/rooms (with rooms)"
response=$(make_request "GET" "/api/rooms" "" "$token" "200")
rooms_count=$(echo "$response" | jq -r '.data.total' 2>/dev/null)
log_success "Found $rooms_count public rooms"

# 7. Testar detalhes da sala
log_info "Testing GET /api/rooms/:id"
make_request "GET" "/api/rooms/$public_room_id" "" "$token" "200"

# 8. Criar segundo usuário para testar join
log_info "Creating second test user..."
user2_data='{
    "email": "testuser2@rooms.com",
    "username": "RoomTester2",
    "password": "Test123!",
    "confirmPassword": "Test123!"
}'
response=$(make_request "POST" "/api/auth/register" "$user2_data" "" "201" 2>/dev/null || echo "")
if [ -z "$response" ]; then
    login_data='{
        "email": "testuser2@rooms.com",
        "password": "Test123!"
    }'
    response=$(make_request "POST" "/api/auth/login" "$login_data" "" "200")
fi
token2=$(echo "$response" | jq -r '.data.accessToken' 2>/dev/null)
log_success "Got second user token"

# 9. Testar join na sala pública
log_info "Testing POST /api/rooms/:id/join (public room)"
join_data='{"asSpectator": false}'
make_request "POST" "/api/rooms/$public_room_id/join" "$join_data" "$token2" "200"

# 10. Testar join como espectador
log_info "Testing POST /api/rooms/:id/join (as spectator)"
join_spectator_data='{"asSpectator": true}'
make_request "POST" "/api/rooms/$public_room_id/join" "$join_spectator_data" "$token2" "200"

# 11. Testar join por código
log_info "Testing POST /api/rooms/join-by-code"
join_by_code_data="{\"code\": \"$private_room_code\", \"asSpectator\": false}"
make_request "POST" "/api/rooms/join-by-code" "$join_by_code_data" "$token2" "200"

# 12. Testar tentativa de criar sala duplicada (host já tem sala)
log_info "Testing duplicate room creation (should fail)"
duplicate_room_data='{
    "name": "Sala Duplicada",
    "isPrivate": false
}'
make_request "POST" "/api/rooms" "$duplicate_room_data" "$token" "409"

# 13. Testar sala não encontrada
log_info "Testing room not found"
make_request "GET" "/api/rooms/non-existent-id" "" "$token" "404"

# 14. Testar código inválido
log_info "Testing invalid room code"
invalid_code_data='{"code": "999999"}'
make_request "POST" "/api/rooms/join-by-code" "$invalid_code_data" "$token2" "404"

# 15. Testar deletar sala (apenas host pode)
log_info "Testing DELETE /api/rooms/:id (non-host should fail)"
make_request "DELETE" "/api/rooms/$public_room_id" "" "$token2" "403"

log_info "Testing DELETE /api/rooms/:id (host should succeed)"
make_request "DELETE" "/api/rooms/$public_room_id" "" "$token" "200"

# 16. Verificar que sala foi deletada
log_info "Testing deleted room access"
make_request "GET" "/api/rooms/$public_room_id" "" "$token" "404"

echo ""
echo -e "${GREEN}🎉 ALL ROOM API TESTS COMPLETED!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}📋 Test Summary:${NC}"
echo "✅ Health check"
echo "✅ User authentication"
echo "✅ List rooms (empty and with data)"
echo "✅ Create public room"
echo "✅ Create private room with code"
echo "✅ Get room details"
echo "✅ Join room by ID"
echo "✅ Join room as spectator"
echo "✅ Join room by code"
echo "✅ Prevent duplicate room creation"
echo "✅ Handle room not found"
echo "✅ Handle invalid room code"
echo "✅ Delete room permissions"
echo "✅ Verify room deletion"
echo ""
echo -e "${GREEN}🚀 Room API is working perfectly!${NC}"