const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");

module.exports = {
  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        unzipFile({ zipPath, extractTo }) {
          return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
              .pipe(unzipper.Extract({ path: extractTo }))
              .on("close", () => resolve(null))
              .on("error", (err) => reject(err));
          });
        }
      });
    }
  }
};
