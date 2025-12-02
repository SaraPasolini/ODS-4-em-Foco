describe('Preencher formulário e baixar documento', () => {
  it('Preenche os campos e baixa o arquivo', () => {
      Cypress.on('uncaught:exception', (err, runnable) => {
          return false;
        });
    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade')
    cy.contains('Microdados do Enade 2023')
    .should('be.visible')
    .click({ force: true });
    
  })
})
const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

module.exports = {
  downloadFile({ url }) {
    const downloadFolder = path.join(__dirname, "../../download");

    // cria a pasta se não existir
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    const fileName = url.split("/").pop();
    const filePath = path.join(downloadFolder, fileName);

    const client = url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);

      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(`Erro ao baixar arquivo: ${response.statusCode}`);
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => resolve(filePath));
        });
      }).on("error", (err) => {
        reject(err);
      });
    });
  }
};
