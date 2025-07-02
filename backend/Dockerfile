# 🐺 LOBISOMEM ONLINE - Development Dockerfile (SOLUÇÃO ROBUSTA)
FROM node:18 AS development

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
  dumb-init \
  git \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# 🎯 CHAVE: Copiar arquivos do monorepo corretamente
# Agora o contexto é a raiz, então temos acesso a tudo
COPY package*.json ./
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/

# 🚀 SOLUÇÃO: Instalar apenas dependências do backend via workspaces
RUN npm install --workspace=backend

# Copy backend source code
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma

# Generate Prisma client
RUN cd backend && npx prisma generate

# Change to backend directory for execution
WORKDIR /app/backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Development command with hot reload
CMD ["npm", "run", "dev"]