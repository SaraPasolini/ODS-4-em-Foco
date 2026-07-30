# ODS 4 em Foco - ENADE

## Integrantes

Sara de Almeida Passoline  
Gabriel Henrique da Silva Santos

## Professora orientadora

Juliana Santiago Teixeira

## Sobre o projeto

Este projeto implementa um pipeline para baixar, extrair e processar microdados do ENADE disponibilizados pelo INEP/MEC. O fluxo gera uma tabela agregada por ano, IES, curso, modalidade, UF e municipio, e carrega o resultado em um banco PostgreSQL hospedado no Neon para consumo em um dashboard Power BI.

O dashboard final esta salvo no repositorio em `ENAD_BI/Enad.pbix`.

## Como funciona

A arquitetura atual tem quatro etapas principais:

1. Download automatizado via Cypress: o teste `cypress/e2e/download_enade.cy.js` acessa a pagina publica de microdados do ENADE no portal do INEP, coleta os links de "microdados do enade" e chama a task `downloadFile` configurada em `cypress.config.js`. Pela configuracao atual, essa task salva os arquivos compactados em `downloads/`, na raiz do projeto.

2. Extracao dos arquivos compactados: o script `cypress/e2e/extrair_enade.js` le os arquivos compactados em `cypress/e2e/downloads`, cria uma pasta em `cypress/e2e/Enad_arquivos` para cada arquivo e extrai arquivos `.zip`, `.rar` e arquivos identificados como `.7z`. Se os arquivos tiverem sido baixados pela task do Cypress em `downloads/`, mova ou copie os compactados para `cypress/e2e/downloads` antes de executar a extracao.

3. Agregacao em memoria: o script `back-end/index.js` percorre os anos disponiveis localmente (2004-2017, 2021, 2022 e 2023) e chama as rotinas de agregacao em `back-end/processador.js`. O processamento le o arquivo `arq1` de cada ano, usa os campos necessarios (`NU_ANO`, `CO_CURSO`, `CO_IES`, `CO_UF_CURSO`, `CO_MUNIC_CURSO` e, a partir de 2010, `CO_MODALIDADE`), agrupa em memoria por essa combinacao e calcula `qtd_participantes`. Antes da carga de cada ano, a soma dos agregados e validada contra o total de linhas validas lidas.

4. Carga no PostgreSQL Neon: a funcao de agregacao cria, se necessario, a tabela `enade_agregado` e insere ou atualiza os grupos com `ON CONFLICT`. A conexao usa `db.js`, que le `DATABASE_URL` a partir do `.env`.

Os dados brutos baixados e extraidos nao fazem parte do repositorio e nao sao persistidos no banco. Eles ficam apenas localmente nas pastas de downloads/extracao e podem ser regenerados rodando o pipeline desde o inicio.

## Pre-requisitos e setup

- Node.js instalado.
- Dependencias do projeto instaladas com `npm install`.
- Cypress disponivel no projeto, instalado pelas dependencias de desenvolvimento.
- Banco PostgreSQL no Neon.
- Arquivo `.env` local com a variavel `DATABASE_URL`.

Crie o `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

Depois preencha `DATABASE_URL` com a string de conexao do Neon. O arquivo `.env` nao deve ser versionado.

## Como rodar

Instale as dependencias:

```bash
npm install
```

Baixe os microdados do ENADE via Cypress:

```bash
npx cypress run --spec cypress/e2e/download_enade.cy.js
```

Extraia os arquivos baixados:

```bash
node cypress/e2e/extrair_enade.js
```

Observacao: o extrator procura os arquivos compactados em `cypress/e2e/downloads`. A task `downloadFile` do Cypress grava em `downloads/` na raiz do projeto, entao confira o local dos arquivos antes de executar a extracao.

Crie as tabelas estruturais e a tabela agregada, sem tabela bruta:

```bash
node createAllTables.js
```

Agregue os microdados dos anos disponiveis e carregue `enade_agregado` no Neon:

```bash
node back-end/index.js
```

Carregue as tabelas de referencia de IES e municipios, quando os arquivos de referencia estiverem em `cypress/e2e/downloads`:

```bash
node scripts/import-references.js
```

## Dados levantados

A carga validada usa os microdados do ENADE disponibilizados pelo INEP/MEC.

Para 2023, o arquivo de participante/curso processado contem 406.294 registros de origem. Esses registros foram agregados em 9.812 grupos unicos pela combinacao:

- `nu_ano`
- `co_ies`
- `co_curso`
- `co_modalidade`
- `co_uf_curso`
- `co_munic_curso`

A soma de `qtd_participantes` na tabela `enade_agregado` foi validada em 406.294, exatamente o mesmo total de linhas validas da origem.

Para os anos de 2004 a 2009, os microdados levantados nao possuem o campo `CO_MODALIDADE`. Nesses anos, o pipeline grava `co_modalidade = -1` como codigo sentinela para indicar modalidade nao informada. A partir de 2010, quando `CO_MODALIDADE` existe nos arquivos, o valor original do microdado e preservado.

Tambem foram carregadas duas tabelas de referencia:

- `ies_referencia`: tabela publica do MEC/e-MEC com 4.328 IES.
- `municipio_referencia`: tabela do IBGE/DTB 2024 com 5.571 municipios.

As tabelas de referencia sao usadas para traduzir codigos em nomes legiveis. Foi confirmada correspondencia de 100% entre os codigos usados em `enade_agregado` e as tabelas de referencia:

- 1.347 IES distintas no ENADE 2023, com 1.347 matches em `ies_referencia`.
- 718 municipios distintos no ENADE 2023, com 718 matches em `municipio_referencia`.

## Como visualizar no Power BI

O dashboard esta salvo em `ENAD_BI/Enad.pbix` e possui tres paginas:

- Visao Geral: KPIs de total de participantes, IES e municipios, distribuicao por modalidade e por ano.
- Distribuicao Geografica: ranking de UFs e proporcao de IES publicas vs. privadas.
- Ranking de Instituicoes: top 15 IES por participantes, com segmentacao por categoria.

Para reabrir a conexao ao vivo no Power BI Desktop, use:

1. Obter Dados.
2. PostgreSQL.
3. Informar host, porta, banco, usuario e senha conforme a `DATABASE_URL` do `.env`.
4. Selecionar as tabelas carregadas no Neon, especialmente `enade_agregado`, `ies_referencia` e `municipio_referencia`.

Tambem e possivel abrir diretamente o arquivo `.pbix` salvo no repositorio para visualizar o dashboard ja construido.

## Aviso de seguranca

Nunca commite o arquivo `.env`. Ele contem credenciais de acesso ao banco Neon e ja esta listado no `.gitignore`.

Use `.env.example` apenas como modelo sem segredos.
