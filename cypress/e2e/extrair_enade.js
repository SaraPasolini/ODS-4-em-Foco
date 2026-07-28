const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const { createExtractorFromFile } = require('node-unrar-js');
const { execFile } = require('child_process');
const { path7za, path7z } = require('7zip-bin');

const origemDownloads = path.join(__dirname, 'downloads');
const destinoExtracao = path.join(__dirname, 'Enad_arquivos');
const sevenZipExecutable = path7za || path7z;

function getArchiveType(filePath) {
  const buffer = Buffer.alloc(6);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 6, 0);
  fs.closeSync(fd);
  const hex = buffer.toString('hex');

  if (hex.startsWith('504b0304')) {
    return 'zip';
  }

  if (hex.startsWith('377abcaf271c')) {
    return '7z';
  }

  return 'unknown';
}

async function extractZip(filePath, extractPath) {
  try {
    const zip = new AdmZip(filePath);
    zip.extractAllTo(extractPath, true);
    console.log(`📦 ZIP extraído: ${path.basename(filePath)}`);
  } catch (err) {
    console.log(`❌ Erro ao extrair ZIP ${path.basename(filePath)}: ${err.message}`);
  }
}

async function extract7z(filePath, extractPath) {
  if (!sevenZipExecutable) {
    console.log(`❌ 7zip não encontrado para ${path.basename(filePath)}.`);
    return;
  }

  return new Promise((resolve) => {
    execFile(sevenZipExecutable, ['x', filePath, `-o${extractPath}`, '-y'], (err, stdout, stderr) => {
      if (err) {
        console.log(`❌ Erro ao extrair 7z ${path.basename(filePath)}: ${err.message}`);
        if (stderr) console.log(stderr.trim());
        return resolve();
      }

      console.log(`📦 7z extraído: ${path.basename(filePath)}`);
      resolve();
    });
  });
}

async function extractRar(filePath, extractPath) {
  try {
    const extractor = await createExtractorFromFile({
      filepath: filePath,
      targetPath: extractPath
    });

    const result = extractor.extract();

    if (result && result[0] && result[0].state === 'SUCCESS') {
      console.log(`📦 RAR extraído: ${path.basename(filePath)}`);
    } else {
      console.log(`❌ Falha ao extrair RAR: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.log(`❌ Erro ao extrair RAR ${path.basename(filePath)}: ${err.message}`);
  }
}

async function extractArquivo(filePath, extractPath) {
  const archiveType = getArchiveType(filePath);

  if (archiveType === 'zip') {
    await extractZip(filePath, extractPath);
    return;
  }

  if (archiveType === '7z') {
    await extract7z(filePath, extractPath);
    return;
  }

  console.log(`❌ Tipo de arquivo não suportado para ${path.basename(filePath)} (${archiveType}).`);
}

async function extrairTodosArquivos() {
  await fs.ensureDir(destinoExtracao);

  const files = await fs.readdir(origemDownloads);

  const compactados = files.filter(file =>
    file.endsWith('.zip') || file.endsWith('.rar')
  );

  console.log(`\n🔎 Encontrados ${compactados.length} arquivos compactados na pasta downloads.\n`);

  for (const file of compactados) {
    const filePath = path.join(origemDownloads, file);

    const folderName = file.replace(/\.(zip|rar)$/i, '');
    const extractPath = path.join(destinoExtracao, folderName);

    await fs.ensureDir(extractPath);

    console.log(`\n🚀 Extraindo ${file} para ${folderName}...`);

    if (file.endsWith('.rar')) {
      await extractRar(filePath, extractPath);
    } else {
      await extractArquivo(filePath, extractPath);
    }
  }

  console.log('\n✅ TODOS OS ARQUIVOS FORAM EXTRAÍDOS PARA A PASTA Enad_arquivos');
}

extrairTodosArquivos();