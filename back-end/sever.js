import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Config MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "G19henrique",
    database: "enem_plus"
});

// Testar conexão
db.connect((err) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err);
        return;
    }
    console.log("MySQL conectado!");
});