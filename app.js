import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function initDatabase() {
  // Abrir o banco (ou criar se não existir)
  const db = await open({
    filename: './banco.db',
    driver: sqlite3.Database
  });

  // Habilitar o uso de foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Criar tabela Usuario
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Usuario (
      IDUsuario INTEGER PRIMARY KEY AUTOINCREMENT,
      Login_ TEXT NOT NULL UNIQUE,
      Senha TEXT NOT NULL
    );
  `);

  // Criar tabela Perfil
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Perfil (
      IDPerfil INTEGER PRIMARY KEY AUTOINCREMENT,
      PerfilDoUsuario TEXT NOT NULL UNIQUE,
      CHECK (PerfilDoUsuario IN ('ADM', 'Funcionario', 'Gerente'))
    );
  `);

  // Criar tabela PerfilUsuario
  await db.exec(`
    CREATE TABLE IF NOT EXISTS PerfilUsuario (
      IDPerfilUsuario INTEGER PRIMARY KEY AUTOINCREMENT,
      IDUsuario INTEGER,
      IDPerfil INTEGER,
      FOREIGN KEY (IDUsuario) REFERENCES Usuario(IDUsuario),
      FOREIGN KEY (IDPerfil) REFERENCES Perfil(IDPerfil)
    );
  `);

  // Inserir perfis (se ainda não existirem)
  await db.run(`INSERT OR IGNORE INTO Perfil (PerfilDoUsuario) VALUES ('ADM')`);
  await db.run(`INSERT OR IGNORE INTO Perfil (PerfilDoUsuario) VALUES ('Funcionario')`);
  await db.run(`INSERT OR IGNORE INTO Perfil (PerfilDoUsuario) VALUES ('Gerente')`);

  // Inserir usuário exemplo
  await db.run(`
    INSERT OR IGNORE INTO Usuario (Login_, Senha)
    VALUES ('Lucas', 'senha123')
  `);
    // Buscar IDs
  const user = await db.get(`SELECT IDUsuario FROM Usuario WHERE Login_ = 'Lucas'`);
  const perfil = await db.get(`SELECT IDPerfil FROM Perfil WHERE PerfilDoUsuario = 'ADM'`);

  // Inserir na tabela PerfilUsuario
  if (user && perfil) {
    await db.run(`
      INSERT OR IGNORE INTO PerfilUsuario (IDUsuario, IDPerfil)
      VALUES (?, ?)
    `, [user.IDUsuario, perfil.IDPerfil]);
  }
  console.log("Tabelas criadas com sucesso!");
}

initDatabase().catch(err => {
  console.error("Erro ao inicializar o banco de dados:", err);
});