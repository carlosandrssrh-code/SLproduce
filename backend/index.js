const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'slproduce_secret_2025';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── MULTER (subida de archivos) ─────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── CONEXIÓN iSOLVE (Azure SQL) ─────────────────────────
const sqlConfig = {
  user: process.env.SQL_USER || 'DevSLProd',
  password: process.env.SQL_PASSWORD || '$lPr0duc3!',
  server: process.env.SQL_SERVER || 'ispSLProduce.database.windows.net',
  database: process.env.SQL_DATABASE || 'spSLProduce',
  options: { encrypt: true, trustServerCertificate: false }
};

// ─── CONEXIÓN PostgreSQL ─────────────────────────────────
const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ─── CACHE iSOLVE ────────────────────────────────────────
let isolveCache = null;
let isolveCacheTime = null;
const CACHE_MINUTES = 30;

async function getIsolveData() {
  const now = new Date();
  if (isolveCache && isolveCacheTime && (now - isolveCacheTime) < CACHE_MINUTES * 60 * 1000) {
    return isolveCache;
  }
  await sql.connect(sqlConfig);
  const result = await sql.query('exec [sDevPdsSalesData]');
  isolveCache = result.recordset;
  isolveCacheTime = now;
  return isolveCache;
}

// ─── INICIALIZAR BASE DE DATOS ───────────────────────────
async function initDB() {
  try {
    await pg.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'agricultor',
        nombre VARCHAR(100),
        agricultor_id INTEGER,
        grower_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ordenes (
        id VARCHAR(20) PRIMARY KEY,
        proveedor VARCHAR(100),
        fecha VARCHAR(20),
        items JSONB,
        total NUMERIC,
        estado VARCHAR(30) DEFAULT 'Pendiente',
        notas TEXT,
        agricultor_id INTEGER,
        oc_agricultor VARCHAR(50),
        solicitud_id VARCHAR(20),
        fecha_pago VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        de_id VARCHAR(50),
        para_id VARCHAR(50),
        texto TEXT,
        fecha TIMESTAMP DEFAULT NOW(),
        leido BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS solicitudes (
        id VARCHAR(20) PRIMARY KEY,
        agricultor_id INTEGER,
        numero_oc VARCHAR(50),
        oc_sl_produce VARCHAR(20),
        items JSONB,
        estado VARCHAR(30) DEFAULT 'En revision',
        notas TEXT,
        pdf_path VARCHAR(255),
        pdf_datos JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    const adminExists = await pg.query("SELECT id FROM usuarios WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const pass = await bcrypt.hash('admin123', 10);
      await pg.query(`INSERT INTO usuarios (username, password, rol, nombre) VALUES ('admin', $1, 'admin', 'Administrador SL')`, [pass]);
      const agricultores = [
        { username: 'slagricola', pass: 'slagricola', nombre: 'SL Agricola',  id: 1, grower: '001' },
        { username: 'caco',       pass: 'caco',       nombre: 'CACO',         id: 2, grower: '002' },
        { username: 'cat',        pass: 'cat',        nombre: 'CAT',          id: 3, grower: '006' },
        { username: 'campojyf',   pass: 'campojyf',   nombre: 'CAMPO JYF',    id: 4, grower: '005' },
        { username: 'produx',     pass: 'produx',     nombre: 'PRODUX',       id: 5, grower: '013' },
        { username: 'ager',       pass: 'ager',       nombre: 'AGER',         id: 6, grower: '032' },
      ];
      for (const a of agricultores) {
        const hashed = await bcrypt.hash(a.pass, 10);
        await pg.query(
          `INSERT INTO usuarios (username, password, rol, nombre, agricultor_id, grower_code) VALUES ($1,$2,'agricultor',$3,$4,$5)`,
          [a.username, hashed, a.nombre, a.id, a.grower]
        );
      }
      console.log('Usuarios creados');
    }
    console.log('Base de datos lista');
  } catch (e) {
    console.error('Error inicializando DB:', e.message);
  }
}

// ─── MIDDLEWARE AUTH ─────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token invalido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ ok: false, error: 'Solo admin' });
  next();
}

// ─── LOGIN ───────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pg.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.json({ ok: false, error: 'Usuario no encontrado' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ ok: false, error: 'Contrasena incorrecta' });
    const token = jwt.sign(
      { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre, agricultor_id: user.agricultor_id, grower_code: user.grower_code },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ ok: true, token, user: { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre, agricultor_id: user.agricultor_id, grower_code: user.grower_code } });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── USUARIOS ────────────────────────────────────────────
app.get('/api/usuarios', auth, adminOnly, async (req, res) => {
  try {
    const result = await pg.query('SELECT id, username, rol, nombre, agricultor_id, grower_code FROM usuarios ORDER BY id');
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/usuarios', auth, adminOnly, async (req, res) => {
  const { username, password, rol, nombre, agricultor_id, grower_code } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pg.query(
      'INSERT INTO usuarios (username, password, rol, nombre, agricultor_id, grower_code) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, rol, nombre',
      [username, hashed, rol, nombre, agricultor_id, grower_code]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── ÓRDENES ─────────────────────────────────────────────
app.get('/api/ordenes', auth, async (req, res) => {
  try {
    let query = 'SELECT * FROM ordenes ORDER BY created_at DESC';
    let params = [];
    if (req.user.rol === 'agricultor') {
      query = 'SELECT * FROM ordenes WHERE agricultor_id = $1 ORDER BY created_at DESC';
      params = [req.user.agricultor_id];
    }
    const result = await pg.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/ordenes', auth, adminOnly, async (req, res) => {
  const { id, proveedor, fecha, items, total, estado, notas, agricultor_id, oc_agricultor, solicitud_id } = req.body;
  try {
    const result = await pg.query(
      'INSERT INTO ordenes (id, proveedor, fecha, items, total, estado, notas, agricultor_id, oc_agricultor, solicitud_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [id, proveedor, fecha, JSON.stringify(items || []), total, estado || 'Pendiente', notas, agricultor_id, oc_agricultor, solicitud_id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/ordenes/:id', auth, adminOnly, async (req, res) => {
  const { estado, notas, oc_agricultor, solicitud_id, fecha_pago } = req.body;
  try {
    const result = await pg.query(
      'UPDATE ordenes SET estado=$1, notas=$2, oc_agricultor=$3, solicitud_id=$4, fecha_pago=$5 WHERE id=$6 RETURNING *',
      [estado, notas, oc_agricultor, solicitud_id, fecha_pago, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.delete('/api/ordenes/:id', auth, adminOnly, async (req, res) => {
  try {
    await pg.query('DELETE FROM ordenes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── SOLICITUDES ─────────────────────────────────────────
app.get('/api/solicitudes', auth, async (req, res) => {
  try {
    let query = 'SELECT * FROM solicitudes ORDER BY created_at DESC';
    let params = [];
    if (req.user.rol === 'agricultor') {
      query = 'SELECT * FROM solicitudes WHERE agricultor_id = $1 ORDER BY created_at DESC';
      params = [req.user.agricultor_id];
    }
    const result = await pg.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/solicitudes', auth, async (req, res) => {
  const { id, numero_oc, items, notas } = req.body;
  try {
    const result = await pg.query(
      'INSERT INTO solicitudes (id, agricultor_id, numero_oc, items, notas) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, req.user.agricultor_id, numero_oc, JSON.stringify(items || []), notas]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/solicitudes/:id', auth, adminOnly, async (req, res) => {
  const { estado, oc_sl_produce, notas } = req.body;
  try {
    const result = await pg.query(
      'UPDATE solicitudes SET estado=$1, oc_sl_produce=$2, notas=$3 WHERE id=$4 RETURNING *',
      [estado, oc_sl_produce, notas, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── PDF: SUBIR Y LEER CON CLAUDE AI ─────────────────────
app.post('/api/solicitudes/pdf', auth, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.json({ ok: false, error: 'No se recibio archivo' });
  try {
    // Leer el PDF como base64
    const pdfBase64 = fs.readFileSync(req.file.path).toString('base64');

    // Llamar a Claude AI para extraer datos
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: 'Extrae toda la informacion de esta orden de compra. Responde SOLO en JSON con este formato exacto sin markdown: {"numeroOC":"","fecha":"","agricultor":"","productos":[{"nombre":"","cantidad":0,"precio":0}],"total":0,"notas":""}'
            }
          ]
        }]
      })
    });

    const aiData = await response.json();
    const texto = aiData.content?.[0]?.text || '{}';
    let datos = {};
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { error: 'No se pudo parsear', raw: texto };
    }

    // Guardar ruta del PDF
    const pdfPath = req.file.filename;

    res.json({ ok: true, datos, pdfPath });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── SERVIR PDFs GUARDADOS ───────────────────────────────
app.get('/api/pdf/:filename', auth, (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
  res.sendFile(filePath);
});

// ─── MENSAJES ────────────────────────────────────────────
app.get('/api/mensajes', auth, async (req, res) => {
  try {
    const result = await pg.query(
      'SELECT * FROM mensajes WHERE de_id = $1 OR para_id = $1 ORDER BY fecha DESC',
      [req.user.username]
    );
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/mensajes', auth, async (req, res) => {
  const { para_id, texto } = req.body;
  try {
    const result = await pg.query(
      'INSERT INTO mensajes (de_id, para_id, texto) VALUES ($1,$2,$3) RETURNING *',
      [req.user.username, para_id, texto]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/mensajes/leer', auth, async (req, res) => {
  try {
    await pg.query('UPDATE mensajes SET leido = TRUE WHERE para_id = $1', [req.user.username]);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── iSOLVE ──────────────────────────────────────────────
app.get('/api/ventas', async (req, res) => {
  try {
    const d = await getIsolveData();
    res.json({ ok: true, data: d });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get('/api/growers', async (req, res) => {
  try {
    const d = await getIsolveData();
    const seen = {};
    const g = [];
    d.forEach(r => {
      if (!seen[r.sGrowerCode]) {
        seen[r.sGrowerCode] = true;
        g.push({ codigo: r.sGrowerCode, nombre: r.sGrowerName ? r.sGrowerName.trim() : '' });
      }
    });
    res.json({ ok: true, data: g });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get('/api/contratos', async (req, res) => {
  try {
    const d = await getIsolveData();
    const c = {};
    d.forEach(r => {
      const k = r.sGrowerCode + '-' + r.Season;
      if (!c[k]) {
        c[k] = { growerCodigo: r.sGrowerCode, growerNombre: r.sGrowerName ? r.sGrowerName.trim() : '', temporada: r.Season, liquidaciones: [], totalNeto: 0, ordenes: 0 };
      }
      c[k].totalNeto += r.Net || 0;
      c[k].ordenes++;
      if (r.sDocument && !c[k].liquidaciones.includes(r.sDocument)) c[k].liquidaciones.push(r.sDocument);
    });
    res.json({ ok: true, data: Object.values(c) });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── HEALTH ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'SL Produce API OK' });
});

// ─── ARRANCAR ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log('Backend SL Produce corriendo en puerto ' + PORT);
  await initDB();
});
