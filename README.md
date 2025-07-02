# 🐺 LOBISOMEM ONLINE

> Jogo de dedução social multiplayer em tempo real

## 🚀 Como Rodar

### Windows (Mais Fácil)
```bash
# 1. Clone o projeto
git clone [url-do-repo]
cd werewolf-online

# 2. Execute o script
 .\docker-start.bat
```

### Linux/Mac
```bash
# 1. Clone o projeto
git clone [url-do-repo]
cd werewolf-online

# 2. Torne o script executável e execute
chmod +x start.sh
./start.sh
```

### Manual (Qualquer SO)
```bash
# 1. Instalar dependências
npm install

# 2. Subir containers Docker
npm run dev
```

## ✅ Verificar se Funcionou

Acesse no navegador: **http://localhost:3001/health**

Se aparecer uma resposta JSON com `"status": "healthy"`, está funcionando! 🎉

## 🔧 Comandos Úteis

```bash
# Ver logs do backend
npm run dev:logs

# Parar tudo
npm run dev:down

# Se der problema, use o fix
quick-fix.bat
```

## 📋 Portas Usadas

- **3001** - Backend API
- **5432** - PostgreSQL
- **6379** - Redis

## 🆘 Problemas Comuns

**Docker não sobe?**
- Execute `quick-fix.bat`

**Porta ocupada?**
- Pare outros projetos: `docker-compose down`

**Erro de permissão no Linux?**
- Execute: `sudo chmod +x start.sh`

---

**Status Atual:** ✅ Infraestrutura funcionando | 🔄 Próximo: Frontend React