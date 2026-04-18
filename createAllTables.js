const db = require('./db');

async function createTables() {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS municipio (
        codigo_municipio INT PRIMARY KEY,
        municipio TEXT,
        uf VARCHAR(2)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        cod_denominacao INT PRIMARY KEY,
        denominacao TEXT,
        grau_denominacao TEXT,
        descricao_rotulo_sugerido TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS ies (
        codigo_da_ies INT PRIMARY KEY,
        nome_da_ies TEXT,
        sigla TEXT,
        categoria_da_ies INT,
        comunitaria INT,
        confessionante INT,
        filantropica INT,
        organizacao_academica INT,
        codigo_municipio INT,
        situacao INT,
        FOREIGN KEY (codigo_municipio)
          REFERENCES municipio(codigo_municipio)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS enade (
        id SERIAL PRIMARY KEY,
        num_ano INT,
        cod_curso INT,
        cod_ies INT,
        cod_modalidade INT,
        cod_municipio INT,
        FOREIGN KEY (cod_curso)
          REFERENCES cursos(cod_denominacao),
        FOREIGN KEY (cod_ies)
          REFERENCES ies(codigo_da_ies),
        FOREIGN KEY (cod_municipio)
          REFERENCES municipio(codigo_municipio)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS graduacao (
        num_ano INT,
        cod_curso INT,
        ano_in_grad INT,
        cod_turma INT,
        PRIMARY KEY (num_ano, cod_curso),
        FOREIGN KEY (cod_curso)
          REFERENCES cursos(cod_denominacao)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS genero (
        num_ano INT,
        cod_curso INT,
        tp_sexo CHAR(1),
        PRIMARY KEY (num_ano, cod_curso, tp_sexo),
        FOREIGN KEY (cod_curso)
          REFERENCES cursos(cod_denominacao)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS idade (
        num_ano INT,
        cod_curso INT,
        num_idade INT,
        PRIMARY KEY (num_ano, cod_curso, num_idade),
        FOREIGN KEY (cod_curso)
          REFERENCES cursos(cod_denominacao)
      );
    `);

    console.log('✅ Todas as tabelas criadas com sucesso!');

  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

createTables();