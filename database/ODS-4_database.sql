-- Tabela MUNICIPIO precisa ser criada primeiro
CREATE TABLE MUNICIPIO (
    codigo_municipio INT PRIMARY KEY,
    municipio VARCHAR(255),
    UF CHAR(2)
);

-- Tabela IES
CREATE TABLE IES (
    codigo_da_ies INT PRIMARY KEY,
    nome_da_ies VARCHAR(255),
    sigla VARCHAR(50),
    categoria_da_ies INT,
    comunitaria INT,
    confessionante INT,
    filantropica INT,
    organizacao_academica INT,
    codigo_municipio INT,
    situacao INT,
    FOREIGN KEY (codigo_municipio) REFERENCES MUNICIPIO(codigo_municipio)
);

-- Tabela CURSOS
CREATE TABLE CURSOS (
    cod_denominacao INT PRIMARY KEY,
    denominacao VARCHAR(255),
    grau_denominacao VARCHAR(50),
    descricao_rotulo_sugerido VARCHAR(500)
);

-- Tabela ENADE
CREATE TABLE ENADE (
    num_ano INT,
    cod_curso INT,
    cod_ies INT,
    cod_modalidade INT,
    cod_municipio INT,
    PRIMARY KEY (num_ano, cod_curso, cod_ies),
    FOREIGN KEY (cod_curso) REFERENCES CURSOS(cod_denominacao),
    FOREIGN KEY (cod_ies) REFERENCES IES(codigo_da_ies),
    FOREIGN KEY (cod_municipio) REFERENCES MUNICIPIO(codigo_municipio)
);

-- Tabela GRADUACAO
CREATE TABLE GRADUACAO (
    num_ano INT,
    cod_curso INT,
    ano_in_grad INT,
    cod_turma INT,
    PRIMARY KEY (num_ano, cod_curso, cod_turma),
    FOREIGN KEY (cod_curso) REFERENCES CURSOS(cod_denominacao)
);

-- Tabela GENERO
CREATE TABLE GENERO (
    num_ano INT,
    cod_curso INT,
    tp_sexo CHAR(1),
    PRIMARY KEY (num_ano, cod_curso, tp_sexo),
    FOREIGN KEY (cod_curso) REFERENCES CURSOS(cod_denominacao)
);

-- Tabela IDADE
CREATE TABLE IDADE (
    num_ano INT,
    cod_curso INT,
    num_idade INT,
    PRIMARY KEY (num_ano, cod_curso, num_idade),
    FOREIGN KEY (cod_curso) REFERENCES CURSOS(cod_denominacao)
);


