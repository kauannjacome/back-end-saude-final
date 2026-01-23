# Docker Setup Guide

Este guia explica como executar a aplicação usando Docker e Docker Compose.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

## Configuração Rápida

### 1. Iniciar os Serviços

```powershell
# Construir e iniciar todos os serviços (PostgreSQL + Backend)
docker-compose up -d

# Verificar se os containers estão rodando
docker-compose ps
```

### 2. Executar Migrações do Banco de Dados

```powershell
# Aplicar migrações do Prisma
docker-compose exec backend npx prisma migrate deploy

# (Opcional) Popular o banco com dados iniciais
docker-compose exec backend npm run prisma db seed
```

### 3. Verificar a Aplicação

A aplicação estará disponível em: http://localhost:3000

Verificar saúde da API:
```powershell
curl http://localhost:3000/health
```

## Comandos Úteis

### Visualizar Logs

```powershell
# Logs de todos os serviços
docker-compose logs -f

# Logs apenas do backend
docker-compose logs -f backend

# Logs apenas do PostgreSQL
docker-compose logs -f postgres
```

### Parar os Serviços

```powershell
# Parar sem remover volumes (dados persistem)
docker-compose down

# Parar e remover volumes (limpa o banco de dados)
docker-compose down -v
```

### Reconstruir a Aplicação

```powershell
# Reconstruir após mudanças no código
docker-compose up -d --build

# Forçar reconstrução completa
docker-compose build --no-cache
docker-compose up -d
```

### Acessar o Container

```powershell
# Acessar shell do backend
docker-compose exec backend sh

# Acessar PostgreSQL
docker-compose exec postgres psql -U saude -d saude_db
```

### Executar Comandos Prisma

```powershell
# Gerar Prisma Client
docker-compose exec backend npx prisma generate

# Criar nova migração
docker-compose exec backend npx prisma migrate dev --name nome_da_migracao

# Visualizar banco de dados no Prisma Studio
docker-compose exec backend npx prisma studio
```

## Estrutura dos Serviços

### PostgreSQL
- **Container**: `saude-postgres`
- **Porta**: 5432
- **Usuário**: saude
- **Senha**: saude123
- **Database**: saude_db
- **Volume**: `postgres_data` (dados persistentes)

### Backend (NestJS)
- **Container**: `saude-backend`
- **Porta**: 3000
- **Depende de**: PostgreSQL
- **Healthcheck**: `/health` endpoint

## Variáveis de Ambiente

As variáveis de ambiente para Docker estão em `.env.docker`. As principais configurações:

- `DATABASE_URL`: Conexão com PostgreSQL do container
- `AWS_*`: Credenciais AWS para S3
- `JWT_*`: Configurações de autenticação
- `EMAIL_*`: Configurações de email
- `EVOLUTION_API_*`: Integração WhatsApp

## Troubleshooting

### Container não inicia

```powershell
# Verificar logs de erro
docker-compose logs backend

# Verificar se a porta 3000 está em uso
netstat -ano | findstr :3000
```

### Erro de conexão com banco de dados

```powershell
# Verificar se o PostgreSQL está saudável
docker-compose ps

# Reiniciar apenas o PostgreSQL
docker-compose restart postgres

# Verificar logs do PostgreSQL
docker-compose logs postgres
```

### Limpar tudo e recomeçar

```powershell
# Parar e remover tudo
docker-compose down -v

# Remover imagens
docker rmi saude-backend

# Reconstruir do zero
docker-compose up -d --build
```

### Problemas com Prisma

```powershell
# Regenerar Prisma Client
docker-compose exec backend npx prisma generate

# Resetar banco de dados (CUIDADO: apaga todos os dados)
docker-compose exec backend npx prisma migrate reset
```

## Desenvolvimento vs Produção

### Desenvolvimento (atual)
- Usa `docker-compose.yml`
- PostgreSQL local no container
- Hot reload não habilitado (requer rebuild)

### Produção
- Use apenas o `Dockerfile` para build
- Configure `DATABASE_URL` para banco de produção
- Não use `docker-compose.yml` em produção

## Segurança

> [!WARNING]
> As credenciais em `.env.docker` são para desenvolvimento local apenas. **NUNCA** use essas credenciais em produção!

Para produção:
1. Use variáveis de ambiente seguras
2. Altere todas as senhas
3. Use secrets management (AWS Secrets Manager, etc.)
4. Configure SSL/TLS para conexões de banco de dados

## Performance

### Otimizações aplicadas:
- ✅ Multi-stage build (imagem final menor)
- ✅ Prisma Client gerado em produção
- ✅ Usuário não-root para segurança
- ✅ Health checks configurados
- ✅ Volumes para persistência de dados
- ✅ Network isolada para serviços

### Tamanho da imagem:
```powershell
docker images saude-backend
```

Esperado: ~200-300MB (Alpine-based)
