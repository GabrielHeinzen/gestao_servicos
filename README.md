# Gestao de Servicos

Sistema local para acompanhar a producao e os lancamentos financeiros de uma empresa. A interface foi feita para uso em computador, com acesso por login fixo e sem criacao de contas.

## O que faz

- **Producao:** cadastro de lotes com cliente, tipo de lamina e data; edicao, exclusao com confirmacao e status `Em producao`, `Pronto` ou `Coletado`.
- **Financeiro:** registro de romaneios e notas fiscais (NF).
- **Gastos / Despesas:** registro de documento, empresa, data e valor.
- **Relatorios:** faturamento, despesas e lucro por mes e por ano, com graficos.

## Tecnologias

- Frontend: React, Vite e Nginx (na imagem Docker).
- Backend: Node.js, Express e `pg`.
- Banco: PostgreSQL 16.
- Execucao conjunta: Docker Compose.

## Como rodar com Docker

Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e deixe-o aberto. No terminal, na raiz deste repositorio, execute:

```powershell
docker compose up --build -d
```

Abra **http://localhost:5173**. O primeiro build pode levar alguns minutos. O Compose inicia PostgreSQL, API e interface nessa ordem e so libera a interface quando a API consegue consultar o banco.

Comandos uteis:

```powershell
docker compose ps              # Ver estado dos servicos
docker compose logs -f         # Acompanhar logs
docker compose down            # Parar sem apagar os dados
docker compose up --build -d   # Recriar apos alterar o codigo
```

Os dados ficam no volume `postgres_data` do Compose e **continuam salvos** depois de `docker compose down`. Nao use `docker compose down -v` se quiser preserva-los.

### Portas e configuracao

Por padrao, a interface usa a porta **5173**. O PostgreSQL fica disponivel na porta **5433**, acessivel apenas pela propria maquina onde o projeto estiver rodando. A API e acessada pelo frontend em `/api` e nao precisa de uma porta publica propria.

Para mudar as portas ou as credenciais de desenvolvimento, copie `.env.example` para `.env` na raiz e edite os valores antes de subir os servicos:

```powershell
Copy-Item .env.example .env
```

Variaveis disponiveis: `APP_PORT`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`. Depois de alterar `.env`, rode `docker compose up -d`. Se o volume ja tiver sido criado, mudar usuario, senha ou nome do banco no `.env` **nao** modifica automaticamente as credenciais armazenadas no PostgreSQL; use as credenciais originais ou configure a alteracao dentro do banco.

> O Compose cria um banco e volume proprios. Dados de um PostgreSQL antigo ou de outro container nao aparecem automaticamente aqui. Nao apague o banco anterior antes de migrar seus dados.

## Login

- Usuario: `Gustavo Dums`
- Senha: `#12345`

O login atual e fixo no frontend e serve apenas para o uso local previsto neste projeto. Ele **nao** e uma autenticacao segura para publicar o sistema na internet; nao exponha a aplicacao ou o banco externamente sem implementar autenticacao no backend e revisar a seguranca.

## Desenvolvimento sem Docker

Requer Node.js 22+ e PostgreSQL ativo. Instale as dependencias em dois terminais:

```powershell
cd backend
npm ci
```

```powershell
cd frontend
npm ci
```

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` para o banco desejado; sem variaveis, o backend tenta `localhost:5432`, usuario `postgres`, senha `gestao_local` e banco `gestao_servicos`. Se usar somente o banco do Compose, ele esta em `localhost:5433`. Inicie o backend e o frontend em terminais separados:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

O Vite abre em **http://localhost:5173** e encaminha `/api` para o backend em `localhost:3000`. Para verificar a conexao da API com o banco, acesse **http://localhost:3000/health**. As tabelas de producao e financeiro sao criadas automaticamente no primeiro acesso as respectivas rotas; nao ha comando de migracao ou seed neste projeto.

## Problemas comuns

- **Docker nao inicia:** confirme que o Docker Desktop esta aberto e execute `docker compose ps`.
- **Porta 5173 ou 5433 ocupada:** altere `APP_PORT` ou `POSTGRES_PORT` no `.env` e suba novamente. A URL da interface passa a usar o novo `APP_PORT`.
- **Tela sem dados:** confira `docker compose logs backend db` e `docker compose ps`. O endpoint `http://localhost:5173/api/health` deve responder com `{"status":"ok"}`.
- **Dados antigos nao aparecem:** o Compose usa um volume separado. E necessario exportar/importar os dados do banco anterior para este banco.

## Estrutura

```text
backend/       API Express e modelos PostgreSQL
frontend/      Interface React/Vite
compose.yaml   Orquestracao dos tres servicos
.env.example   Opcoes de portas e banco
```
