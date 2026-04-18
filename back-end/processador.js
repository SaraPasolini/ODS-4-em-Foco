const fs = require('fs');
const csv = require('csv-parser');

function processarArquivo(caminhoArquivo, onLinha) {
  return new Promise((resolve, reject) => {

    let contador = 0;

    fs.createReadStream(caminhoArquivo)
      .pipe(csv({ separator: ';' }))
      .on('data', (linha) => {

        const dadoTratado = transformarLinha(linha);

        onLinha(dadoTratado);

        contador++;
      })
      .on('end', () => {
        console.log(`✔ ${caminhoArquivo} → ${contador} registros`);
        resolve();
      })
      .on('error', (erro) => reject(erro));
  });
}

function transformarLinha(linha) {
  return {
    ano: Number(linha.NU_ANO),
    curso: Number(linha.CO_CURSO),
    ies: Number(linha.CO_IES),
  };
}

module.exports = { processarArquivo };