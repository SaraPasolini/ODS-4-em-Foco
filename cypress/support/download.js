const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

function downloadFile({ url }) {
  const downloadFolder = path.join(__dirname, "../downloads");

  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
  }

  const fileName = url.split("/").pop();
  const filePath = path.join(downloadFolder, fileName);

  const client = url.startsWith("https") ? https : http;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    client.get(url, (response) => {
      console.log(`Tentando baixar: ${url} - Status: ${response.statusCode}`); // Log adicionado

      if (response.statusCode !== 200) {
        const errorMsg = `Erro ao baixar arquivo: ${response.statusCode} para ${url}`;
        console.error(errorMsg); // Log de erro
        reject(errorMsg);
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          console.log(`Download concluído: ${filePath}`); // Log de sucesso
          resolve(filePath);
        });
      });

    }).on("error", (err) => {
      console.error(`Erro de rede ao baixar ${url}: ${err.message}`); // Log de erro de rede
      reject(err);
    });
  });
}

module.exports = { downloadFile };