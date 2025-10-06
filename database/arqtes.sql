CREATE TABLE Curso(
  cod_Curso int PRIMARY KEY
  num_Ano int
  cod_IES int
  cod_OraganizacaoAcademica int
  cod_Grupo int
  cod_Modaliade int
  cod_Municipio_Curso int
  cod_UF_Curso int
  cod_Regiao_Curso int

)


CREATE TABLE Estudante (
    id_Estudante int PRIMARY KEY
    num_ano int
    cod_curso int FOREIGN KEY
    sexo char
    num_Idade int 
    Question_101 char
    Question_126 char
)

CREATE TABLE Prova (
    id_Prova int PRIMARY KEY
    num_Ano int
    cod_Curso FOREIGN KEY
    tp_Pres int
    Notas int 
    NT_GER 
    NT_FG 
    NT_CE 
    -- Perguntar a professora sobre o tipo das variaveis ( se é int ou char)


) 

CREATE TABLE PercepcaoProva (
    id_Percepcao int PRIMARY KEY
    num_Ano int
    cod_Curso FOREIGN KEY
    Resposta str -- string  
    
)