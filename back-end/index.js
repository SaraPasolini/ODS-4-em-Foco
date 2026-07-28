const { processarAgregacao } = require('./processador');
const path = require('path');
const fs = require('fs');

const caminhoPasta = path.join(
  __dirname,
  '..',
  'cypress',
  'e2e',
  'Enad_arquivos',
  'microdados_enade_2023',
  'Microdados_Enade_2023',
  'DADOS'
);

console.log('Caminho:', caminhoPasta);
console.log('Existe?', fs.existsSync(caminhoPasta));

async function main() {
  const client = await require('../db').connect();

  try {
    const resultado = await processarAgregacao(caminhoPasta, client);
    console.log(`Resumo agregação: ${resultado.linhasLidas} lidas | ${resultado.linhasValidas} válidas | ${resultado.linhasIgnoradas} ignoradas | ${resultado.grupos} grupos | ${resultado.totalInserido} inseridos`);
  } finally {
    client.release();
  }
}

main().catch((erro) => {
  console.error('Erro no processamento:', erro);
  process.exit(1);
});