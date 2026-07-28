const fs = require('fs');
const path = require('path');
const db = require('../db');

const COLUNAS = [
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

const CAMPOS_AGREGACAO = [
  'NU_ANO',
  'CO_CURSO',
  'CO_IES',
  'CO_MODALIDADE',
  'CO_UF_CURSO',
  'CO_MUNIC_CURSO'
];

async function inserirLote(client, lote) {
  if (!lote.length) return 0;

  const placeholders = lote.map((_, index) => {
    const start = index * COLUNAS.length + 1;
    return `(${COLUNAS.map((_, colIndex) => `$${start + colIndex}`).join(', ')})`;
  }).join(', ');

  const valores = lote.flatMap((linha) => COLUNAS.map((coluna) => linha[coluna]));

  await client.query(`
    INSERT INTO enade_raw (${COLUNAS.join(', ')})
    VALUES ${placeholders}
  `, valores);

  return lote.length;
}

async function inserirAgregados(client, linhasAgregadas) {
  if (!linhasAgregadas.length) return 0;

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
  const valorLimpo = String(valor ?? '').trim();
  if (!valorLimpo) {
    return null;
  }

  const numero = Number(valorLimpo);
  return Number.isFinite(numero) ? numero : null;
}

function transformarLinha(linha) {
  const registro = {
    nu_ano: parseField(linha['NU_ANO']),
    co_curso: parseField(linha['CO_CURSO']),
    co_ies: parseField(linha['CO_IES']),
    co_categad: parseField(linha['CO_CATEGAD']),
    co_orgacad: parseField(linha['CO_ORGACAD']),
    co_grupo: parseField(linha['CO_GRUPO']),
    co_modalidade: parseField(linha['CO_MODALIDADE']),
    co_munic_curso: parseField(linha['CO_MUNIC_CURSO']),
    co_uf_curso: parseField(linha['CO_UF_CURSO']),
    co_regiao_curso: parseField(linha['CO_REGIAO_CURSO'])
  };

  return registro;
}

function transformarLinhaAgregacao(linha) {
  const registro = {
    nu_ano: parseField(linha['NU_ANO']),
    co_curso: parseField(linha['CO_CURSO']),
    co_ies: parseField(linha['CO_IES']),
    co_modalidade: parseField(linha['CO_MODALIDADE']),
    co_uf_curso: parseField(linha['CO_UF_CURSO']),
    co_munic_curso: parseField(linha['CO_MUNIC_CURSO'])
  };

  if ([registro.nu_ano, registro.co_curso, registro.co_ies, registro.co_modalidade, registro.co_uf_curso, registro.co_munic_curso].some((valor) => valor === null)) {
    return null;
  }

  return registro;
}

function isArquivoAgregavel(cabecalho) {
  const camposNormalizados = cabecalho.map((campo) => campo.trim());
  return CAMPOS_AGREGACAO.every((campo) => camposNormalizados.includes(campo));
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

  const cabecalho = linhas[0].split(';').map((campo) => campo.trim());
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
        console.log(`⚠️ Linha malformada ignorada em ${path.basename(caminhoArquivo)}: ${linhaTexto}`);
        continue;
      }

      const linha = {};
      cabecalho.forEach((nomeColuna, index) => {
        linha[nomeColuna] = campos[index].trim();
      });

      const registro = transformarLinha(linha);

      if (!registro) {
        falhas++;
        console.log(`⚠️ Linha com valores inválidos ignorada em ${path.basename(caminhoArquivo)}: ${linhaTexto}`);
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

    console.log(`✔ ${path.basename(caminhoArquivo)} → ${lidas} lidas | ${inseridas} inseridas | ${falhas} ignoradas`);

    return { lidas, inseridas, falhas };
  } catch (erro) {
    console.error(`❌ Erro ao processar ${path.basename(caminhoArquivo)}: ${erro.message}`);
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

  const agregados = new Map();
  let totalLidas = 0;
  let totalValidas = 0;
  let totalIgnoradas = 0;
  let arquivosUsados = [];

  for (const caminhoArquivo of arquivos) {
    const nomeArquivo = path.basename(caminhoArquivo);
    const texto = await fs.promises.readFile(caminhoArquivo, 'utf8');
    const linhas = texto.split(/\r?\n/).filter(Boolean);

    if (linhas.length === 0) {
      continue;
    }

    const cabecalho = linhas[0].split(';').map((campo) => campo.trim());

    if (!isArquivoAgregavel(cabecalho)) {
      console.log(`⏭️ ${nomeArquivo} ignorado: estrutura diferente (${cabecalho.join(', ')})`);
      continue;
    }

    arquivosUsados.push(nomeArquivo);
    const registros = linhas.slice(1);

    let lidas = 0;
    let validas = 0;
    let ignoradas = 0;

    for (const linhaTexto of registros) {
      lidas++;
      totalLidas++;

      const campos = linhaTexto.split(';');
      if (campos.length !== cabecalho.length) {
        ignoradas++;
        totalIgnoradas++;
        console.log(`⚠️ Linha malformada ignorada em ${nomeArquivo}: ${linhaTexto}`);
        continue;
      }

      const linha = {};
      cabecalho.forEach((nomeColuna, index) => {
        linha[nomeColuna] = campos[index].trim();
      });

      const registro = transformarLinhaAgregacao(linha);
      if (!registro) {
        ignoradas++;
        totalIgnoradas++;
        console.log(`⚠️ Linha com valores inválidos ignorada em ${nomeArquivo}: ${linhaTexto}`);
        continue;
      }

      validas++;
      totalValidas++;

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

    console.log(`✔ ${nomeArquivo} → ${lidas} lidas | ${validas} válidas | ${ignoradas} ignoradas`);
  }

  const linhasAgregadas = Array.from(agregados.values());
  const somaAgregados = linhasAgregadas.reduce((total, linha) => total + Number(linha.qtd_participantes), 0);

  console.log(`Pré-validação agregação: arquivos usados=${arquivosUsados.join(', ')} | linhas válidas=${totalValidas} | soma agregada=${somaAgregados} | grupos=${linhasAgregadas.length}`);

  if (somaAgregados !== totalValidas) {
    throw new Error(`Falha na validação: soma agregada ${somaAgregados} != linhas válidas ${totalValidas}`);
  }

  const inseridos = await inserirAgregados(conexao, linhasAgregadas);

  return {
    arquivosUsados,
    linhasLidas: totalLidas,
    linhasValidas: totalValidas,
    linhasIgnoradas: totalIgnoradas,
    grupos: linhasAgregadas.length,
    totalInserido: inseridos
  };
}

module.exports = { processarArquivo, processarAgregacao };