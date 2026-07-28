const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

module.exports = defineConfig({
  taskTimeout: 1800000,

  e2e: {
    setupNodeEvents(on, config) {

      on('task', {

        downloadFile({ url }) {
          return new Promise((resolve, reject) => {
            const fileName = url.split('/').pop();
            const downloadsDir = path.join(__dirname, 'downloads');

            if (!fs.existsSync(downloadsDir)) {
              fs.mkdirSync(downloadsDir);
            }

            const filePath = path.join(downloadsDir, fileName);
            const file = fs.createWriteStream(filePath);

            const protocol = url.startsWith('https') ? https : http;

            const options = {
              rejectUnauthorized: false
            };

            protocol.get(url, options, (response) => {
              response.pipe(file);

              file.on('finish', () => {
                file.close();
                resolve(filePath);
              });
            }).on('error', (err) => {
              fs.unlink(filePath, () => {});
              reject(err);
            });
          });
        },

        extractAllEnadeFiles() {
          return 'Task de extração mantida registrada.';
        }

      });

      return config;
    }
  }
});