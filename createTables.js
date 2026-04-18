const db = require('./db');

async function createTables() {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS municipio (
        codigo_municipio INT PRIMARY KEY,
        municipio TEXT,
        uf VARCHAR(2)
      );
    `);

    console.log('✅ Tabela municipio criada');

  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

createTables();