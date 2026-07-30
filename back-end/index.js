const db = require('../db');
const { ANOS_DISPONIVEIS, carregarAnosEnade } = require('./processador');

async function main() {
  const client = await db.connect();

  try {
    const resultado = await carregarAnosEnade(ANOS_DISPONIVEIS, client);

    if (resultado.falhas.length) {
      process.exitCode = 1;
    }
  } finally {
    client.release();
  }
}

main().catch((erro) => {
  console.error('Erro no processamento:');
  console.error(erro);
  process.exit(1);
});
