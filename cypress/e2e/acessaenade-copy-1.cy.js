const unzipper = require("unzipper");
const fs = require("fs");

module.exports = {
  unzipFile({ zipPath, outputPath }) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputPath }))
        .on("close", () => resolve(true))
        .on("error", (err) => reject(err));
    });
  },

  deleteFile(filePath) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      return false;
    }
  }
};
