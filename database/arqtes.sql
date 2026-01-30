CREATE TABLE MUNICIPIO(
    codigo_municipio INT PRIMARY KEY,
    municipio varchar(255),
    UF varchar(2)
);
CREATE TABLE IES(
    codigo_da_ies  INT PRIMARY KEY,
    nome_da_ies varchar(255),
    sigla varchar(30),
    categoria_da_ies  INT,
    comunitaria  INT,
    confessionante  INT,
    filantropica  INT,
    organizacao_academica  INT,
    situacao  INT,
    CONSTRAINT fk_ies_municipio FOREIGN KEY (codigo_municipio)
        REFERENCES MUNICIPIO(codigo_municipio)
);
CREATE TABLE CURSOS(
    cod_denominacao INT PRIMARY KEY,
    denominacao varchar(255),
    grau_denominacao varchar(50),
    descricao_rotulo_sugerido varchar(500)
);
CREATE TABLE ENADE(
    num_ano INT ,
    cod_curso INT ,
    cod_ies INT ,
    cod_modalidade INT,
    cod_municipio INT,
    PRIMARY KEY (num_ano, cod_curso, cod_ies),
    CONSTRAINT fk_enade_curso
        FOREIGN KEY (cod_curso)
        REFERENCES CURSOS(cod_denominacao),
    CONSTRAINT fk_enade_ies
        FOREIGN KEY (cod_ies)
        REFERENCES IES(codigo_da_ies),
    CONSTRAINT fk_enade_municipio
        FOREIGN KEY (cod_municipio)
        REFERENCES MUNICIPIO(codigo_municipio)
);

CREATE TABLE GRADUACAO(
    num_ano INT,
    cod_curso INT,
    ano_in_grad INT,
    cod_turma INT,
    PRIMARY KEY (num_ano, cod_curso),
    CONSTRAINT fk_graduacao_curso
        FOREIGN KEY (cod_curso)
        REFERENCES CURSOS(cod_denominacao)
);

CREATE TABLE GENERO(
    num_ano INT,
    cod_curso INT,
    tp_sexo char(1),
    CONSTRAINT fk_genero_curso
        FOREIGN KEY (cod_curso)
        REFERENCES CURSOS(cod_denominacao)
);

CREATE TABLE IDADE(
    num_ano INT,
    cod_curso INT,
    num_idade INT,
    CONSTRAINT fk_idade_curso
        FOREIGN KEY (cod_curso)
        REFERENCES CURSOS(cod_denominacao)
);