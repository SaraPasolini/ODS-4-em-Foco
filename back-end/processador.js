const fs = require('fs');
const path = require('path');
const { createExtractorFromData } = require('node-unrar-js');
const db = require('../db');

const RAIZ_PROJETO = path.join(__dirname, '..');
const PASTA_EXTRAIDOS = path.join(RAIZ_PROJETO, 'cypress', 'e2e', 'Enad_arquivos');
const PASTA_DOWNLOADS = path.join(RAIZ_PROJETO, 'cypress', 'e2e', 'downloads');
const ANOS_DISPONIVEIS = [
  2004, 2005, 2006, 2007, 2008, 2009,
  2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017,
  2021, 2022, 2023
];

const COLUNAS_RAW = [
  'nu_ano',
  'co_curso',
  'co_ies',
  'co_categad',
  'co_orgacad',
  'co_grupo',
  'co_modalidade',
  'co_munic_curso',
  'co_uf_curso',
  'co_regiao_curso'
];

const CAMPOS_BASE_AGREGACAO = [
  'NU_ANO',
  'CO_CURSO',
  'CO_IES',
  'CO_UF_CURSO',
  'CO_MUNIC_CURSO'
];

const CAMPO_MODALIDADE = 'CO_MODALIDADE';

async function inserirLote(client, lote) {
  if (!lote.length) return 0;

  const placeholders = lote.map((_, index) => {
    const start = index * COLUNAS_RAW.length + 1;
    return `(${COLUNAS_RAW.map((_, colIndex) => `$${start + colIndex}`).join(', ')})`;
  }).join(', ');

  const valores = lote.flatMap((linha) => COLUNAS_RAW.map((coluna) => linha[coluna]));

  await client.query(`
    INSERT INTO enade_raw (${COLUNAS_RAW.join(', ')})
    VALUES ${placeholders}
  `, valores);

  return lote.length;
}

async function garantirTabelaAgregada(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS enade_agregado (
      id SERIAL PRIMARY KEY,
      nu_ano INT NOT NULL,
      co_ies INT NOT NULL,
      co_curso INT NOT NULL,
      co_modalidade INT NOT NULL,
      co_uf_curso INT NOT NULL,
      co_munic_curso BIGINT NOT NULL,
      qtd_participantes BIGINT NOT NULL,
      UNIQUE (nu_ano, co_ies, co_curso, co_modalidade, co_uf_curso, co_munic_curso)
    );
  `);
}

async function inserirAgregados(client, linhasAgregadas) {
  if (!linhasAgregadas.length) return 0;

  await garantirTabelaAgregada(client);

  const colunas = ['nu_ano', 'co_ies', 'co_curso', 'co_modalidade', 'co_uf_curso', 'co_munic_curso', 'qtd_participantes'];
  const tamanhoLote = 1000;
  let inseridos = 0;

  for (let indice = 0; indice < linhasAgregadas.length; indice += tamanhoLote) {
    const lote = linhasAgregadas.slice(indice, indice + tamanhoLote);
    const placeholders = lote.map((_, index) => {
      const start = index * colunas.length + 1;
      return `(${colunas.map((_, colIndex) => `$${start + colIndex}`).join(', ')})`;
    }).join(', ');

    const valores = lote.flatMap((linha) => [
      linha.nu_ano,
      linha.co_ies,
      linha.co_curso,
      linha.co_modalidade,
      linha.co_uf_curso,
      linha.co_munic_curso,
      linha.qtd_participantes
    ]);

    await client.query(`
      INSERT INTO enade_agregado (${colunas.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT (nu_ano, co_ies, co_curso, co_modalidade, co_uf_curso, co_munic_curso)
      DO UPDATE SET qtd_participantes = EXCLUDED.qtd_participantes
    `, valores);

    inseridos += lote.length;
  }

  return inseridos;
}

function parseField(valor) {
  const valorLimpo = String(valor ?? '').trim().replace(/^"|"$/g, '');
  if (!valorLimpo) {
    return null;
  }

  const numero = Number(valorLimpo);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarCampo(campo) {
  return String(campo ?? '').replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim();
}

function transformarLinha(linha) {
  return {
    nu_ano: parseField(linha.NU_ANO),
    co_curso: parseField(linha.CO_CURSO),
    co_ies: parseField(linha.CO_IES),
    co_categad: parseField(linha.CO_CATEGAD),
    co_orgacad: parseField(linha.CO_ORGACAD),
    co_grupo: parseField(linha.CO_GRUPO),
    co_modalidade: parseField(linha.CO_MODALIDADE),
    co_munic_curso: parseField(linha.CO_MUNIC_CURSO),
    co_uf_curso: parseField(linha.CO_UF_CURSO),
    co_regiao_curso: parseField(linha.CO_REGIAO_CURSO)
  };
}

function camposObrigatoriosAno(ano) {
  if (ano >= 2004 && ano <= 2009) {
    return CAMPOS_BASE_AGREGACAO;
  }

  return [...CAMPOS_BASE_AGREGACAO, CAMPO_MODALIDADE];
}

function isArquivoAgregavel(cabecalho, ano = 2023) {
  const camposNormalizados = cabecalho.map(normalizarCampo);
  return camposObrigatoriosAno(ano).every((campo) => camposNormalizados.includes(campo));
}

function transformarLinhaAgregacao(linha, ano = 2023) {
  const registro = {
    nu_ano: parseField(linha.NU_ANO),
    co_curso: parseField(linha.CO_CURSO),
    co_ies: parseField(linha.CO_IES),
    co_uf_curso: parseField(linha.CO_UF_CURSO),
    co_munic_curso: parseField(linha.CO_MUNIC_CURSO),
    // -1 = modalidade nao informada nos microdados anteriores a 2010.
    co_modalidade: ano >= 2004 && ano <= 2009 ? -1 : parseField(linha.CO_MODALIDADE)
  };

  if ([registro.nu_ano, registro.co_curso, registro.co_ies, registro.co_modalidade, registro.co_uf_curso, registro.co_munic_curso].some((valor) => valor === null)) {
    return null;
  }

  return registro;
}

function listarArquivosRecursivo(pasta) {
  const encontrados = [];

  if (!fs.existsSync(pasta)) {
    return encontrados;
  }

  for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...listarArquivosRecursivo(caminho));
    } else {
      encontrados.push(caminho);
    }
  }

  return encontrados;
}

function encontrarArquivoArq1Extraido(ano) {
  const alvo = `microdados${ano}_arq1.txt`.toLowerCase();
  const arquivos = listarArquivosRecursivo(PASTA_EXTRAIDOS)
    .filter((arquivo) => path.basename(arquivo).toLowerCase() === alvo)
    .sort();

  return arquivos[0] ?? null;
}

async function lerArquivo2022Rar() {
  const caminhoRar = path.join(PASTA_DOWNLOADS, 'microdados_enade_2022_LGPD.rar');
  const dados = await fs.promises.readFile(caminhoRar);
  const extractor = await createExtractorFromData({ data: new Uint8Array(dados) });
  const extraidos = extractor.extract({
    files: ['Microdados_Enade_2022/DADOS/microdados2022_arq1.txt']
  });

  for (const arquivo of extraidos.files) {
    if (arquivo.extraction && path.basename(arquivo.fileHeader.name).toLowerCase() === 'microdados2022_arq1.txt') {
      return {
        nomeArquivo: arquivo.fileHeader.name,
        texto: Buffer.from(arquivo.extraction).toString('utf8')
      };
    }
  }

  throw new Error('Arquivo Microdados_Enade_2022/DADOS/microdados2022_arq1.txt nao encontrado dentro do RAR de 2022');
}

async function lerTextoAno(ano) {
  if (ano === 2022) {
    return lerArquivo2022Rar();
  }

  const caminhoArquivo = encontrarArquivoArq1Extraido(ano);
  if (!caminhoArquivo) {
    throw new Error(`Arquivo microdados${ano}_arq1.txt nao encontrado em ${PASTA_EXTRAIDOS}`);
  }

  return {
    nomeArquivo: caminhoArquivo,
    texto: await fs.promises.readFile(caminhoArquivo, 'latin1')
  };
}

function agregarTexto(texto, nomeArquivo, ano) {
  const linhas = texto.split(/\r?\n/).filter((linha) => linha.trim() !== '');
  if (linhas.length === 0) {
    throw new Error(`${nomeArquivo} esta vazio`);
  }

  const cabecalho = linhas[0].split(';').map(normalizarCampo);
  if (!isArquivoAgregavel(cabecalho, ano)) {
    throw new Error(`${nomeArquivo} nao contem todos os campos obrigatorios para ${ano}: ${camposObrigatoriosAno(ano).join(', ')}`);
  }

  const agregados = new Map();
  let lidas = 0;
  let validas = 0;
  let ignoradas = 0;

  for (const linhaTexto of linhas.slice(1)) {
    lidas++;

    const campos = linhaTexto.split(';');
    if (campos.length !== cabecalho.length) {
      ignoradas++;
      continue;
    }

    const linha = {};
    cabecalho.forEach((nomeColuna, index) => {
      linha[nomeColuna] = campos[index].trim();
    });

    const registro = transformarLinhaAgregacao(linha, ano);
    if (!registro) {
      ignoradas++;
      continue;
    }

    validas++;

    const chave = `${registro.nu_ano}|${registro.co_ies}|${registro.co_curso}|${registro.co_modalidade}|${registro.co_uf_curso}|${registro.co_munic_curso}`;
    const existente = agregados.get(chave);
    if (existente) {
      existente.qtd_participantes += 1;
    } else {
      agregados.set(chave, {
        nu_ano: registro.nu_ano,
        co_ies: registro.co_ies,
        co_curso: registro.co_curso,
        co_modalidade: registro.co_modalidade,
        co_uf_curso: registro.co_uf_curso,
        co_munic_curso: registro.co_munic_curso,
        qtd_participantes: 1
      });
    }
  }

  const linhasAgregadas = Array.from(agregados.values());
  const somaAgregados = linhasAgregadas.reduce((total, linha) => total + Number(linha.qtd_participantes), 0);

  if (somaAgregados !== validas) {
    throw new Error(`Falha na validacao de ${ano}: soma agregada ${somaAgregados} != linhas validas ${validas}`);
  }

  return {
    arquivosUsados: [nomeArquivo],
    linhasLidas: lidas,
    linhasValidas: validas,
    linhasIgnoradas: ignoradas,
    grupos: linhasAgregadas.length,
    somaAgregados,
    linhasAgregadas
  };
}

async function agregarAno(ano) {
  const { nomeArquivo, texto } = await lerTextoAno(ano);
  return agregarTexto(texto, nomeArquivo, ano);
}

async function resumoAno(client, ano) {
  const { rows } = await client.query(`
    SELECT nu_ano, COUNT(*)::bigint AS grupos, SUM(qtd_participantes)::bigint AS total_participantes
    FROM enade_agregado
    WHERE nu_ano = $1
    GROUP BY nu_ano
  `, [ano]);

  return rows;
}

async function carregarAnoEnade(ano, client) {
  await garantirTabelaAgregada(client);

  const resultado = await agregarAno(ano);
  console.log(`Arquivo usado ${ano}: ${resultado.arquivosUsados[0]}`);
  console.log(`Validacao ${ano}: lidas=${resultado.linhasLidas} | validas=${resultado.linhasValidas} | ignoradas=${resultado.linhasIgnoradas} | grupos=${resultado.grupos} | soma_agregada=${resultado.somaAgregados}`);

  const existentes = await client.query('SELECT COUNT(*)::bigint AS total FROM enade_agregado WHERE nu_ano = $1', [ano]);
  const totalExistente = Number(existentes.rows[0].total);

  let status = 'inserido';
  let totalInserido = 0;

  if (totalExistente > 0) {
    status = 'ja_existia';
    console.log(`Ano ${ano} ja possui ${totalExistente} linhas em enade_agregado. Insercao pulada.`);
  } else {
    totalInserido = await inserirAgregados(client, resultado.linhasAgregadas);
    console.log(`Ano ${ano} inserido em enade_agregado: ${totalInserido} grupos.`);
  }

  const resumo = await resumoAno(client, ano);
  console.table(resumo);

  return {
    ano,
    status,
    totalInserido,
    linhasLidas: resultado.linhasLidas,
    linhasValidas: resultado.linhasValidas,
    linhasIgnoradas: resultado.linhasIgnoradas,
    gruposAgregados: resultado.grupos,
    somaAgregados: resultado.somaAgregados,
    resumo
  };
}

async function carregarAnosEnade(anos = ANOS_DISPONIVEIS, client = null) {
  const ownsClient = !client;
  const conexao = client ?? await db.connect();
  const resultados = [];
  const falhas = [];

  try {
    for (const ano of anos) {
      console.log(`\n=== ANO ${ano} ===`);
      try {
        const resultado = await carregarAnoEnade(ano, conexao);
        resultados.push(resultado);
      } catch (erro) {
        console.error(`ERRO_LITERAL_ANO_${ano}:`);
        console.error(erro);
        falhas.push({ ano, erro: erro.stack || erro.message || String(erro) });
      }
    }

    await conexao.query('DROP TABLE IF EXISTS enade_agregado_teste_2004');
    await conexao.query('DROP TABLE IF EXISTS enade_agregado_teste_2014');

    const consolidado = await conexao.query(`
      SELECT nu_ano, COUNT(*)::bigint AS grupos, SUM(qtd_participantes)::bigint AS total_participantes
      FROM enade_agregado
      GROUP BY nu_ano
      ORDER BY nu_ano
    `);

    const tamanho = await conexao.query("SELECT pg_size_pretty(pg_total_relation_size('enade_agregado')) AS tamanho");

    console.log('\n=== VALIDACAO FINAL CONSOLIDADA ===');
    console.table(consolidado.rows);
    console.log(`Tamanho final enade_agregado: ${tamanho.rows[0].tamanho}`);

    if (falhas.length) {
      console.log('\n=== ANOS COM FALHA ===');
      console.table(falhas.map(({ ano, erro }) => ({ ano, erro })));
    } else {
      console.log('\n=== ANOS COM FALHA ===');
      console.log('Nenhum.');
    }

    return {
      resultados,
      falhas,
      consolidado: consolidado.rows,
      tamanhoFinal: tamanho.rows[0].tamanho
    };
  } finally {
    if (ownsClient) {
      conexao.release();
    }
  }
}

async function processarArquivo(caminhoArquivo, batchSize = 500, client = null) {
  const ownsClient = !client;
  const conexao = client ?? await db.connect();
  const texto = await fs.promises.readFile(caminhoArquivo, 'utf8');
  const linhas = texto.split(/\r?\n/).filter(Boolean);

  if (linhas.length === 0) {
    if (ownsClient) conexao.release();
    return { lidas: 0, inseridas: 0, falhas: 0 };
  }

  const cabecalho = linhas[0].split(';').map(normalizarCampo);
  const registros = linhas.slice(1);

  let lidas = 0;
  let inseridas = 0;
  let falhas = 0;
  let loteAtual = [];

  try {
    for (const linhaTexto of registros) {
      lidas++;

      const campos = linhaTexto.split(';');

      if (campos.length !== cabecalho.length) {
        falhas++;
        console.log(`Linha malformada ignorada em ${path.basename(caminhoArquivo)}: ${linhaTexto}`);
        continue;
      }

      const linha = {};
      cabecalho.forEach((nomeColuna, index) => {
        linha[nomeColuna] = campos[index].trim();
      });

      const registro = transformarLinha(linha);

      if (!registro) {
        falhas++;
        console.log(`Linha com valores invalidos ignorada em ${path.basename(caminhoArquivo)}: ${linhaTexto}`);
        continue;
      }

      loteAtual.push(registro);

      if (loteAtual.length >= batchSize) {
        inseridas += await inserirLote(conexao, loteAtual);
        loteAtual = [];
      }
    }

    if (loteAtual.length > 0) {
      inseridas += await inserirLote(conexao, loteAtual);
    }

    console.log(`${path.basename(caminhoArquivo)} -> ${lidas} lidas | ${inseridas} inseridas | ${falhas} ignoradas`);

    return { lidas, inseridas, falhas };
  } catch (erro) {
    console.error(`Erro ao processar ${path.basename(caminhoArquivo)}: ${erro.message}`);
    return { lidas, inseridas, falhas, erro: erro.message };
  } finally {
    if (ownsClient) conexao.release();
  }
}

async function processarAgregacao(caminhoPasta, client = null) {
  const ownsClient = !client;
  const conexao = client ?? await db.connect();
  const arquivos = fs.readdirSync(caminhoPasta)
    .filter((arquivo) => arquivo.endsWith('.txt'))
    .sort()
    .map((arquivo) => path.join(caminhoPasta, arquivo));

  try {
    for (const caminhoArquivo of arquivos) {
      const texto = await fs.promises.readFile(caminhoArquivo, 'latin1');
      const anoEncontrado = Number((path.basename(caminhoArquivo).match(/(\d{4})/) || [])[1] || 2023);

      if (!isArquivoAgregavel(texto.split(/\r?\n/)[0].split(';'), anoEncontrado)) {
        console.log(`${path.basename(caminhoArquivo)} ignorado: estrutura diferente`);
        continue;
      }

      const resultado = agregarTexto(texto, caminhoArquivo, anoEncontrado);
      const inseridos = await inserirAgregados(conexao, resultado.linhasAgregadas);

      return {
        arquivosUsados: resultado.arquivosUsados,
        linhasLidas: resultado.linhasLidas,
        linhasValidas: resultado.linhasValidas,
        linhasIgnoradas: resultado.linhasIgnoradas,
        grupos: resultado.grupos,
        totalInserido: inseridos
      };
    }

    return {
      arquivosUsados: [],
      linhasLidas: 0,
      linhasValidas: 0,
      linhasIgnoradas: 0,
      grupos: 0,
      totalInserido: 0
    };
  } finally {
    if (ownsClient) conexao.release();
  }
}

module.exports = {
  ANOS_DISPONIVEIS,
  agregarAno,
  carregarAnoEnade,
  carregarAnosEnade,
  processarArquivo,
  processarAgregacao
};
