CREATE TABLE IES(
    codigo_da_ies int PRIMARY KEY,
    nome_da_ies str,
    sigla str,
    categoria_da_ies int,
    comutaria int,
    confessionante int,
    filantropica int,
    organizacao_academica int,
    codigo_municipio int FOREIGN KEY REFERENCES,
    situacao int
);
CREATE TABLE ENADE(
    num_ano int PRIMARY KEY,
    cod_curso int FOREIGN KEY REFERENCES PRIMARY KEY,
    cod_ies int FOREIGN KEY REFERENCES PRIMARY KEY,
    cod_modalidade int,
    cod_municipio int FOREIGN KEY REFERENCES
);
CREATE TABLE MUNICIPIO(
    codigo_municipio int PRIMARY KEY,
    municipio varchar(255),
    UF varchar(2)
);
CREATE TABLE CURSOS(
    cod_denominacao int PRIMARY KEY,
    denominacao varchar(255),
    grau_denominacao varchar(50),
    descricao_rotulo_sugerido varchar(500)
);

CREATE TABLE GRADUACAO(
    num_ano int,
    cod_curso int,
    ano_in_grad int,
    cod_turma int
);

CREATE TABLE GENERO(
    num_ano int,
    cod_curso int,
    tp_sexo char(1)
);

CREATE TABLE IDADE(
    num_ano int,
    cod_curso int,
    num_idade int
);