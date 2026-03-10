const { defineConfig } = require("cypress");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        unzipEnadeFiles() {
          // Caminho da pasta de downloads do Cypress
          const downloadDir = path.join(process.cwd(), 'cypress', 'downloads');
          // Caminho da pasta de destino Unzip
          const unzipDir = path.join(downloadDir, 'Unzip');

          // Cria a pasta Unzip se não existir
          if (!fs.existsSync(unzipDir)) {
            fs.mkdirSync(unzipDir, { recursive: true });
          }

          // Lê todos os arquivos baixados
          const files = fs.readdirSync(downloadDir);
          
          files.forEach(file => {
            if (file.toLowerCase().endsWith('.zip')) {
              const filePath = path.join(downloadDir, file);
              try {
                const zip = new AdmZip(filePath);
                // Extrai para a pasta Unzip
                zip.extractAllTo(unzipDir, true);
                console.log(`Sucesso ao descompactar: ${file}`);
              } catch (err) {
                console.error(`Erro ao descompactar ${file}: ${err.message}`);
              }
            }
          });
          return "Processo de Unzip finalizado!";
        }
      });
    },
    baseUrl: 'https://www.gov.br',
    defaultCommandTimeout: 10000,
  },
} );
