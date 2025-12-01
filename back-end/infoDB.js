const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// CONFIG DO BANCO
const db = {
  host: 'localhost',
  user: 'root',
  password: 'sua_senha',
  database: 'seu_banco'
};

// PASTA DOS ARQUIVOS
const pasta = path.join(__dirname, "pasta_x");

// FUNÇÃO PRINCIPAL
async function importar() {

  const conn = await mysql.createConnection(db);
  console.log("Conectado ao MySQL!");

  // LÊ ARQUIVOS DA PASTA
  const arquivos = fs.readdirSync(pasta);

  for (const arquivo of arquivos) {
    const caminho = path.join(pasta, arquivo);

    // PROCESSA SOMENTE JSON
    if (!arquivo.endsWith(".json")) continue;

    const conteudo = JSON.parse(fs.readFileSync(caminho, "utf8"));
    console.log(`Importando: ${arquivo}`);

    if (arquivo === "ies.json") {
      for (let item of conteudo) {
        await conn.execute(
          `INSERT INTO IES (
            codigo_da_ies, nome_da_ies, sigla, categoria_da_ies,
            comutaria, confessionante, filantropica, organizacao_academica,
            codigo_municipio, situacao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.codigo_da_ies,
            item.nome_da_ies,
            item.sigla,
            item.categoria_da_ies,
            item.comutaria,
            item.confessionante,
            item.filantropica,
            item.organizacao_academica,
            item.codigo_municipio,
            item.situacao
          ]
        );
      }
    }

    if (arquivo === "municipios.json") {
      for (let item of conteudo) {
        await conn.execute(
          `INSERT INTO MUNICIPIO (codigo_municipio, municipio, UF)
           VALUES (?, ?, ?)`,
          [
            item.codigo_municipio,
            item.municipio,
            item.UF
          ]
        );
      }
    }

    if (arquivo === "cursos.json") {
      for (let item of conteudo) {
        await conn.execute(
          `INSERT INTO CURSOS (
             cod_denominacao, denominacao, grau_denominacao, descricao_rotulo_sugerido
           ) VALUES (?, ?, ?, ?)`,
          [
            item.cod_denominacao,
            item.denominacao,
            item.grau_denominacao,
            item.descricao_rotulo_sugerido
          ]
        );
      }
    }

  }

  console.log("Importação concluída!");
  await conn.end();
}

importar();
