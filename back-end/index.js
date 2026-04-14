const { listarArquivos } = require('./leitor');
const { processarArquivo } = require('./processador');
const path = require('path');
const fs = require('fs');


const caminhoPasta = path.join(
  __dirname,
  '..',
  'cypress',
  'downloads',
  'microdados_enade_2023',
  'Microdados_Enade_2023',
  'DADOS'
);

console.log('Caminho:', caminhoPasta);
console.log('Existe?', fs.existsSync(caminhoPasta));

async function main() {
  const arquivos = listarArquivos(caminhoPasta);

  console.log('Arquivos encontrados:', arquivos);

  for (const arquivo of arquivos) {
    await processarArquivo(arquivo, (linha) => {
      if (Math.random() < 0.0001) {
        console.log(linha);
      }
    });
  }
}

main();