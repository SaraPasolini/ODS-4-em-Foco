const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const AdmZip = require('adm-zip');
const db = require('../db');

const IES_CSV_PATH = path.join(
  __dirname,
  '..',
  'cypress',
  'e2e',
  'downloads',
  'PDA_Lista_Instituicoes_Ensino_Superior_do_Brasil_EMEC.csv'
);

const DTB_ZIP_PATH = path.join(
  __dirname,
  '..',
  'cypress',
  'e2e',
  'downloads',
  'DTB_2024.zip'
);

const MUNICIPIOS_ODS_NAME = 'RELATORIO_DTB_BRASIL_2024_MUNICIPIOS.ods';

function emptyToNull(value) {
  const clean = String(value ?? '').trim();
  return clean === '' || clean.toLowerCase() === 'null' ? null : clean;
}

function toIntegerOrNull(value) {
  const clean = emptyToNull(value);
  if (clean === null) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function normalizeMunicipioIbge(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return Number(digits.slice(-7));
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(value) {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, '')).trim();
}

function getRepeatCount(attributes, attributeName) {
  const match = attributes.match(new RegExp(`${attributeName}="(\\d+)"`));
  return match ? Number(match[1]) : 1;
}

function parseOdsRows(odsBuffer) {
  const ods = new AdmZip(odsBuffer);
  const contentEntry = ods.getEntry('content.xml');
  if (!contentEntry) {
    throw new Error('content.xml nao encontrado dentro do ODS');
  }

  const contentXml = contentEntry.getData().toString('utf8');
  const rows = [];
  const rowRegex = /<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(contentXml)) !== null) {
    const rowXml = rowMatch[1];
    const values = [];
    const cellRegex = /<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell\b([^>]*)\/>/g;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
      const attributes = cellMatch[1] ?? cellMatch[3] ?? '';
      const repeat = Math.min(getRepeatCount(attributes, 'table:number-columns-repeated'), 50);
      const body = cellMatch[2] ?? '';
      const paragraphs = [...body.matchAll(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g)]
        .map((match) => stripXmlTags(match[1]))
        .filter(Boolean);
      const text = paragraphs.join(' ').trim();

      for (let index = 0; index < repeat; index += 1) {
        values.push(text);
      }
    }

    if (values.some((value) => value !== '')) {
      rows.push(values);
    }
  }

  return rows;
}

function readIesRows() {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(IES_CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        rows.push({
          codigo_da_ies: toIntegerOrNull(row.CODIGO_DA_IES),
          nome_da_ies: emptyToNull(row.NOME_DA_IES),
          sigla: emptyToNull(row.SIGLA),
          categoria_da_ies: emptyToNull(row.CATEGORIA_DA_IES),
          organizacao_academica: emptyToNull(row.ORGANIZACAO_ACADEMICA),
          codigo_municipio_ibge_original: emptyToNull(row.CODIGO_MUNICIPIO_IBGE),
          codigo_municipio_ibge_corrigido: normalizeMunicipioIbge(row.CODIGO_MUNICIPIO_IBGE),
          municipio: emptyToNull(row.MUNICIPIO),
          uf: emptyToNull(row.UF),
          situacao_ies: emptyToNull(row.SITUACAO_IES),
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function readMunicipioRows() {
  const dtbZip = new AdmZip(DTB_ZIP_PATH);
  const odsEntry = dtbZip.getEntry(MUNICIPIOS_ODS_NAME);

  if (!odsEntry) {
    throw new Error(`${MUNICIPIOS_ODS_NAME} nao encontrado dentro de DTB_2024.zip`);
  }

  const rows = parseOdsRows(odsEntry.getData());
  const headerIndex = rows.findIndex((row) => row[0] === 'UF' && row[1] === 'Nome_UF' && row[7] === 'Código Município Completo');

  if (headerIndex === -1) {
    throw new Error('Cabecalho esperado nao encontrado no ODS de municipios');
  }

  return rows.slice(headerIndex + 1)
    .filter((row) => row[0] && row[1] && row[7] && row[8])
    .map((row) => ({
      uf: toIntegerOrNull(row[0]),
      nome_uf: emptyToNull(row[1]),
      codigo_municipio_completo: toIntegerOrNull(row[7]),
      nome_municipio: emptyToNull(row[8]),
    }));
}

async function insertBatches(client, tableName, columns, rows, batchSize = 1000) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const placeholders = batch.map((_, rowIndex) => {
      const start = rowIndex * columns.length + 1;
      return `(${columns.map((__, colIndex) => `$${start + colIndex}`).join(', ')})`;
    }).join(', ');
    const values = batch.flatMap((row) => columns.map((column) => row[column]));

    await client.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );
  }
}

async function main() {
  const client = await db.connect();

  try {
    const iesRows = await readIesRows();
    const municipioRows = readMunicipioRows();

    await client.query('BEGIN');

    await client.query('DROP TABLE IF EXISTS ies_referencia;');
    await client.query(`
      CREATE TABLE ies_referencia (
        codigo_da_ies INTEGER,
        nome_da_ies TEXT,
        sigla TEXT,
        categoria_da_ies TEXT,
        organizacao_academica TEXT,
        codigo_municipio_ibge_original TEXT,
        codigo_municipio_ibge_corrigido BIGINT,
        municipio TEXT,
        uf VARCHAR(2),
        situacao_ies TEXT
      );
    `);

    await client.query('DROP TABLE IF EXISTS municipio_referencia;');
    await client.query(`
      CREATE TABLE municipio_referencia (
        uf INTEGER,
        nome_uf TEXT,
        codigo_municipio_completo BIGINT,
        nome_municipio TEXT
      );
    `);

    await insertBatches(client, 'ies_referencia', [
      'codigo_da_ies',
      'nome_da_ies',
      'sigla',
      'categoria_da_ies',
      'organizacao_academica',
      'codigo_municipio_ibge_original',
      'codigo_municipio_ibge_corrigido',
      'municipio',
      'uf',
      'situacao_ies',
    ], iesRows);

    await insertBatches(client, 'municipio_referencia', [
      'uf',
      'nome_uf',
      'codigo_municipio_completo',
      'nome_municipio',
    ], municipioRows);

    await client.query('COMMIT');

    console.log(`IES_REFERENCIA_IMPORTADAS=${iesRows.length}`);
    console.log(`MUNICIPIO_REFERENCIA_IMPORTADOS=${municipioRows.length}`);

    const samples = await Promise.all([
      client.query('SELECT * FROM ies_referencia ORDER BY codigo_da_ies NULLS LAST, nome_da_ies LIMIT 5;'),
      client.query('SELECT * FROM municipio_referencia ORDER BY codigo_municipio_completo LIMIT 5;'),
      client.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'enade_agregado' AND column_name IN ('co_ies', 'co_munic_curso'))
            OR (table_name = 'ies_referencia' AND column_name IN ('codigo_da_ies', 'codigo_municipio_ibge_original', 'codigo_municipio_ibge_corrigido'))
            OR (table_name = 'municipio_referencia' AND column_name IN ('codigo_municipio_completo'))
          )
        ORDER BY table_name, column_name;
      `),
    ]);

    console.log('AMOSTRA_IES_REFERENCIA');
    console.table(samples[0].rows);
    console.log('AMOSTRA_MUNICIPIO_REFERENCIA');
    console.table(samples[1].rows);
    console.log('COMPARACAO_TIPOS_CODIGOS');
    console.table(samples[2].rows);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
