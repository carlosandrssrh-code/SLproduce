const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const fetch   = require('node-fetch');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET    = process.env.JWT_SECRET      || 'slproduce_secret_2025';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const UPLOADS_DIR   = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── MULTER ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── AZURE SQL ────────────────────────────────────────────
const sqlConfig = {
  user:     process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server:   process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt:                true,
    trustServerCertificate: true
  }
};

// Pool global — connect() es idempotente con mssql
let pool;
async function getPool() {
  if (!pool) pool = await sql.connect(sqlConfig);
  return pool;
}

// ─── CACHE iSOLVE ────────────────────────────────────────
let isolveCache     = null;
let isolveCacheTime = null;
const CACHE_MINUTES = 30;

async function getIsolveData() {
  const now = new Date();
  if (isolveCache && isolveCacheTime && (now - isolveCacheTime) < CACHE_MINUTES * 60 * 1000) {
    return isolveCache;
  }
  const p = await getPool();
  const result = await p.request().query('exec [sDevPdsSalesData]');
  isolveCache     = result.recordset;
  isolveCacheTime = now;
  return isolveCache;
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
    const p      = await getPool();
    const result = await p.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM usuarios WHERE username = @username');

    if (result.recordset.length === 0)
      return res.json({ ok: false, error: 'Usuario no encontrado' });

    const user  = result.recordset[0];
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
    const p      = await getPool();
    const result = await p.request()
      .query('SELECT id, username, rol, nombre, agricultor_id, grower_code FROM usuarios ORDER BY id');
    res.json({ ok: true, data: result.recordset });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/usuarios', auth, adminOnly, async (req, res) => {
  const { username, password, rol, nombre, agricultor_id, grower_code } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const p      = await getPool();
    const result = await p.request()
      .input('username',     sql.VarChar,  username)
      .input('password',     sql.VarChar,  hashed)
      .input('rol',          sql.VarChar,  rol)
      .input('nombre',       sql.VarChar,  nombre)
      .input('agricultor_id',sql.Int,      agricultor_id || null)
      .input('grower_code',  sql.VarChar,  grower_code   || null)
      .query(`
        INSERT INTO usuarios (username, password, rol, nombre, agricultor_id, grower_code)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.rol, INSERTED.nombre
        VALUES (@username, @password, @rol, @nombre, @agricultor_id, @grower_code)
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── ÓRDENES ─────────────────────────────────────────────
app.get('/api/ordenes', auth, async (req, res) => {
  try {
    const p = await getPool();
    let result;
    if (req.user.rol === 'agricultor') {
      result = await p.request()
        .input('agricultor_id', sql.Int, req.user.agricultor_id)
        .query('SELECT * FROM ordenes WHERE agricultor_id = @agricultor_id ORDER BY created_at DESC');
    } else {
      result = await p.request()
        .query('SELECT * FROM ordenes ORDER BY created_at DESC');
    }
    // Parsear items si viene como string JSON
    const data = result.recordset.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || [])
    }));
    res.json({ ok: true, data });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/ordenes', auth, adminOnly, async (req, res) => {
  const { id, proveedor, fecha, items, total, estado, notas, agricultor_id, oc_agricultor, solicitud_id } = req.body;
  try {
    const p      = await getPool();
    const result = await p.request()
      .input('id',           sql.VarChar,  id)
      .input('proveedor',    sql.VarChar,  proveedor)
      .input('fecha',        sql.VarChar,  fecha)
      .input('items',        sql.NVarChar, JSON.stringify(items || []))
      .input('total',        sql.Decimal,  total)
      .input('estado',       sql.VarChar,  estado || 'Pendiente')
      .input('notas',        sql.NVarChar, notas        || null)
      .input('agricultor_id',sql.Int,      agricultor_id || null)
      .input('oc_agricultor',sql.VarChar,  oc_agricultor || null)
      .input('solicitud_id', sql.VarChar,  solicitud_id  || null)
      .query(`
        INSERT INTO ordenes (id, proveedor, fecha, items, total, estado, notas, agricultor_id, oc_agricultor, solicitud_id)
        OUTPUT INSERTED.*
        VALUES (@id, @proveedor, @fecha, @items, @total, @estado, @notas, @agricultor_id, @oc_agricultor, @solicitud_id)
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/ordenes/:id', auth, adminOnly, async (req, res) => {
  const { estado, notas, oc_agricultor, solicitud_id, fecha_pago } = req.body;
  try {
    const p      = await getPool();
    const result = await p.request()
      .input('estado',       sql.VarChar, estado)
      .input('notas',        sql.NVarChar,notas        || null)
      .input('oc_agricultor',sql.VarChar, oc_agricultor || null)
      .input('solicitud_id', sql.VarChar, solicitud_id  || null)
      .input('fecha_pago',   sql.VarChar, fecha_pago    || null)
      .input('id',           sql.VarChar, req.params.id)
      .query(`
        UPDATE ordenes
        SET estado=@estado, notas=@notas, oc_agricultor=@oc_agricultor, solicitud_id=@solicitud_id, fecha_pago=@fecha_pago
        OUTPUT INSERTED.*
        WHERE id=@id
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.delete('/api/ordenes/:id', auth, adminOnly, async (req, res) => {
  try {
    const p = await getPool();
    await p.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM ordenes WHERE id = @id');
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── SOLICITUDES ─────────────────────────────────────────
app.get('/api/solicitudes', auth, async (req, res) => {
  try {
    const p = await getPool();
    let result;
    if (req.user.rol === 'agricultor') {
      result = await p.request()
        .input('agricultor_id', sql.Int, req.user.agricultor_id)
        .query('SELECT * FROM solicitudes WHERE agricultor_id = @agricultor_id ORDER BY created_at DESC');
    } else {
      result = await p.request()
        .query('SELECT * FROM solicitudes ORDER BY created_at DESC');
    }
    const data = result.recordset.map(r => ({
      ...r,
      items:    typeof r.items     === 'string' ? JSON.parse(r.items)     : (r.items     || []),
      pdf_datos:typeof r.pdf_datos === 'string' ? JSON.parse(r.pdf_datos) : (r.pdf_datos || null)
    }));
    res.json({ ok: true, data });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/solicitudes', auth, async (req, res) => {
  const { id, numero_oc, items, notas } = req.body;
  try {
    const p      = await getPool();
    const result = await p.request()
      .input('id',           sql.VarChar,  id)
      .input('agricultor_id',sql.Int,      req.user.agricultor_id || null)
      .input('numero_oc',    sql.VarChar,  numero_oc || null)
      .input('items',        sql.NVarChar, JSON.stringify(items || []))
      .input('notas',        sql.NVarChar, notas || null)
      .query(`
        INSERT INTO solicitudes (id, agricultor_id, numero_oc, items, notas)
        OUTPUT INSERTED.*
        VALUES (@id, @agricultor_id, @numero_oc, @items, @notas)
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/solicitudes/:id', auth, adminOnly, async (req, res) => {
  const { estado, oc_sl_produce, notas } = req.body;
  try {
    const p      = await getPool();
    const result = await p.request()
      .input('estado',       sql.VarChar,  estado)
      .input('oc_sl_produce',sql.VarChar,  oc_sl_produce || null)
      .input('notas',        sql.NVarChar, notas         || null)
      .input('id',           sql.VarChar,  req.params.id)
      .query(`
        UPDATE solicitudes
        SET estado=@estado, oc_sl_produce=@oc_sl_produce, notas=@notas
        OUTPUT INSERTED.*
        WHERE id=@id
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── PDF: SUBIR Y LEER CON CLAUDE AI ─────────────────────
app.post('/api/solicitudes/pdf', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.json({ ok: false, error: 'No se recibio archivo' });
  try {
    const pdfBase64 = fs.readFileSync(req.file.path).toString('base64');

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
    const texto  = aiData.content?.[0]?.text || '{}';
    let datos    = {};
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { error: 'No se pudo parsear', raw: texto };
    }

    res.json({ ok: true, datos, pdfPath: req.file.filename });
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
    const p      = await getPool();
    const result = await p.request()
      .input('username', sql.VarChar, req.user.username)
      .query('SELECT * FROM mensajes WHERE de_id = @username OR para_id = @username ORDER BY fecha DESC');
    res.json({ ok: true, data: result.recordset });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/mensajes', auth, async (req, res) => {
  const { para_id, texto } = req.body;
  try {
    const p      = await getPool();
    const result = await p.request()
      .input('de_id',  sql.VarChar,  req.user.username)
      .input('para_id',sql.VarChar,  para_id)
      .input('texto',  sql.NVarChar, texto)
      .query(`
        INSERT INTO mensajes (de_id, para_id, texto)
        OUTPUT INSERTED.*
        VALUES (@de_id, @para_id, @texto)
      `);
    res.json({ ok: true, data: result.recordset[0] });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.put('/api/mensajes/leer', auth, async (req, res) => {
  try {
    const p = await getPool();
    await p.request()
      .input('username', sql.VarChar, req.user.username)
      .query('UPDATE mensajes SET leido = 1 WHERE para_id = @username');
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
    const d    = await getIsolveData();
    const seen = {};
    const g    = [];
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
  try { 
    await getPool(); 
    console.log('Conectado a Azure SQL correctamente'); 
  } catch (e) { 
    console.error('Error conectando a Azure SQL:', e.message); 
  } 
});

