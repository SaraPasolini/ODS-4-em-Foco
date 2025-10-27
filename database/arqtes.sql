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

