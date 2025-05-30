import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import querystring from 'querystring';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function abrirBanco() {
  return open({
    filename: './banco.db',
    driver: sqlite3.Database
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    if (req.url === '/home.html') {
      const db = await abrirBanco();
      const usuarios = await db.all(`
        SELECT u.IDUsuario, u.Login_, p.PerfilDoUsuario
        FROM Usuario u
        JOIN PerfilUsuario pu ON u.IDUsuario = pu.IDUsuario
        JOIN Perfil p ON pu.IDPerfil = p.IDPerfil
        WHERE p.PerfilDoUsuario IN ('Funcionario', 'Gerente')
      `);

      let lista = '';
      for (const user of usuarios) {
        lista += `<li>${user.Login_} (${user.PerfilDoUsuario})
          <form method="POST" action="/excluir" style="display:inline;">
            <input type="hidden" name="id" value="${user.IDUsuario}" />
            <button type="submit">Excluir</button>
          </form>
        </li>`;
      }

      fs.readFile(path.join(__dirname, 'home.html'), 'utf8', (err, html) => {
        if (err) {
          res.writeHead(500);
          res.end('Erro ao carregar a página');
        } else {
          const htmlFinal = html.replace('<div id="usuarios">', `<div id="usuarios"><ul>${lista}</ul>`);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(htmlFinal);
        }
      });

    } else {
      const filePath = req.url === '/' ? '/index.html' : req.url;
      const fullPath = path.join(__dirname, filePath);

      fs.readFile(fullPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Arquivo não encontrado');
        } else {
          res.writeHead(200);
          res.end(data);
        }
      });
    }
  }

  else if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const { login, senha } = JSON.parse(body);
      const db = await abrirBanco();
      const user = await db.get(
        'SELECT * FROM Usuario WHERE Login_ = ? AND Senha = ?',
        [login, senha]
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sucesso: !!user }));
    });
  }

  else if (req.method === 'POST' && req.url === '/adicionar') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const dados = querystring.parse(body);
      const db = await abrirBanco();

      try {
        await db.run('INSERT INTO Usuario (Login_, Senha) VALUES (?, ?)', [dados.login, dados.senha]);
        const usuario = await db.get('SELECT IDUsuario FROM Usuario WHERE Login_ = ?', [dados.login]);
        const perfil = await db.get('SELECT IDPerfil FROM Perfil WHERE PerfilDoUsuario = ?', [dados.perfil]);
        if (usuario && perfil) {
          await db.run('INSERT INTO PerfilUsuario (IDUsuario, IDPerfil) VALUES (?, ?)', [usuario.IDUsuario, perfil.IDPerfil]);
        }
      } catch (err) {
        console.error('Erro ao adicionar usuário:', err.message);
      }

      res.writeHead(302, { Location: '/home.html' });
      res.end();
    });
  }

  else if (req.method === 'POST' && req.url === '/excluir') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const { id } = querystring.parse(body);
      const db = await abrirBanco();
      await db.run('DELETE FROM PerfilUsuario WHERE IDUsuario = ?', [id]);
      await db.run('DELETE FROM Usuario WHERE IDUsuario = ?', [id]);
      res.writeHead(302, { Location: '/home.html' });
      res.end();
    });
  }

  else {
    res.writeHead(404);
    res.end('Rota não encontrada');
  }
});

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});