const fs = require('fs');
const path = require('path');

function listarArquivos(caminhoPasta) {
  return fs.readdirSync(caminhoPasta)
    .filter(arquivo => arquivo.endsWith('.txt'))
    .map(arquivo => path.join(caminhoPasta, arquivo));
}

module.exports = { listarArquivos };