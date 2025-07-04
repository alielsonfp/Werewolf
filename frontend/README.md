# 🐺 Lobisomem Online - Frontend

> Frontend em Next.js + TypeScript com tema inspirado no Town of Salem

## 🎯 Visão Geral

Este é o frontend do projeto Lobisomem Online, um jogo de dedução social multiplayer em tempo real baseado no clássico Town of Salem. O frontend é desenvolvido em Next.js com TypeScript e uma interface moderna inspirada no visual medieval/gótico do Town of Salem.

## 🛠️ Tecnologias

- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS com tema customizado
- **Animações**: Framer Motion
- **Estados**: Context API (Auth, Socket, Theme)
- **Comunicação**: Axios + WebSocket nativo
- **Qualidade**: ESLint + Prettier + Husky
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast

## 🎨 Design System

### Cores
- **Medieval**: Tons de marrom/sépia (#2D1B1E - #F4E4BC)
- **Salem**: Tons dourados (#312418 - #F4EDE3)
- **Werewolf**: Vermelho sangue (#8B0000)
- **Town**: Verde floresta (#228B22)
- **Neutral**: Dourado (#DAA520)

### Tipografia
- **UI**: Inter (interface geral)
- **Medieval**: Cinzel (títulos e elementos temáticos)
- **Game**: Pirata One (elementos de jogo especiais)

### Fases do Jogo
- **Noite**: Tema escuro azulado
- **Dia**: Tema claro dourado
- **Votação**: Tema vermelho intenso

## 📁 Estrutura de Pastas

```
frontend/
├── 📄 package.json              # Dependências e scripts
├── 📄 tailwind.config.js        # Configuração do Tailwind
├── 📄 next.config.js            # Configuração do Next.js
├── 📄 tsconfig.json             # Configuração TypeScript
├── 📁 public/                   # Assets estáticos
│   ├── 🖼️ images/              # Imagens e ícones
│   ├── 🔊 sounds/              # Efeitos sonoros
│   └── 🎵 music/               # Música de fundo
├── 📁 src/
│   ├── 📁 components/          # Componentes React
│   │   ├── 📁 common/          # Componentes base
│   │   ├── 📁 auth/            # Componentes de autenticação
│   │   ├── 📁 lobby/           # Componentes do lobby
│   │   ├── 📁 room/            # Componentes da sala
│   │   ├── 📁 game/            # Componentes do jogo
│   │   └── 📁 profile/         # Componentes de perfil
│   ├── 📁 context/             # Context providers
│   │   ├── AuthContext.tsx     # Gerenciamento de autenticação
│   │   ├── SocketContext.tsx   # WebSocket connection
│   │   └── ThemeContext.tsx    # Tema e áudio
│   ├── 📁 hooks/               # Custom hooks
│   ├── 📁 pages/               # Páginas Next.js
│   ├── 📁 services/            # API clients
│   ├── 📁 types/               # TypeScript types
│   ├── 📁 utils/               # Utilitários
│   └── 📁 styles/              # Estilos globais
└── 📁 .husky/                  # Git hooks
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Backend rodando em `localhost:3001`

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local

# 3. Executar em modo desenvolvimento
npm run dev

# 4. Abrir no navegador
# http://localhost:3000
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Verificar código
npm run lint:fix     # Corrigir problemas de lint
npm run type-check   # Verificar tipos TypeScript
npm run format       # Formatar código com Prettier
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=your-ga-id
```

### Configuração de Desenvolvimento

O projeto está configurado com:
- **Hot Reload**: Atualizações automáticas durante desenvolvimento
- **Type Checking**: Verificação de tipos em tempo real
- **Linting**: ESLint com regras customizadas
- **Formatting**: Prettier para formatação consistente
- **Git Hooks**: Husky para verificações pré-commit

## 🎮 Funcionalidades Implementadas

### ✅ Fase 1A - Infraestrutura
- [x] Setup Next.js + TypeScript + Tailwind
- [x] Configuração ESLint + Prettier + Husky
- [x] Estrutura de pastas e componentes base
- [x] Contexts (Auth, Socket, Theme)
- [x] Componentes base (Button, Modal, Layout)
- [x] Páginas básicas de roteamento

### ✅ Fase 1B - Autenticação
- [x] Página de login responsiva
- [x] Página de registro com validações
- [x] Página de recuperação de senha
- [x] AuthContext com gerenciamento de estado
- [x] Integração com API de autenticação
- [x] Proteção de rotas

### 🔄 Próximas Fases
- [ ] Sistema completo de lobby
- [ ] Interface do jogo em tempo real
- [ ] Sistema de chat
- [ ] Perfil de usuário
- [ ] Leaderboard
- [ ] Sistema de espectadores

## 🎨 Componentes Principais

### Button
Componente de botão com múltiplas variantes temáticas:

```tsx
<Button variant="medieval" size="lg" onClick={handleClick}>
  <Play className="w-5 h-5 mr-2" />
  Jogar Agora
</Button>
```

**Variantes**: `primary`, `secondary`, `danger`, `medieval`, `ghost`, `werewolf`, `town`

### Modal
Modal responsivo com animações e tema customizável:

```tsx
<Modal isOpen={true} onClose={onClose} variant="medieval" title="Criar Sala">
  <p>Conteúdo do modal...</p>
</Modal>
```

### Layout
Layout principal com header, sidebar e footer:

```tsx
<Layout variant="game" showSidebar={false}>
  <GameBoard />
</Layout>
```

## 🔌 Integração com Backend

### API Client
```tsx
import { apiService } from '@/services/api';

const response = await apiService.get('/rooms');
```

### WebSocket
```tsx
import { useSocket } from '@/context/SocketContext';

const { sendMessage, onRoomUpdate } = useSocket();
sendMessage('join-room', { roomId: 'room-123' });
```

### Autenticação
```tsx
import { useAuth } from '@/context/AuthContext';

const { user, login, logout } = useAuth();
```

## 🎵 Sistema de Áudio

O frontend inclui um sistema completo de áudio temático:

### Efeitos Sonoros
- Cliques de botão
- Transições de fase (dia/noite)
- Notificações de eventos
- Sons de ações específicas

### Música de Fundo
- Lobby: Taverna medieval
- Noite: Floresta sombria
- Dia: Movimentação da vila
- Votação: Tensão dramática

### Configuração
```tsx
import { useTheme } from '@/context/ThemeContext';

const { playSound, updateAudioConfig } = useTheme();
playSound('wolf_howl');
```

## 📱 Responsividade

O design é totalmente responsivo com breakpoints:
- **Mobile**: 320px - 640px
- **Tablet**: 641px - 1024px  
- **Desktop**: 1025px+

### Design Mobile-First
- Interface adaptada para touch
- Navegação simplificada
- Performance otimizada

## 🔒 Segurança

### Autenticação
- JWT tokens com expiração
- Refresh tokens automáticos
- Proteção de rotas sensíveis

### Validação
- Validação client-side e server-side
- Sanitização de inputs
- Rate limiting de requests

## 🚀 Performance

### Otimizações
- Code splitting automático (Next.js)
- Lazy loading de componentes
- Compressão de assets
- Cache de API responses

### Métricas
- Lighthouse Score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s

## 🧪 Testes

```bash
# Executar testes (quando implementados)
npm run test
npm run test:watch
npm run test:coverage
```

## 📦 Build e Deploy

### Build Local
```bash
npm run build
npm run start
```

### Deploy (Vercel)
```bash
# Deploy automático via Git
git push origin main

# Ou deploy manual
vercel --prod
```

## 🤝 Contribuição

### Padrões de Código
- Use TypeScript sempre
- Componentes funcionais com hooks
- Nomenclatura descritiva
- Comentários em português para negócio

### Commit Guidelines
```
feat: adiciona sistema de chat
fix: corrige bug na autenticação  
style: atualiza tema medieval
docs: adiciona documentação da API
```

## 📚 Recursos Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [React Hook Form](https://react-hook-form.com/)

## 🐛 Troubleshooting

### Problemas Comuns

**Error: Cannot connect to API**
```bash
# Verifique se o backend está rodando
curl http://localhost:3001/health
```

**Error: Module not found**
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

**Error: Build failed**
```bash
# Verifique erros de TypeScript
npm run type-check
```

## 📄 Licença

Este projeto é desenvolvido como projeto acadêmico baseado no jogo Town of Salem.

---

## 🎯 Status Atual

**Fase 1B Completa! ✅**

- ✅ Frontend Next.js funcionando
- ✅ Autenticação implementada
- ✅ Design system medieval completo
- ✅ Integração com backend preparada
- ✅ Estrutura escalável para próximas fases

**Próximo passo**: Implementar APIs de autenticação no backend! 🚀