# Gestão de Serviços

Aplicativo de uso local para acompanhar serviços em produção e administrar clientes, romaneios, notas fiscais, despesas e relatórios financeiros.

## Aplicativo Windows sem Docker

Execute o instalador `Setup.exe` da versão para **Windows x64** e abra **Gestão de Serviços** pelo menu Iniciar. O aplicativo já inclui a interface React, a API Express e o PostgreSQL 16. Na primeira abertura, ele cria uma base de dados vazia. O Electron inicia a API e o banco ao abrir o aplicativo e os encerra ao fechar.

### Login local

- Usuário `Gustavo Dums`
- Senha `#12345`

O login fixo é validado na interface. Na versão desktop, a API e o PostgreSQL escutam apenas em `127.0.0.1`, e o Electron encaminha as chamadas à API com uma chave gerada a cada execução. A proteção dos arquivos depende das permissões no Windows. Consulte a [ADR-002](docs/adr/ADR-002-execucao-local.pdf) para entender os limites dessa configuração.

### Dados e backups

Os dados da versão desktop ficam em `%LOCALAPPDATA%\GestaoServicosDados` no perfil do usuário do Windows. Para fazer backup, feche o aplicativo e copie a pasta inteira. A base do Electron é separada do volume do Docker Compose. Para investigar falhas de inicialização do PostgreSQL, consulte `postgresql.log` nessa pasta, quando disponível.

### Gerar o instalador

Em uma máquina Windows x64 com **Node.js 22.12 ou superior** e npm, use os comandos abaixo na raiz do repositório.

```powershell
npm --prefix frontend ci
npm --prefix desktop ci
npm --prefix desktop run make
```

O Electron Forge gera o `Setup.exe` em `desktop/out/make/squirrel.windows/x64/`. O build padrão gera um instalador sem assinatura digital. Para abrir a versão desktop em desenvolvimento após instalar as dependências, execute `npm --prefix desktop start`.

## O que faz

- **Produção** permite cadastrar serviços com cliente, tipo de lâmina, data e observações. O status **Atrasado** aparece no oitavo dia útil após a data do serviço. A contagem considera segunda a sexta, sem descontar feriados. É possível marcar o serviço como **Pronto**, **Coletado** ou **Cancelado**.
- **Clientes** reúne os cadastros de empresas usados na Produção e nos lançamentos financeiros.
- **Financeiro** reúne romaneios e notas fiscais. Ao marcar um serviço como **Pronto**, o aplicativo pede o valor final, mostra esse valor na Produção e cria um romaneio automático com a data da conclusão. Reabrir ou cancelar o serviço retira o romaneio automático do faturamento.
- Em **Gastos e despesas**, cada lançamento registra documento, empresa, data de compra e valor.
- Os **relatórios** têm visões de NF, Romaneio e Geral, com gráficos mensais e anuais. A visão Geral inclui faturamento, despesas e lucro.

### Vínculo entre romaneio e NF

Ao cadastrar ou editar uma nota fiscal, o campo **Romaneio vinculado** sugere os romaneios disponíveis do mesmo cliente e valor, mostrando suas datas. Uma NF avulsa pode ser registrada com o campo em branco.

No relatório **Geral**, o par vinculado entra uma vez, na data da NF, inclusive quando os documentos foram lançados em meses ou anos diferentes. Os relatórios separados mostram cada documento na própria data. Os registros anteriores à atualização mantêm a comparação por cliente, data e valor até a revisão do vínculo. Veja a [ADR-001](docs/adr/ADR-001-vinculo-romaneio-nf.pdf).

## Desenvolvimento web

### Com Docker Compose

Abra o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e suba os serviços a partir da raiz do repositório.

```powershell
docker compose up --build -d
```

A interface fica em `http://localhost:5173`. O Nginx encaminha `/api` à API dentro da rede do Compose. O PostgreSQL fica disponível na porta **5433** da própria máquina. Os dados persistem no volume `postgres_data` após `docker compose down`.

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

Para configurar portas ou credenciais, copie `.env.example` para `.env` na raiz. Use `APP_PORT` e `POSTGRES_PORT` para resolver conflitos de porta. As variáveis `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` configuram a criação da base. Alterar essas variáveis após a criação do volume exige ajustar as credenciais no PostgreSQL. O endpoint `http://localhost:5173/api/health` verifica a conexão da API com o banco.

### Com PostgreSQL local

Use Node.js 22.12 ou superior e uma base PostgreSQL já criada. Instale as dependências a partir da raiz do repositório.

```powershell
npm --prefix backend ci
npm --prefix frontend ci
```

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no terminal do backend para apontar para a sua base. Depois execute `npm --prefix backend run dev` nesse terminal e `npm --prefix frontend run dev` em outro.

O Vite abre em `http://localhost:5173` e encaminha `/api` para `http://localhost:3000`. Verifique o backend em `http://localhost:3000/health`. A API prepara as tabelas no primeiro acesso às respectivas rotas.

## Verificações do projeto

```powershell
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Decisões arquitetônicas

- [ADR-001 · Vínculo entre romaneio e nota fiscal](docs/adr/ADR-001-vinculo-romaneio-nf.pdf)
- [ADR-002 · Execução local com Electron](docs/adr/ADR-002-execucao-local.pdf)

## Estrutura

```text
frontend/      Interface React compilada com Vite
backend/       API Express e acesso ao PostgreSQL com pg
desktop/       Aplicativo Electron e empacotamento para Windows
docs/adr/      Registros de decisão arquitetônica em PDF
compose.yaml   Ambiente web local com Docker Compose e Nginx
.env.example   Configuração de exemplo para o Compose
```
