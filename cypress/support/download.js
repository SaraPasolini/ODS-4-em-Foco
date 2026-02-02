const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

function downloadFile({ url }) {
  return new Promise((resolve, reject) => {

    const fileName = url.split("/").pop();

    // tenta extrair o ano do nome do arquivo
    const anoMatch = fileName.match(/\d{4}/);
    const ano = anoMatch ? anoMatch[0] : "desconhecido";

    const downloadFolder = path.join(__dirname, "../../download", ano);

    // cria pasta se não existir
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    const filePath = path.join(downloadFolder, fileName);

    // evita baixar duas vezes
    if (fs.existsSync(filePath)) {
      console.log(`Arquivo já existe: ${fileName}`);
      resolve(filePath);
      return;
    }

    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(filePath);

    client.get(url, (response) => {

      if (response.statusCode !== 200) {
        reject(`Erro ${response.statusCode} ao baixar ${url}`);
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          console.log(`Download concluído: ${fileName}`);
          resolve(filePath);
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = { downloadFile };
