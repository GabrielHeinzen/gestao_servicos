# Gestão de Serviços

Aplicativo de uso local para acompanhar serviços em produção e administrar clientes, romaneios, notas fiscais, despesas e relatórios financeiros.

## Aplicativo Windows sem Docker

Execute o instalador `Setup.exe` da versão para **Windows x64** e abra **Gestão de Serviços** pelo menu Iniciar. O aplicativo já inclui a interface React, a API Express e o PostgreSQL 16. Na primeira abertura, ele cria uma base de dados vazia. O Electron inicia a API e o banco ao abrir o aplicativo e os encerra ao fechar.

### Login local

- Usuário `Gustavo Dums`
- Senha predefinida `#12345`

Use essas credenciais para entrar diretamente. Não há cadastro público nem troca de senha na interface. Ao atualizar da versão 1.0.6, a senha personalizada é substituída pela predefinida, sem alterar os demais dados.

A API valida o login, guarda apenas o hash da senha no PostgreSQL e limita as tentativas. Cada execução aceita uma sessão ativa por vez. A sessão termina ao sair, ao fechar o aplicativo ou após oito horas. **Lembrar usuário** guarda apenas o nome. A senha predefinida é para uso local e individual. É possível substituí-la com `GESTAO_SENHA` no ambiente do processo ou no `.env` do Compose.

Na versão desktop, a API e o PostgreSQL escutam apenas em `127.0.0.1`, e o Electron encaminha as chamadas à API com uma chave gerada a cada execução. A proteção dos arquivos depende das permissões no Windows. Consulte a [ADR-002](docs/adr/ADR-002-execucao-local.pdf) para entender os limites dessa configuração.

### Dados e backups

Os dados da versão desktop ficam em `%LOCALAPPDATA%\GestaoServicosDados` no perfil do usuário do Windows. Para fazer backup, feche o aplicativo e copie a pasta inteira. A base do Electron é separada do volume do Docker Compose. Para investigar falhas de inicialização do PostgreSQL, consulte `postgresql.log` nessa pasta, quando disponível.

As migrações SQL em `backend/migrations/` são aplicadas antes de a API abrir, tanto no Electron quanto no ambiente web. Elas preservam os registros existentes e anotam cada versão em `migracoes_aplicadas`. Faça um backup antes de instalar uma atualização.

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
- **Financeiro** reúne romaneios e notas fiscais. O resumo de cada aba soma os valores do mês atual, e a tabela mantém todo o histórico. A NF aceita uma descrição opcional. Ao marcar um serviço como **Pronto**, o aplicativo pede o valor final, mostra esse valor na Produção e cria um romaneio automático com a data da conclusão. Reabrir ou cancelar o serviço retira o romaneio automático do faturamento.
- Em **Gastos / Despesas**, cada lançamento registra documento, empresa, data de compra e valor. A tela mostra os totais do mês e do ano atuais pela data de compra e mantém todos os lançamentos na tabela.
- Os **relatórios** têm visões de NF, Romaneio e Geral, com gráficos mensais e anuais. A visão Geral inclui faturamento, despesas e lucro. O gráfico **Despesas por mês** mostra os gastos de janeiro a dezembro do ano selecionado.

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

Use Node.js 22.12 ou superior e uma base PostgreSQL **16 ou superior** já criada. O usuário do banco precisa de permissão para criar e alterar as tabelas do aplicativo. Instale as dependências a partir da raiz do repositório.

```powershell
npm --prefix backend ci
npm --prefix frontend ci
```

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no terminal do backend para apontar para a sua base. Depois execute `npm --prefix backend run dev` nesse terminal e `npm --prefix frontend run dev` em outro.

O Vite abre em `http://localhost:5173` e encaminha `/api` para `http://127.0.0.1:3000`. Verifique o backend em `http://127.0.0.1:3000/health`.

## Verificações do projeto

```powershell
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

`npm --prefix backend run test:integracao` verifica o login, as migrações e a geração de romaneios usando PostgreSQL real. No Windows, com as dependências de `backend/` e `desktop/` instaladas, a suíte usa o PostgreSQL incluído no Electron e uma base temporária. Em outros ambientes, defina `GESTAO_TEST_DB_URL` para uma base de teste PostgreSQL 16+ com permissão para criar schemas. A suíte cria e remove schemas isolados.

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
