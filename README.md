# Werewolf Online - Plataforma de Jogos Multiplayer em Tempo Real

Uma implementacao completa do classico jogo de deducao social "Lobisomem" (baseado em Town of Salem) com arquitetura moderna e escalavel.

## Sobre o Projeto

Este projeto foi desenvolvido como parte do **Desafio Relampago 4 - Plataforma de Jogos Multiplayer em Tempo Real**, focando na criacao de uma aplicacao web full-stack robusta e escalavel para jogos de turno e acao discreta.

### Objetivos de Aprendizado

- Desenvolver aplicacao web completa com frontend e backend desacoplados
- Implementar comunicacao em tempo real usando WebSockets
- Projetar arquitetura escalavel horizontalmente com microservicos
- Desenvolver backend robusto em TypeScript com Node.js
- Implementar autenticacao segura com JWT
- Containerizar aplicacao com Docker

## Como Jogar

**Werewolf** e um jogo de deducao social onde jogadores assumem papeis secretos e tentam eliminar uns aos outros atraves de estrategia, blefe e investigacao.

### Faccoes

- **Vila**: Eliminar todos os Lobisomens e inimigos
- **Lobisomens**: Igualar ou superar o numero da Vila
- **Neutros**: Objetivos unicos especificos

### Roles Principais

| Role | Faccao | Habilidade |
|------|--------|------------|
| **Sheriff** | Vila | Investiga 1 pessoa por noite (SUSPEITO/NAO SUSPEITO) |
| **Doctor** | Vila | Protege 1 pessoa por noite da morte |
| **Vigilante** | Vila | Mata 1 pessoa por noite (3 usos maximo) |
| **Villager** | Vila | Apenas voto durante o dia |
| **Werewolf King** | Lobisomem | Lider da alcateia, imune a investigacao |
| **Werewolf** | Lobisomem | Vota em quem matar durante a noite |
| **Jester** | Neutro | Vence se for executado durante o dia |
| **Serial Killer** | Neutro | Vence sendo o ultimo sobrevivente |

### Composicoes Balanceadas

- **6 Players**: 1 Lobisomem, 1 Sheriff, 1 Doctor, 3 Villagers
- **9 Players**: 2 Lobisomens, 1 Jester, 1 Sheriff, 1 Doctor, 1 Vigilante, 3 Villagers
- **12 Players**: 3 Lobisomens, 1 Jester, 1 Sheriff, 1 Doctor, 1 Vigilante, 5 Villagers
- **15 Players**: 4 Lobisomens, 1 Jester, 1 Serial Killer, 1 Sheriff, 1 Doctor, 1 Vigilante, 6 Villagers

## Arquitetura

### MVP Funcional (Atual)
```
werewolf-online/
├── frontend/          # Next.js + TypeScript + Tailwind 
├── backend/           # Node.js + Express + WebSocket 
├── database/          # PostgreSQL 
├── docker-compose.dev.yml
└── README.md
```

## Stack Tecnologica

### Frontend
- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Estilizacao**: Tailwind CSS
- **UI Components**: Componentes customizados 

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Autenticacao**: JWT (JSON Web Tokens)

### Banco de Dados
- **Principal**: PostgreSQL 15

### DevOps
- **Containerizacao**: Docker + Docker Compose
- **Proxy**: NGINX 
- **Scripts**: Automacao para Windows/Linux/Mac

## Como Executar

### Pre-requisitos
- Node.js 18+
- Docker & Docker Compose
- Git

### Instalacao Rapida

#### Windows
```bash
# Clone o repositorio
git clone <repository-url>
cd werewolf-online

# Execute o script de inicializacao
start.bat
```

#### Linux/Mac
```bash
# Clone o repositorio
git clone <repository-url>
cd werewolf-online

# De permissao e execute
chmod +x start.sh
./start.sh
```

### Usando Docker (Recomendado)

```bash
# Iniciar ambiente completo
npm run dev:docker

# Ver logs
npm run dev:logs

# Parar servicos
npm run dev:down

# Limpar volumes (reset completo)
npm run dev:clean
```

### Desenvolvimento Local

```bash
# Instalar dependencias
npm run install:all

# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Endpoints e Servicos

### Aplicacao
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Banco de Dados
- **PostgreSQL**: localhost:5432
  - Database: `werewolf`
  - User: `werewolf`
  - Password: `werewolf123`
- **Redis**: localhost:6379

### API Principal

#### Autenticacao
```http
POST /api/auth/register    # Cadastro de usuario
POST /api/auth/login       # Login
GET  /api/auth/profile     # Perfil do usuario
```

#### Salas
```http
GET    /api/rooms          # Listar salas publicas
POST   /api/rooms          # Criar sala
POST   /api/rooms/join     # Entrar por codigo
DELETE /api/rooms/:id      # Deletar sala (host only)
```

#### WebSocket
```javascript
// Conectar ao jogo
const socket = io('http://localhost:3001', {
  auth: { token: 'jwt-token' }
});

// Eventos principais
socket.on('gameStateUpdate', handleGameUpdate);
socket.on('phaseChange', handlePhaseChange);
socket.on('playerAction', handlePlayerAction);
```

## Features Implementadas

### Infraestrutura 
- [x] Docker Compose funcional
- [x] PostgreSQL + Redis conectados
- [x] Backend TypeScript + Express
- [x] Health checks automaticos
- [x] Scripts de automacao

### Frontend 
- [x] Interface moderna e responsiva
- [x] Sistema de design consistente
- [x] Componentes acessiveis
- [x] Animacoes suaves
- [x] TypeScript 100% tipado

### Backend (85%)
- [x] API REST completa
- [x] WebSocket integrado
- [x] Sistema de salas
- [x] Engine do jogo completo
- [x] Autenticacao JWT
- [x] Validacoes robustas

### Funcionalidades Extras
- [x] Sistema de chat em tempo real
- [x] Salas publicas e privadas (codigo 6 digitos)
- [x] Reconexao automatica
- [x] Votacao interativa

## Status Atual (Julho 2025)

### Progresso Geral: ~87%

| Componente | Status | 
|-----------|--------|
| **Infraestrutura** | Completo |
| **Database Schema** | Completo |
| **Game Engine** | Completo |
| **WebSocket** | Completo |
| **Frontend Base** | Completo |
| **Backend API** | Completo |
| **Integracao** | Completo |


## Equipe de Desenvolvimento

**Equipe 4:**
- Alielson Pequeno
- Rafael Arati  

## Comandos Uteis

### Docker
```bash
# Verificar logs especificos
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f postgres

# Executar comandos no container
docker-compose -f docker-compose.dev.yml exec backend npm run dev
docker-compose -f docker-compose.dev.yml exec postgres psql -U werewolf -d werewolf

# Reset completo do banco (se necessario)
cd backend
npx prisma db push --force-reset
npx prisma db seed
```

### Desenvolvimento
```bash
# Instalar dependencias
npm run install:all

# Build de todos os projetos
npm run build:all

# Lint em todos os projetos
npm run lint:all

# Testes (quando implementados)
npm run test:all
```

### Troubleshooting
```bash
# Windows - Script de correcao rapida
quick-fix.bat

# Verificar saude dos servicos
curl http://localhost:3001/health
curl http://localhost:3000/api/health
```


## Licenca

Este projeto foi desenvolvido para fins academicos como parte do **Desafio Relampago 4** do curso de desenvolvimento web Alpha Edtech.

---

*Ultima atualizacao: Julho 2025*
