const { defineConfig } = require("cypress");
const { downloadFile } = require("./cypress/support/download");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on) {
      on("task", {
        downloadFile
      });
    }
  }
});
