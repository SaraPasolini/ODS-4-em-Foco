const db = require('../db');

async function main() {
  const tables = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('TABELAS');
  console.table(tables.rows);

  const columns = await db.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  console.log('COLUNAS');
  console.table(columns.rows);

  const hasEnadeAgregado = tables.rows.some((row) => row.table_name === 'enade_agregado');

  if (hasEnadeAgregado) {
    const summary = await db.query(`
      SELECT
        COUNT(*)::bigint AS grupos,
        COALESCE(SUM(qtd_participantes), 0)::bigint AS participantes
      FROM enade_agregado;
    `);

    console.log('RESUMO_ENADE_AGREGADO');
    console.table(summary.rows);

    const sample = await db.query(`
      SELECT *
      FROM enade_agregado
      ORDER BY qtd_participantes DESC, id ASC
      LIMIT 20;
    `);

    console.log('AMOSTRA_ENADE_AGREGADO');
    console.table(sample.rows);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
