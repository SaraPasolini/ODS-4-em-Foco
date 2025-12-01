const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
const fs = require('fs');
const path = require('path');

module.exports = {
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        unzipFile({ zipPath, outputPath }) {
          const unzipper = require('unzipper');

          return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
              .pipe(unzipper.Extract({ path: outputPath }))
              .on('close', () => resolve(true))
              .on('error', (err) => reject(err));
          });
        },

        deleteFile(filePath) {
          return new Promise((resolve, reject) => {
            fs.unlink(filePath, err => {
              if (err) reject(err);
              else resolve(true);
            });
          });
        }
      });

      return config;
    },
  },
};
