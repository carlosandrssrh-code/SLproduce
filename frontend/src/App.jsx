import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── API HELPER ───────────────────────────────────────────
const api = {
  getToken: () => localStorage.getItem("slp_token"),

  headers: () => ({
    "Content-Type": "application/json",
    ...(localStorage.getItem("slp_token")
      ? { Authorization: `Bearer ${localStorage.getItem("slp_token")}` }
      : {}),
  }),

  get: async (path) => {
    const res = await fetch(`${API_URL}${path}`, { headers: api.headers() });
    return res.json();
  },

  post: async (path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: api.headers(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  put: async (path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: api.headers(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  delete: async (path) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: api.headers(),
    });
    return res.json();
  },

  // ── api.upload: multipart/form-data con JWT, sin Content-Type manual
  // (el browser lo pone solo con el boundary correcto al usar FormData)
  upload: async (path, fieldName, file) => {
    // Validar que sea PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return { ok: false, error: "Solo se permiten archivos PDF (.pdf)" };
    }
    // Validar tamaño máximo 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return { ok: false, error: "El archivo no puede superar 10 MB" };
    }
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        // ⚠️ NO incluir Content-Type aquí — el browser lo genera con el boundary
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Error del servidor (${res.status}): ${text.slice(0, 120)}` };
      }
      return res.json();
    } catch (err) {
      return { ok: false, error: "No se pudo conectar al servidor. ¿Está corriendo el backend?" };
    }
  },

  // Alias para compatibilidad con código anterior
  uploadPDF: async (file) => api.upload("/api/solicitudes/pdf", "pdf", file),
};

// ─── PALETA ───────────────────────────────────────────────
const C = {
  bg: "#07100a",
  panel: "#0e1a11",
  panelAlt: "#121f15",
  border: "#1a2e1e",
  accent: "#4ade80",
  accentDim: "#22c55e",
  accentMuted: "#166534",
  text: "#e6f4ea",
  muted: "#5a7a60",
  danger: "#f87171",
  warn: "#fbbf24",
  info: "#60a5fa",
  purple: "#c084fc",
};

// ─── CATÁLOGO ─────────────────────────────────────────────
const CATALOGO = [
  { id: 1, cultivo: "Bell Pepper", nombre: "Caja 11/9 Bushel",  unidad: "caja",  precio: 42.0 },
  { id: 2, cultivo: "Bell Pepper", nombre: "Eurobox Máquina",   unidad: "pieza", precio: 38.5 },
  { id: 3, cultivo: "Bell Pepper", nombre: "Eurobox Manual",    unidad: "pieza", precio: 36.0 },
  { id: 4, cultivo: "Bell Pepper", nombre: "RPC 6423",          unidad: "pieza", precio: 28.0 },
  { id: 5, cultivo: "Bell Pepper", nombre: "RPC 6425",          unidad: "pieza", precio: 29.5 },
  { id: 6, cultivo: "Bell Pepper", nombre: "RPC 6429",          unidad: "pieza", precio: 31.0 },
  { id: 7, cultivo: "Bell Pepper", nombre: "Cartón PERO",       unidad: "pieza", precio: 22.0 },
  { id: 8, cultivo: "Pepino",      nombre: "Caja 11/9 Bushel",  unidad: "caja",  precio: 40.0 },
  { id: 9, cultivo: "Pepino",      nombre: "RPC 6423",          unidad: "pieza", precio: 28.0 },
  { id: 10, cultivo: "Pepino",     nombre: "RPC 6425",          unidad: "pieza", precio: 29.5 },
  { id: 11, cultivo: "Pepino",     nombre: "RPC 6419",          unidad: "pieza", precio: 27.0 },
  { id: 12, cultivo: "Pepino",     nombre: "24 Senior",         unidad: "pieza", precio: 19.0 },
  { id: 13, cultivo: "Pepino",     nombre: "24 Jumbo",          unidad: "pieza", precio: 21.0 },
  { id: 14, cultivo: "Pepino",     nombre: "36 Senior",         unidad: "pieza", precio: 17.5 },
  { id: 15, cultivo: "Pepino",     nombre: "36 Jumbo",          unidad: "pieza", precio: 19.5 },
];

const AGRICULTORES = [
  { id: 1, nombre: "SL Agrícola" },
  { id: 2, nombre: "CACO" },
  { id: 3, nombre: "CAT" },
  { id: 4, nombre: "CAMPO JYF" },
  { id: 5, nombre: "PRODUX" },
  { id: 6, nombre: "AGER" },
];

const PROVEEDORES = ["IFCO", "International Paper", "Celulosa", "Westrock"];

const GROWER_MAP = { "001": 1, "002": 2, "006": 3, "005": 4, "013": 5, "032": 6 };

const CREDITO_PROVEEDORES_INIT = [
  { proveedor: "IFCO",               limiteCredito: 500000, plazoDias: 30,  proximoPago: "2025-04-15" },
  { proveedor: "International Paper",limiteCredito: 350000, plazoDias: 60,  proximoPago: "2025-04-30" },
  { proveedor: "Celulosa",           limiteCredito: 200000, plazoDias: 30,  proximoPago: "2025-04-10" },
  { proveedor: "Westrock",           limiteCredito: 280000, plazoDias: 90,  proximoPago: "2025-05-20" },
];

const CONTRATOS_HISTORICOS = [
  { id: "CNT-2024-001", agricultorId: 1, cultivo: "Bell Pepper", temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-001", totalCargos: 84000 },
  { id: "CNT-2024-002", agricultorId: 2, cultivo: "Pepino",      temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-002", totalCargos: 56000 },
  { id: "CNT-2024-003", agricultorId: 3, cultivo: "Bell Pepper", temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-003", totalCargos: 72000 },
  { id: "CNT-2024-004", agricultorId: 4, cultivo: "Pepino",      temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-004", totalCargos: 48000 },
  { id: "CNT-2024-005", agricultorId: 5, cultivo: "Bell Pepper", temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-005", totalCargos: 91000 },
  { id: "CNT-2024-006", agricultorId: 6, cultivo: "Pepino",      temporada: "2024-B", estado: "Cerrado", liquidacion: "LIQ-2024-006", totalCargos: 63000 },
];

// ─── HELPERS ──────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

const estadoColor = (e) => {
  if (e === "Entregada" || e === "Activo")  return { color: C.accent,  bg: "#052e16" };
  if (e === "Pagada")                       return { color: "#a3e635", bg: "#1a2e00" };
  if (e === "En tránsito")                  return { color: C.warn,    bg: "#451a03" };
  if (e === "Pendiente")                    return { color: C.info,    bg: "#172554" };
  if (e === "En revision" || e === "En revisión") return { color: C.warn, bg: "#451a03" };
  if (e === "Aprobada")                     return { color: C.accent,  bg: "#052e16" };
  if (e === "Cancelada" || e === "Cerrado") return { color: C.danger,  bg: "#450a0a" };
  return { color: C.muted, bg: "#1a1a1a" };
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── COMPONENTES BASE ─────────────────────────────────────
const Badge = ({ estado }) => {
  const ec = estadoColor(estado);
  return (
    <span style={{ background: ec.bg, color: ec.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {estado}
    </span>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, ...style }}>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div>
    {label && <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 5, letterSpacing: 1 }}>{label}</label>}
    <input {...props} style={{ width: "100%", background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", ...props.style }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 5, letterSpacing: 1 }}>{label}</label>}
    <select {...props} style={{ width: "100%", background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", ...props }) => {
  const styles = {
    primary: { background: C.accentMuted, color: "#fff", border: "none" },
    ghost:   { background: "none", color: C.muted, border: `1px solid ${C.border}` },
    danger:  { background: "#450a0a", color: C.danger, border: "none" },
  };
  return (
    <button {...props} style={{ borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
};

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
    Cargando...
  </div>
);

// ─── HOOK iSOLVE ──────────────────────────────────────────
function useIsolveData() {
  const [data, setData] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ventasRes, contratosRes] = await Promise.all([
        api.get("/api/ventas"),
        api.get("/api/contratos"),
      ]);
      if (ventasRes.ok)   setData(ventasRes.data);
      if (contratosRes.ok) setContratos(contratosRes.data);
      setLastFetch(new Date());
    } catch {
      setError("No se puede conectar al backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  return { data, contratos, loading, error, lastFetch, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════
// ─── LOGIN ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !pass) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api.post("/api/login", { username: user, password: pass });
      if (data.ok) {
        // ✅ Guardar token JWT en localStorage
        localStorage.setItem("slp_token", data.token);
        localStorage.setItem("slp_user",  JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setErr(data.error || "Usuario o contraseña incorrectos");
      }
    } catch {
      setErr("No se puede conectar al servidor. ¿Está corriendo el backend?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -20%, #052e1644, transparent)" }} />
      <div style={{ width: "100%", maxWidth: 400, padding: 16, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: C.accent }}>🌿 SL PRODUCE</div>
          <p style={{ color: C.muted, fontSize: 14, margin: "6px 0 0" }}>Sistema de Compras & iSolve</p>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="USUARIO" value={user} onChange={e => setUser(e.target.value)} placeholder="Ingresa tu usuario"
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <Input label="CONTRASEÑA" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
            {err && <div style={{ color: C.danger, fontSize: 13, textAlign: "center", background: "#450a0a44", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            <Btn onClick={handleLogin} style={{ width: "100%", padding: 13, marginTop: 4, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Btn>
          </div>
        </Card>
        <p style={{ textAlign: "center", color: C.muted, fontSize: 11, marginTop: 20 }}>
          Demo: admin/admin123 · slagricola · caco · cat · campojyf · produx · ager
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────
const NAV_ADMIN = [
  { id: "dashboard", label: "Dashboard",          icon: "◈" },
  { id: "ordenes",   label: "Órdenes de Compra",  icon: "📋" },
  { id: "catalogo",  label: "Catálogo",            icon: "📦" },
  { id: "isolve",    label: "iSolve",              icon: "🌾" },
  { id: "credito",   label: "Crédito Proveedores", icon: "💳" },
  { id: "historial", label: "Historial Contratos", icon: "📁" },
  { id: "mensajes",  label: "Mensajes",            icon: "💬" },
  { id: "usuarios",  label: "Usuarios",            icon: "👥" },
  { id: "reportes",  label: "Reportes",            icon: "📊" },
];

const NAV_AGR = [
  { id: "inicio",         label: "Mi Panel",          icon: "◈" },
  { id: "solicitar",      label: "Pedir Materiales",   icon: "📦" },
  { id: "mis-pedidos",    label: "Mis Pedidos",        icon: "📋" },
  { id: "entregas",       label: "Entregas Recibidas", icon: "✅" },
  { id: "contratos",      label: "Mis Contratos",      icon: "📄" },
  { id: "historial",      label: "Historial",          icon: "📁" },
  { id: "mensajes",       label: "Mensajes",           icon: "💬" },
];

function Sidebar({ nav, active, onChange, usuario, onLogout, badges = {} }) {
  return (
    <aside style={{ width: 230, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ padding: "24px 18px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: C.accent }}>🌿 SL PRODUCE</div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{usuario.rol === "admin" ? "Administrador" : "Portal Agricultor"}</div>
        </div>
      </div>
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => onChange(n.id)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", background: active === n.id ? C.accentMuted + "33" : "none", border: "none", borderRadius: 8, color: active === n.id ? C.accent : C.muted, cursor: "pointer", fontSize: 13, fontWeight: active === n.id ? 700 : 400, marginBottom: 2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span>{n.icon}</span>{n.label}</span>
            {badges[n.id] > 0 && <span style={{ background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{badges[n.id]}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: C.text, fontSize: 13, marginBottom: 6 }}>{usuario.nombre}</div>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, width: "100%" }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── DASHBOARD ADMIN ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function DashboardAdmin({ ordenes, solicitudes }) {
  const totalOrdenes    = ordenes.reduce((s, o) => s + Number(o.total || 0), 0);
  const sinDireccionar  = ordenes.filter(o => !o.agricultor_id);
  const pendientes      = solicitudes.filter(s => s.estado === "En revision" || s.estado === "En revisión");

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 26, margin: "0 0 4px" }}>Dashboard</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 26px" }}>Resumen operativo</p>

      {sinDireccionar.length > 0 && (
        <div style={{ background: "#1c0a00", border: `1px solid ${C.danger}55`, borderLeft: `4px solid ${C.danger}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <span style={{ color: C.danger, fontWeight: 800 }}>⚠️ {sinDireccionar.length} orden{sinDireccionar.length > 1 ? "es" : ""} sin direccionar</span>
          <span style={{ color: C.muted, fontSize: 12, marginLeft: 10 }}>— ir a Órdenes de Compra para asignarlas</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Órdenes activas",    val: ordenes.length,        icon: "📋", color: C.accent },
          { label: "Total compras",      val: fmt(totalOrdenes),     icon: "💰", color: C.accentDim },
          { label: "Sin direccionar",    val: sinDireccionar.length, icon: "🔴", color: sinDireccionar.length > 0 ? C.danger : C.muted },
          { label: "Solicitudes pend.", val: pendientes.length,      icon: "📥", color: C.warn },
        ].map((c, i) => (
          <Card key={i} style={{ padding: "18px 16px" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ color: c.color, fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>{c.val}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{c.label}</div>
          </Card>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 15, margin: "0 0 12px" }}>Órdenes recientes</h2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {ordenes.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Sin órdenes aún</div>}
        {ordenes.slice(0, 8).map((o, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: i < ordenes.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{o.id}</span>
              {!o.agricultor_id && <span style={{ background: "#450a0a", color: C.danger, borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>Sin asignar</span>}
              <span style={{ color: C.muted, fontSize: 12 }}>{o.proveedor}</span>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{fmt(o.total)}</span>
              <Badge estado={o.estado} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── ÓRDENES DE COMPRA ────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function Ordenes({ ordenes, setOrdenes, solicitudes, setSolicitudes }) {
  const [buscar, setBuscar]     = useState("");
  const [filtro, setFiltro]     = useState("Todos");
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);

  // form nueva orden
  const [proveedor, setProveedor]         = useState("");
  const [fecha, setFecha]                 = useState(todayStr());
  const [fechaEntrega, setFechaEntrega]   = useState("");
  const [agricultorId, setAgricultorId]   = useState("");
  const [solicitudId, setSolicitudId]     = useState("");
  const [ocAgricultor, setOcAgricultor]   = useState("");
  const [lineas, setLineas]               = useState([{ materialId: "", cantidad: "" }]);

  const total = lineas.reduce((s, l) => {
    const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
    return s + (mat?.precio || 0) * (parseInt(l.cantidad) || 0);
  }, 0);

  const filtradas = ordenes.filter(o =>
    (filtro === "Todos" || (filtro === "Sin direccionar" ? !o.agricultor_id : o.estado === filtro)) &&
    (o.id?.toLowerCase().includes(buscar.toLowerCase()) || o.proveedor?.toLowerCase().includes(buscar.toLowerCase()))
  );

  const nextId = `OC-2025-${String(ordenes.length + 1).padStart(3, "0")}`;

  const resetForm = () => {
    setProveedor(""); setFecha(todayStr()); setFechaEntrega("");
    setAgricultorId(""); setSolicitudId(""); setOcAgricultor("");
    setLineas([{ materialId: "", cantidad: "" }]);
  };

  // ✅ POST /api/ordenes
  const handleGuardar = async () => {
    if (!proveedor || !ocAgricultor || !lineas.some(l => l.materialId)) return;
    setSaving(true);
    const items = lineas.filter(l => l.materialId).map(l => {
      const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
      return { materialId: parseInt(l.materialId), nombre: mat?.nombre, cantidad: parseInt(l.cantidad), precio: mat?.precio };
    });
    const res = await api.post("/api/ordenes", {
      id: nextId, proveedor, fecha, items, total,
      estado: "Pendiente",
      agricultor_id: agricultorId ? parseInt(agricultorId) : null,
      oc_agricultor: ocAgricultor,
      solicitud_id: solicitudId || null,
    });
    if (res.ok) {
      setOrdenes(prev => [{ ...res.data, lineas: items, items: items.length, direccionado: !!agricultorId }, ...prev]);
      if (solicitudId) {
        await api.put(`/api/solicitudes/${solicitudId}`, { estado: "Aprobada", oc_sl_produce: nextId });
        setSolicitudes(prev => prev.map(s => s.id === solicitudId ? { ...s, estado: "Aprobada", oc_sl_produce: nextId } : s));
      }
      resetForm();
      setModal(false);
    }
    setSaving(false);
  };

  // ✅ PUT /api/ordenes/:id — avanzar estado
  const avanzar = async (id) => {
    const o = ordenes.find(x => x.id === id);
    const next = { "Pendiente": "En tránsito", "En tránsito": "Entregada" };
    if (!next[o.estado]) return;
    const res = await api.put(`/api/ordenes/${id}`, { ...o, estado: next[o.estado] });
    if (res.ok) setOrdenes(prev => prev.map(x => x.id === id ? { ...x, estado: next[o.estado] } : x));
  };

  // ✅ PUT /api/ordenes/:id — direccionar
  const direccionar = async (id, agr_id) => {
    const res = await api.put(`/api/ordenes/${id}`, { agricultor_id: parseInt(agr_id) });
    if (res.ok) setOrdenes(prev => prev.map(o => o.id === id ? { ...o, agricultor_id: parseInt(agr_id), direccionado: true } : o));
  };

  return (
    <div>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", color: C.accent, margin: 0 }}>Nueva Orden de Compra</h3>
                <span style={{ color: C.muted, fontSize: 12 }}>{nextId}</span>
              </div>
              <button onClick={() => { setModal(false); resetForm(); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <Select label="Proveedor *" value={proveedor} onChange={e => setProveedor(e.target.value)}>
                <option value="">Seleccionar...</option>
                {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select label="Direccionar a (opcional)" value={agricultorId} onChange={e => { setAgricultorId(e.target.value); setSolicitudId(""); setOcAgricultor(""); }}>
                <option value="">Sin direccionar</option>
                {AGRICULTORES.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </Select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: agricultorId ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ color: C.danger, fontSize: 11, display: "block", marginBottom: 6, letterSpacing: 1 }}>🔗 OC DEL AGRICULTOR *</label>
                <input value={ocAgricultor} onChange={e => setOcAgricultor(e.target.value)} placeholder="Ej: OC-AGR-001"
                  style={{ width: "100%", background: ocAgricultor ? "#0a1a0a" : C.panelAlt, border: `1px solid ${ocAgricultor ? C.accent : C.danger}55`, color: C.text, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              {agricultorId && (
                <Select label="Solicitud interna (opcional)" value={solicitudId} onChange={e => { setSolicitudId(e.target.value); const s = solicitudes.find(x => x.id === e.target.value); if (s?.numero_oc) setOcAgricultor(s.numero_oc); }}>
                  <option value="">Ninguna</option>
                  {solicitudes.filter(s => !agricultorId || s.agricultor_id === parseInt(agricultorId)).map(s => (
                    <option key={s.id} value={s.id}>{s.id} {s.numero_oc ? `· ${s.numero_oc}` : ""}</option>
                  ))}
                </Select>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <Input label="FECHA DE ORDEN" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              <Input label="ENTREGA REQUERIDA *" type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 8, letterSpacing: 1 }}>MATERIALES</label>
              {lineas.map((l, i) => {
                const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
                const sub = (mat?.precio || 0) * (parseInt(l.cantidad) || 0);
                return (
                  <div key={i} style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 36px", gap: 8 }}>
                      <select value={l.materialId} onChange={e => { const nl = [...lineas]; nl[i].materialId = e.target.value; setLineas(nl); }}
                        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
                        <option value="">Seleccionar material...</option>
                        {["Bell Pepper", "Pepino"].map(cult => (
                          <optgroup key={cult} label={cult}>
                            {CATALOGO.filter(m => m.cultivo === cult).map(m => (
                              <option key={m.id} value={m.id}>{m.nombre} — {fmt(m.precio)}/{m.unidad}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input type="number" min="1" placeholder="Cant." value={l.cantidad} onChange={e => { const nl = [...lineas]; nl[i].cantidad = e.target.value; setLineas(nl); }}
                        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 12 }} />
                      <button onClick={() => lineas.length > 1 && setLineas(lineas.filter((_, idx) => idx !== i))}
                        style={{ background: lineas.length > 1 ? "#450a0a" : C.panelAlt, border: "none", color: C.danger, borderRadius: 8, cursor: "pointer" }}>×</button>
                    </div>
                    {mat && l.cantidad && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ color: C.muted, fontSize: 11 }}>{mat.cultivo} · {fmt(mat.precio)} × {l.cantidad}</span>
                        <span style={{ color: C.accentDim, fontWeight: 700, fontSize: 12 }}>{fmt(sub)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setLineas([...lineas, { materialId: "", cantidad: "" }])}
                style={{ background: "none", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 16px", cursor: "pointer", width: "100%", fontSize: 13 }}>
                + Agregar material
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div>
                <div style={{ color: C.muted, fontSize: 11 }}>TOTAL ESTIMADO</div>
                <div style={{ color: C.accent, fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>{fmt(total)}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="ghost" onClick={() => { setModal(false); resetForm(); }}>Cancelar</Btn>
                <Btn onClick={handleGuardar} style={{ opacity: (proveedor && ocAgricultor) ? 1 : 0.5 }} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Orden"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: 0 }}>Órdenes de Compra</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{filtradas.length} órdenes</p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Nueva Orden</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar..."
          style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
        {["Todos", "Sin direccionar", "Pendiente", "En tránsito", "Entregada"].map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            style={{ background: filtro === e ? C.accentMuted : C.panel, border: `1px solid ${filtro === e ? C.accent : C.border}`, color: filtro === e ? "#fff" : C.muted, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12 }}>
            {e}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 0.9fr 1fr 0.8fr 1fr", gap: 0, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 11, letterSpacing: 1 }}>
          <span>ID SL</span><span>OC AGRIC.</span><span>PROVEEDOR</span><span>FECHA</span><span>ENTREGA</span><span>TOTAL</span><span>ESTADO</span>
        </div>
        {filtradas.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Sin órdenes</div>}
        {filtradas.map((o, i) => {
          const agr = AGRICULTORES.find(a => a.id === o.agricultor_id);
          const items = Array.isArray(o.items) ? o.items : (o.lineas || []);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 0.9fr 1fr 0.8fr 1fr", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{o.id}</span>
              <span style={{ color: "#a3e635", fontSize: 12 }}>{o.oc_agricultor || "—"}</span>
              <div>
                <div style={{ color: C.text, fontSize: 13 }}>{o.proveedor}</div>
                {agr && <div style={{ color: C.muted, fontSize: 10 }}>{agr.nombre}</div>}
              </div>
              <span style={{ color: C.muted, fontSize: 12 }}>{o.fecha}</span>
              <span style={{ color: o.fecha_entrega ? C.warn : C.muted, fontSize: 12 }}>{o.fecha_entrega || "—"}</span>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{fmt(o.total)}</span>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                <Badge estado={o.estado} />
                {o.estado !== "Entregada" && o.estado !== "Pagada" && (
                  <button onClick={() => avanzar(o.id)} title="Avanzar estado"
                    style={{ background: C.accentMuted + "44", border: "none", color: C.accent, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>→</button>
                )}
                {!o.agricultor_id && (
                  <select defaultValue="" onChange={e => e.target.value && direccionar(o.id, e.target.value)}
                    style={{ background: "#450a0a", border: `1px solid ${C.danger}55`, color: C.danger, borderRadius: 6, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>
                    <option value="" disabled>⚠ Sin asignar</option>
                    {AGRICULTORES.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─── CATÁLOGO ─────────────────────────────────────────────
function Catalogo() {
  const [filtro, setFiltro] = useState("Todos");
  const cultivos = ["Todos", ...new Set(CATALOGO.map(p => p.cultivo))];
  const filtrados = filtro === "Todos" ? CATALOGO : CATALOGO.filter(p => p.cultivo === filtro);
  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Catálogo de Materiales</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>{CATALOGO.length} productos disponibles</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {cultivos.map(c => (
          <button key={c} onClick={() => setFiltro(c)}
            style={{ background: filtro === c ? C.accentMuted : C.panel, border: `1px solid ${filtro === c ? C.accent : C.border}`, color: filtro === c ? "#fff" : C.muted, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12 }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {filtrados.map(p => (
          <Card key={p.id} style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 26 }}>{p.cultivo === "Bell Pepper" ? "🫑" : "🥒"}</div>
              <span style={{ background: C.accentMuted + "22", color: C.accentDim, borderRadius: 6, padding: "2px 8px", fontSize: 10 }}>{p.cultivo}</span>
            </div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.nombre}</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Unidad: {p.unidad}</div>
            <div style={{ color: C.accent, fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>{fmt(p.precio)}</div>
            <div style={{ color: C.muted, fontSize: 11 }}>precio / {p.unidad}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── iSOLVE ADMIN ─────────────────────────────────────────
function IsolveAdmin({ entregas, setEntregas, contratos: contratosApp, ordenes, setOrdenes }) {
  const [tabActiva, setTabActiva] = useState("entregas");
  const [filtroAgr, setFiltroAgr] = useState("Todos");
  const [filtroISolveAgr, setFiltroISolveAgr] = useState("Todos");
  const [filtroTemporada, setFiltroTemporada] = useState("Todos");
  const { data: isolveData, contratos: isolveContratos, loading, error, lastFetch, refetch } = useIsolveData();

  const filtradas = filtroAgr === "Todos" ? entregas : entregas.filter(e => e.agricultorId === parseInt(filtroAgr));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: 0 }}>iSolve</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            {error ? <span style={{ color: C.danger }}>⚠️ {error}</span>
              : loading ? <span style={{ color: C.warn }}>⏳ Conectando a iSolve...</span>
              : lastFetch ? <span>✅ Actualizado: {lastFetch.toLocaleTimeString()}</span>
              : "Datos de iSolve"}
          </p>
        </div>
        <Btn variant="ghost" onClick={refetch} disabled={loading}>🔄 Actualizar</Btn>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[["entregas", "📦 Entregas Registradas"], ["isolve", "🌾 Datos iSolve en Vivo"], ["contratos_isv", "📋 Contratos iSolve"]].map(([id, label]) => (
          <button key={id} onClick={() => setTabActiva(id)} style={{
            background: tabActiva === id ? C.accentMuted : "transparent",
            border: `1px solid ${tabActiva === id ? C.accent : C.border}`,
            borderBottom: tabActiva === id ? `1px solid ${C.accentMuted}` : `1px solid ${C.border}`,
            color: tabActiva === id ? "#fff" : C.muted,
            borderRadius: "8px 8px 0 0", padding: "8px 16px", cursor: "pointer", fontSize: 13
          }}>{label}</button>
        ))}
      </div>

      {tabActiva === "entregas" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontSize: 13, alignSelf: "center" }}>Filtrar:</span>
            <button onClick={() => setFiltroAgr("Todos")} style={{ background: filtroAgr === "Todos" ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Todos</button>
            {AGRICULTORES.map(a => (
              <button key={a.id} onClick={() => setFiltroAgr(String(a.id))} style={{ background: filtroAgr === String(a.id) ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>{a.nombre}</button>
            ))}
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr 1.2fr 0.8fr 1fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 11, letterSpacing: 1 }}>
              <span>ID</span><span>AGRICULTOR</span><span>CONTRATO</span><span>LIQUIDACIÓN</span><span>CANT.</span><span>MATERIAL</span><span>TOTAL</span>
            </div>
            {filtradas.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Sin entregas registradas</div>}
            {filtradas.map((e, i) => {
              const agr = AGRICULTORES.find(a => a.id === e.agricultorId);
              const mat = CATALOGO.find(m => m.id === e.materialId);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr 1.2fr 0.8fr 1fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{e.id}</span>
                  <span style={{ color: C.text }}>{agr?.nombre}</span>
                  <span style={{ color: C.info }}>{e.contratoId}</span>
                  <span style={{ color: C.purple }}>{e.liquidacionId}</span>
                  <span style={{ color: C.text }}>{e.cantidad}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{mat?.nombre}</span>
                  <span style={{ color: C.warn, fontWeight: 700 }}>{fmt(e.cantidad * e.precio)}</span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tabActiva === "isolve" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button onClick={() => setFiltroISolveAgr("Todos")} style={{ background: filtroISolveAgr === "Todos" ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Todos</button>
            {AGRICULTORES.map(a => (
              <button key={a.id} onClick={() => setFiltroISolveAgr(String(a.id))} style={{ background: filtroISolveAgr === String(a.id) ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>{a.nombre}</button>
            ))}
          </div>
          {loading && <Spinner />}
          {error && <div style={{ textAlign: "center", color: C.danger, padding: 40 }}>{error}</div>}
          {!loading && !error && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 11, letterSpacing: 1 }}>
                <span>ORDEN</span><span>CLIENTE</span><span>AGRICULTOR</span><span>PRODUCTO</span><span>CAJAS</span><span>NETO</span><span>TEMPORADA</span><span>LIQUIDACIÓN</span>
              </div>
              {isolveData
                .filter(r => filtroISolveAgr === "Todos" ? GROWER_MAP[r.sGrowerCode] !== undefined : GROWER_MAP[r.sGrowerCode] === parseInt(filtroISolveAgr))
                .slice(0, 200)
                .map((r, i) => {
                  const agr = AGRICULTORES.find(a => a.id === GROWER_MAP[r.sGrowerCode]);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                      <span style={{ color: C.accent, fontWeight: 700 }}>{r.sOrderNo}</span>
                      <span style={{ color: C.text, fontSize: 11 }}>{r.CustomerName?.substring(0, 25)}</span>
                      <span style={{ color: C.info, fontSize: 11 }}>{agr?.nombre || r.sGrowerCode}</span>
                      <span style={{ color: C.muted, fontSize: 11 }}>{r.CommName} {r.VarName}</span>
                      <span style={{ color: C.text }}>{r.Pkgs}</span>
                      <span style={{ color: C.warn, fontWeight: 700 }}>${r.Net?.toLocaleString()}</span>
                      <span style={{ color: C.purple }}>{r.Season}</span>
                      <span style={{ color: C.accent, fontSize: 11 }}>{r.sDocument}</span>
                    </div>
                  );
                })}
            </Card>
          )}
        </div>
      )}

      {tabActiva === "contratos_isv" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Temporada:</span>
            <button onClick={() => setFiltroTemporada("Todos")} style={{ background: filtroTemporada === "Todos" ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Todas</button>
            {[...new Set(isolveContratos.map(c => c.temporada))].sort((a, b) => b - a).map(t => (
              <button key={t} onClick={() => setFiltroTemporada(t)} style={{ background: filtroTemporada === t ? C.accentMuted : C.panel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>{t}</button>
            ))}
          </div>
          {loading && <Spinner />}
          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
              {isolveContratos
                .filter(c => GROWER_MAP[c.growerCodigo] !== undefined && (filtroTemporada === "Todos" || c.temporada === filtroTemporada))
                .sort((a, b) => b.temporada - a.temporada)
                .map((c, i) => {
                  const agr = AGRICULTORES.find(a => a.id === GROWER_MAP[c.growerCodigo]);
                  return (
                    <Card key={i} style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{agr?.nombre || c.growerCodigo}</span>
                        <span style={{ background: C.accentMuted, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{c.temporada}</span>
                      </div>
                      <div style={{ color: C.warn, fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>{fmt(c.totalNeto)}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>Total neto vendido</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.liquidaciones.slice(0, 8).map((liq, j) => (
                          <span key={j} style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.purple, borderRadius: 5, padding: "2px 7px", fontSize: 10 }}>{liq}</span>
                        ))}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CRÉDITO CON PROVEEDORES ──────────────────────────────
function CreditoProveedores({ ordenes, creditoConfig, setCreditoConfig }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [expandido, setExpandido] = useState(null);

  const saldoUsado = (proveedor) =>
    ordenes.filter(o => o.proveedor === proveedor && o.estado !== "Pagada").reduce((s, o) => s + Number(o.total || 0), 0);

  const pagosProveedor = (proveedor) =>
    ordenes.filter(o => o.proveedor === proveedor && o.estado === "Pagada").sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

  return (
    <div>
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <Card style={{ maxWidth: 420, width: "100%", padding: 26 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", color: C.accent, margin: "0 0 18px" }}>Editar crédito — {editando}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input label="Límite de crédito ($)" type="number" value={form.limiteCredito} onChange={e => setForm({ ...form, limiteCredito: Number(e.target.value) })} />
              <Input label="Plazo de pago (días)" type="number" value={form.plazoDias} onChange={e => setForm({ ...form, plazoDias: Number(e.target.value) })} />
              <Input label="Próximo pago" type="date" value={form.proximoPago} onChange={e => setForm({ ...form, proximoPago: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Btn onClick={() => { setCreditoConfig(prev => prev.map(c => c.proveedor === editando ? { ...form } : c)); setEditando(null); }}>Guardar</Btn>
              <Btn variant="ghost" onClick={() => setEditando(null)}>Cancelar</Btn>
            </div>
          </Card>
        </div>
      )}

      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Crédito con Proveedores</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 22px" }}>Saldo calculado automáticamente de órdenes no pagadas</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 16 }}>
        {creditoConfig.map(c => {
          const usado = saldoUsado(c.proveedor);
          const disponible = c.limiteCredito - usado;
          const pct = Math.min((usado / c.limiteCredito) * 100, 100);
          const dias = Math.round((new Date(c.proximoPago) - new Date()) / 86400000);
          const alertaPago = dias <= 5;
          const alertaCredito = pct >= 90;
          const pagos = pagosProveedor(c.proveedor);
          return (
            <div key={c.proveedor}>
              <Card style={{ border: alertaPago || alertaCredito ? `1px solid ${C.danger}55` : `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800, fontFamily: "'Syne', sans-serif", fontSize: 16 }}>{c.proveedor}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>Plazo: {c.plazoDias} días</div>
                  </div>
                  <button onClick={() => { setForm({ ...c }); setEditando(c.proveedor); }} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>✏️ Editar</button>
                </div>
                {alertaCredito && <div style={{ background: "#450a0a", borderRadius: 8, padding: "7px 12px", marginBottom: 8 }}><span style={{ color: C.danger, fontSize: 12, fontWeight: 700 }}>⚠️ Crédito al {Math.round(pct)}% del límite</span></div>}
                {alertaPago && <div style={{ background: "#1c0a00", borderRadius: 8, padding: "7px 12px", marginBottom: 8 }}><span style={{ color: C.warn, fontSize: 12, fontWeight: 700 }}>🔔 Pago vence en {dias} días</span></div>}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>SALDO USADO</span>
                    <span style={{ color: alertaCredito ? C.danger : C.text, fontSize: 11, fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height: 8, background: C.panelAlt, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? C.danger : pct >= 70 ? C.warn : C.accent, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { l: "LÍMITE",     v: fmt(c.limiteCredito), color: C.muted },
                    { l: "USADO",      v: fmt(usado),            color: alertaCredito ? C.danger : C.warn },
                    { l: "DISPONIBLE", v: fmt(disponible),       color: disponible > 0 ? C.accent : C.danger },
                  ].map((x, i) => (
                    <div key={i} style={{ background: C.panelAlt, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ color: C.muted, fontSize: 9, letterSpacing: 1 }}>{x.l}</div>
                      <div style={{ color: x.color, fontWeight: 700, fontSize: 12, marginTop: 2 }}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>📅 Próximo pago</span>
                  <span style={{ color: dias <= 5 ? C.danger : dias <= 15 ? C.warn : C.text, fontSize: 12, fontWeight: 700 }}>
                    {c.proximoPago} {dias > 0 ? `(${dias}d)` : dias === 0 ? "(hoy)" : "(vencido)"}
                  </span>
                </div>
                <button onClick={() => setExpandido(expandido === c.proveedor ? null : c.proveedor)}
                  style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, width: "100%" }}>
                  {expandido === c.proveedor ? "▲ Ocultar historial" : `▼ Ver historial de pagos (${pagos.length})`}
                </button>
              </Card>
              {expandido === c.proveedor && (
                <div style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12 }}>
                  {pagos.length === 0
                    ? <div style={{ color: C.muted, fontSize: 12, padding: "8px 0" }}>Sin pagos registrados aún</div>
                    : pagos.map((o, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ color: C.accent, fontWeight: 700 }}>{o.id}</span>
                        <span style={{ color: C.muted }}>{o.fecha_pago}</span>
                        <span style={{ color: "#a3e635", fontWeight: 700 }}>✅ Pagada</span>
                        <span style={{ color: C.text, fontWeight: 700 }}>{fmt(o.total)}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HISTORIAL CONTRATOS ──────────────────────────────────
function HistorialContratos({ contratos, entregas, miId, esAdmin }) {
  const todos = [
    ...contratos.map(c => ({ ...c, esActual: true })),
    ...CONTRATOS_HISTORICOS.filter(c => !esAdmin ? c.agricultorId === miId : true).map(c => ({ ...c, esActual: false })),
  ].filter(c => !esAdmin ? c.agricultorId === miId : true);

  const temporadas = [...new Set(todos.map(c => c.temporada))].sort((a, b) => b.localeCompare(a));
  const [tempFiltro, setTempFiltro] = useState("Todas");
  const [agrFiltro, setAgrFiltro] = useState("Todos");

  const filtrados = todos.filter(c =>
    (tempFiltro === "Todas" || c.temporada === tempFiltro) &&
    (!esAdmin || agrFiltro === "Todos" || c.agricultorId === parseInt(agrFiltro))
  );

  const cargosContrato = (cid) =>
    entregas.filter(e => e.contratoId === cid).reduce((s, e) => s + e.cantidad * e.precio, 0);

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>{esAdmin ? "Historial de Contratos" : "Mis Contratos — Historial"}</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 18px" }}>Temporadas activas e históricas</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {["Todas", ...temporadas].map(t => (
          <button key={t} onClick={() => setTempFiltro(t)}
            style={{ background: tempFiltro === t ? C.accentMuted : C.panel, border: `1px solid ${tempFiltro === t ? C.accent : C.border}`, color: tempFiltro === t ? "#fff" : C.muted, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>{t}</button>
        ))}
        {esAdmin && (
          <select value={agrFiltro} onChange={e => setAgrFiltro(e.target.value)}
            style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
            <option value="Todos">Todos los agricultores</option>
            {AGRICULTORES.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 14 }}>
        {filtrados.map((c, i) => {
          const cargosActuales = c.esActual ? cargosContrato(c.id) : (c.totalCargos || 0);
          const agr = esAdmin ? AGRICULTORES.find(a => a.id === c.agricultorId) : null;
          return (
            <Card key={i} style={{ border: c.esActual ? `1px solid ${C.accentMuted}` : `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.accent, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{c.id}</span>
                    {c.esActual && <span style={{ background: "#052e16", color: C.accent, borderRadius: 4, padding: "1px 7px", fontSize: 10 }}>Activo</span>}
                  </div>
                  {esAdmin && agr && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{agr.nombre}</div>}
                </div>
                <Badge estado={c.estado} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "TEMPORADA",   v: c.temporada,       color: C.info },
                  { l: "CULTIVO",     v: c.cultivo,          color: c.cultivo === "Bell Pepper" ? "#86efac" : "#6ee7b7" },
                  { l: "LIQUIDACIÓN", v: c.liquidacion,      color: C.purple },
                  { l: "CARGOS",      v: fmt(cargosActuales), color: C.warn },
                ].map((x, j) => (
                  <div key={j} style={{ background: C.panelAlt, borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ color: C.muted, fontSize: 9, letterSpacing: 1 }}>{x.l}</div>
                    <div style={{ color: x.color, fontWeight: 700, fontSize: 12, marginTop: 2 }}>{x.v || "—"}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── REPORTES ─────────────────────────────────────────────
function ReportesAdmin({ ordenes, entregas }) {
  const totalOC = ordenes.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalCargos = entregas.reduce((s, e) => s + e.cantidad * e.precio, 0);
  const porCultivo = ["Bell Pepper", "Pepino"].map(cult => {
    const mats = CATALOGO.filter(m => m.cultivo === cult).map(m => m.id);
    const total = entregas.filter(e => mats.includes(e.materialId)).reduce((s, e) => s + e.cantidad * e.precio, 0);
    return { cultivo: cult, total, icon: cult === "Bell Pepper" ? "🫑" : "🥒" };
  });
  const porAgr = AGRICULTORES.map(a => ({
    ...a,
    total: entregas.filter(e => e.agricultorId === a.id).reduce((s, e) => s + e.cantidad * e.precio, 0),
  })).sort((a, b) => b.total - a.total);

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Reportes</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Resumen financiero y operativo</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <Card>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>TOTAL ÓRDENES DE COMPRA</div>
          <div style={{ color: C.accent, fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800 }}>{fmt(totalOC)}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{ordenes.length} órdenes en total</div>
        </Card>
        <Card>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>TOTAL CARGOS ENTREGAS</div>
          <div style={{ color: C.warn, fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800 }}>{fmt(totalCargos)}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{entregas.length} entregas registradas</div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 15, margin: "0 0 12px" }}>Por Cultivo</h2>
          {porCultivo.map(c => (
            <Card key={c.cultivo} style={{ marginBottom: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.text, fontSize: 14 }}>{c.icon} {c.cultivo}</span>
                <span style={{ color: C.warn, fontWeight: 800 }}>{fmt(c.total)}</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 10 }}>
                <div style={{ height: "100%", width: totalCargos > 0 ? `${(c.total / totalCargos) * 100}%` : "0%", background: C.accent, borderRadius: 2 }} />
              </div>
            </Card>
          ))}
        </div>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 15, margin: "0 0 12px" }}>Por Agricultor</h2>
          {porAgr.map(a => (
            <Card key={a.id} style={{ marginBottom: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.text, fontSize: 14 }}>👤 {a.nombre}</span>
                <span style={{ color: C.purple, fontWeight: 800 }}>{fmt(a.total)}</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 10 }}>
                <div style={{ height: "100%", width: totalCargos > 0 ? `${(a.total / totalCargos) * 100}%` : "0%", background: C.purple, borderRadius: 2 }} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── MENSAJES (compartido) ────────────────────────────────
// ═══════════════════════════════════════════════════════════
const mkThread = (a, b) => [a, b].sort().join("__");

function ChatPanel({ mensajes, onEnviar, onMarcarLeidos, miUsername, otroUsername, otroNombre }) {
  const [texto, setTexto] = useState("");
  const bottomRef = useState(null)[0];
  const bottomEl  = useState(null);

  const thread = mkThread(miUsername, otroUsername);
  const conv = mensajes.filter(m =>
    (m.de_id === miUsername && m.para_id === otroUsername) ||
    (m.de_id === otroUsername && m.para_id === miUsername)
  );

  useEffect(() => {
    onMarcarLeidos && onMarcarLeidos();
    document.getElementById("chat-bottom")?.scrollIntoView({ behavior: "smooth" });
  }, [conv.length]);

  const enviar = async () => {
    if (!texto.trim()) return;
    await onEnviar(otroUsername, texto.trim());
    setTexto("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", border: `1px solid ${C.border}`, borderRadius: "0 12px 12px 0", overflow: "hidden" }}>
      <div style={{ padding: "13px 20px", background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: C.accentMuted + "44", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        <div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{otroNombre}</div>
          <div style={{ color: C.accent, fontSize: 11 }}>● En línea</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 300 }}>
        {conv.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: "auto" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>💬</div>
            Inicia la conversación con {otroNombre}
          </div>
        )}
        {conv.map((m, i) => {
          const esMio = m.de_id === miUsername;
          return (
            <div key={i} style={{ display: "flex", justifyContent: esMio ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "68%", background: esMio ? C.accentMuted : C.panel, border: esMio ? "none" : `1px solid ${C.border}`, borderRadius: esMio ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px" }}>
                <div style={{ color: esMio ? "#fff" : C.text, fontSize: 13, lineHeight: 1.55 }}>{m.texto}</div>
                <div style={{ color: esMio ? "#ffffff66" : C.muted, fontSize: 10, marginTop: 4 }}>
                  {m.hora || new Date(m.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div id="chat-bottom" />
      </div>
      <div style={{ padding: "10px 14px", background: C.panel, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
        <textarea value={texto} onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder={`Mensaje a ${otroNombre}… (Enter envía)`} rows={2}
          style={{ flex: 1, background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit" }} />
        <button onClick={enviar} disabled={!texto.trim()}
          style={{ background: texto.trim() ? C.accentMuted : C.border, border: "none", color: "#fff", borderRadius: 8, padding: "0 16px", cursor: "pointer", fontSize: 18 }}>➤</button>
      </div>
    </div>
  );
}

// ✅ MENSAJES ADMIN — conectado al backend
function MensajesAdmin({ mensajes, setMensajes, usuario, usuarios }) {
  const otros = usuarios.filter(u => u.username !== usuario.username);
  const [selecId, setSelecId] = useState(otros[0]?.username || "");

  const noLeidos = (otherId) =>
    mensajes.filter(m => m.de_id === otherId && m.para_id === usuario.username && !m.leido).length;

  const ultimoMsg = (otherId) => {
    const msgs = mensajes.filter(m => (m.de_id === otherId && m.para_id === usuario.username) || (m.de_id === usuario.username && m.para_id === otherId));
    return msgs[msgs.length - 1];
  };

  // ✅ POST /api/mensajes
  const handleEnviar = async (para_id, texto) => {
    const res = await api.post("/api/mensajes", { para_id, texto });
    if (res.ok) {
      setMensajes(prev => [...prev, { ...res.data, de_id: usuario.username, para_id, hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) }]);
    }
  };

  // ✅ PUT /api/mensajes/leer
  const handleMarcarLeidos = async () => {
    await api.put("/api/mensajes/leer", {});
    setMensajes(prev => prev.map(m => m.para_id === usuario.username ? { ...m, leido: true } : m));
  };

  const selec = otros.find(u => u.username === selecId);

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Mensajes</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>Conversaciones internas</p>
      <div style={{ display: "flex", gap: 0, height: "calc(100vh - 180px)", minHeight: 480 }}>
        <div style={{ width: 220, background: C.panel, border: `1px solid ${C.border}`, borderRight: "none", borderRadius: "12px 0 0 12px", overflowY: "auto" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>CONTACTOS</div>
          {otros.map(u => {
            const nl = noLeidos(u.username);
            const ult = ultimoMsg(u.username);
            return (
              <button key={u.username} onClick={() => setSelecId(u.username)}
                style={{ width: "100%", padding: "10px 14px", border: "none", borderBottom: `1px solid ${C.border}`, background: selecId === u.username ? C.accentMuted + "22" : "transparent", cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: selecId === u.username ? C.accent : C.text, fontWeight: 700, fontSize: 13 }}>{u.nombre}</span>
                  {nl > 0 && <span style={{ background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{nl}</span>}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ult ? ult.texto.substring(0, 30) + (ult.texto.length > 30 ? "..." : "") : "Sin mensajes"}
                </div>
              </button>
            );
          })}
        </div>
        {selec && (
          <ChatPanel
            mensajes={mensajes}
            onEnviar={handleEnviar}
            onMarcarLeidos={handleMarcarLeidos}
            miUsername={usuario.username}
            otroUsername={selec.username}
            otroNombre={selec.nombre}
          />
        )}
      </div>
    </div>
  );
}

// ✅ MENSAJES AGRICULTOR — conectado al backend
function MensajesAgr({ mensajes, setMensajes, usuario, usuarios }) {
  const admins = usuarios.filter(u => u.rol === "admin");
  const [selecId, setSelecId] = useState(admins[0]?.username || "admin");

  const handleEnviar = async (para_id, texto) => {
    const res = await api.post("/api/mensajes", { para_id, texto });
    if (res.ok) {
      setMensajes(prev => [...prev, { ...res.data, de_id: usuario.username, para_id, hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) }]);
    }
  };

  const handleMarcarLeidos = async () => {
    await api.put("/api/mensajes/leer", {});
    setMensajes(prev => prev.map(m => m.para_id === usuario.username ? { ...m, leido: true } : m));
  };

  const selec = admins.find(u => u.username === selecId) || admins[0];

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Mensajes</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>Comunícate con el equipo de SL Produce</p>
      <div style={{ display: "flex", gap: 0, height: "calc(100vh - 220px)", minHeight: 440 }}>
        {admins.length > 1 && (
          <div style={{ width: 200, background: C.panel, border: `1px solid ${C.border}`, borderRight: "none", borderRadius: "12px 0 0 12px" }}>
            {admins.map(u => (
              <button key={u.username} onClick={() => setSelecId(u.username)}
                style={{ width: "100%", padding: "10px 14px", border: "none", borderBottom: `1px solid ${C.border}`, background: selecId === u.username ? C.accentMuted + "22" : "transparent", cursor: "pointer", textAlign: "left" }}>
                <span style={{ color: selecId === u.username ? C.accent : C.text, fontWeight: 700, fontSize: 13 }}>{u.nombre}</span>
              </button>
            ))}
          </div>
        )}
        {selec && (
          <ChatPanel
            mensajes={mensajes}
            onEnviar={handleEnviar}
            onMarcarLeidos={handleMarcarLeidos}
            miUsername={usuario.username}
            otroUsername={selec.username}
            otroNombre={selec.nombre}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── GESTIÓN DE USUARIOS ──────────────────────────────────
// ═══════════════════════════════════════════════════════════
function GestionUsuarios({ usuarios, setUsuarios }) {
  const [modal, setModal]     = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving]   = useState(false);
  const emptyForm = { nombre: "", username: "", pass: "", rol: "agricultor" };
  const [form, setForm]       = useState(emptyForm);

  // ✅ POST /api/usuarios
  const guardar = async () => {
    if (!form.nombre || !form.username || !form.pass) return;
    setSaving(true);
    const res = await api.post("/api/usuarios", { username: form.username, password: form.pass, rol: form.rol, nombre: form.nombre });
    if (res.ok) {
      setUsuarios(prev => [...prev, { ...res.data, username: form.username }]);
      setForm(emptyForm);
      setModal(false);
    }
    setSaving(false);
  };

  const rolColor = (r) => r === "admin" ? { color: C.purple, bg: "#2e1065" } : { color: C.accentDim, bg: "#052e16" };

  return (
    <div>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 480, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", color: C.accent, margin: 0 }}>Nuevo Usuario</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[{ val: "admin", label: "Administrador", icon: "🛡️" }, { val: "agricultor", label: "Agrícola", icon: "🌾" }].map(r => (
                <button key={r.val} onClick={() => setForm({ ...form, rol: r.val })}
                  style={{ background: form.rol === r.val ? (r.val === "admin" ? "#2e1065" : "#052e16") : C.panelAlt, border: `1px solid ${form.rol === r.val ? (r.val === "admin" ? C.purple : C.accent) : C.border}`, borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{r.label}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
              <Input label="NOMBRE COMPLETO *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
              <Input label="USUARIO (LOGIN) *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="usuario123" />
              <Input label="CONTRASEÑA *" value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })} placeholder="Contraseña temporal" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Crear usuario"}</Btn>
              <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: 0 }}>Usuarios</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            {usuarios.filter(u => u.rol === "admin").length} admins · {usuarios.filter(u => u.rol === "agricultor").length} agricultores
          </p>
        </div>
        <Btn onClick={() => { setForm(emptyForm); setModal(true); }}>+ Nuevo Usuario</Btn>
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 14, margin: "0 0 12px" }}>🛡️ Administradores</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
        {usuarios.filter(u => u.rol === "admin").map((u, i) => (
          <Card key={i} style={{ padding: "18px 20px", border: `1px solid #3b0764` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, background: "#2e1065", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
              <span style={{ background: "#2e1065", color: C.purple, borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>Admin</span>
            </div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{u.nombre}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>@{u.username}</div>
          </Card>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 14, margin: "0 0 12px" }}>🌾 Usuarios Agrícolas</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
        {usuarios.filter(u => u.rol === "agricultor").map((u, i) => (
          <Card key={i} style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, background: "#052e16", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌾</div>
              <span style={{ background: "#052e16", color: C.accentDim, borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>Agricultor</span>
            </div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{u.nombre}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>@{u.username}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── PORTAL AGRICULTOR ────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ✅ SUBIDA DE PDF — conectada al backend
function ModoPDF({ misContratos, contratoId, setContratoId, fechaEntrega, setFechaEntrega, nota, setNota, onVolver, onEnviar, sending = false, envioError = "" }) {
  const [archivo, setArchivo]         = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // "idle" | "uploading" | "success" | "error"
  const [extraccion, setExtraccion]   = useState(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragOver, setDragOver]       = useState(false);

  const subirPDF = async (file) => {
    // ── Validación en cliente (primera línea de defensa) ──
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("⚠️ Solo se permiten archivos PDF. Selecciona un archivo .pdf");
      setUploadStatus("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("⚠️ El archivo es demasiado grande. Máximo permitido: 10 MB");
      setUploadStatus("error");
      return;
    }

    setArchivo(file);
    setUploadStatus("uploading");
    setErrorMsg("");
    setExtraccion(null);

    // ── Subida real: POST /api/solicitudes/pdf con multipart/form-data + JWT ──
    const res = await api.upload("/api/solicitudes/pdf", "pdf", file);

    if (res.ok) {
      const datos = res.datos || {};
      setExtraccion({ ...datos, archivo: file.name, pdfPath: res.pdfPath });
      if (datos.fechaEntrega) setFechaEntrega(datos.fechaEntrega);
      setUploadStatus("success");
    } else {
      setErrorMsg(res.error || "No se pudo procesar el archivo. Intenta de nuevo.");
      setUploadStatus("error");
      setArchivo(null);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) subirPDF(file);
    // Reset input para permitir volver a subir el mismo archivo
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) subirPDF(file);
  };

  const resetArchivo = () => {
    setArchivo(null);
    setExtraccion(null);
    setUploadStatus("idle");
    setErrorMsg("");
  };

  const canSend = extraccion && fechaEntrega && contratoId;

  // ── Colores y texto del drop zone según estado ──
  const zoneConfig = {
    idle:      { bg: C.panelAlt,  border: C.border,  icon: "📄", title: "Arrastra tu PDF aquí",        sub: "o haz clic para seleccionar · Solo archivos .pdf · Máx. 10 MB" },
    uploading: { bg: "#172554",   border: C.info,    icon: "⏳", title: "Subiendo y analizando...",     sub: "Claude AI está leyendo tu documento, espera un momento" },
    success:   { bg: "#052e16",   border: C.accent,  icon: "✅", title: archivo?.name || "PDF subido",  sub: "Haz clic para cambiar el archivo" },
    error:     { bg: "#1c0500",   border: C.danger,  icon: "❌", title: "No se pudo procesar",          sub: "Haz clic para intentar con otro archivo" },
  };
  const zone = zoneConfig[uploadStatus];

  return (
    <div style={{ maxWidth: 600 }}>
      <button onClick={onVolver} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Volver</button>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, background: "#172554", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", color: C.text, margin: 0, fontSize: 16 }}>Subir Orden de Compra PDF</h3>
            <div style={{ color: C.info, fontSize: 11, marginTop: 2 }}>Claude AI lee el PDF automáticamente</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="CONTRATO *" value={contratoId} onChange={e => setContratoId(e.target.value)}>
            <option value="">Seleccionar contrato...</option>
            {misContratos.map(c => <option key={c.id} value={c.id}>{c.id} · {c.cultivo}</option>)}
          </Select>

          {/* ── Drop zone PDF ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ color: C.muted, fontSize: 11, letterSpacing: 1 }}>ARCHIVO PDF</label>
              {uploadStatus !== "idle" && (
                <button onClick={resetArchivo}
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                  Cambiar archivo
                </button>
              )}
            </div>

            {/* Área de drop — solo acepta .pdf */}
            <label
              style={{
                display: "block",
                background: dragOver ? "#0a1f10" : zone.bg,
                border: `2px dashed ${dragOver ? C.accent : zone.border}`,
                borderRadius: 12,
                padding: "32px 20px",
                textAlign: "center",
                cursor: uploadStatus === "uploading" ? "wait" : "pointer",
                transition: "all 0.2s",
                transform: dragOver ? "scale(1.01)" : "scale(1)",
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {/* ⚠️ Solo .pdf — no jpg/png */}
              <input
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                disabled={uploadStatus === "uploading"}
                onChange={handleFileInput}
              />
              <div style={{ fontSize: 36, marginBottom: 10 }}>{zone.icon}</div>
              <div style={{
                color: uploadStatus === "success" ? C.accent : uploadStatus === "error" ? C.danger : C.text,
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 6,
              }}>
                {zone.title}
              </div>
              <div style={{ color: C.muted, fontSize: 12 }}>{zone.sub}</div>

              {/* Barra de progreso mientras sube */}
              {uploadStatus === "uploading" && (
                <div style={{ marginTop: 16, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: "100%",
                    background: `linear-gradient(90deg, ${C.info}, ${C.accent})`,
                    borderRadius: 2,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                </div>
              )}
            </label>

            {/* Información del archivo subido */}
            {uploadStatus === "success" && archivo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 12px", background: "#052e16", border: `1px solid ${C.accent}44`, borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>📎</span>
                <span style={{ color: C.accent, fontSize: 12, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{archivo.name}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{(archivo.size / 1024).toFixed(0)} KB</span>
              </div>
            )}
          </div>

          {/* Mensaje de error de subida */}
          {errorMsg && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#450a0a", border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "12px 14px" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🚨</span>
              <div>
                <div style={{ color: C.danger, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Error al subir el archivo</div>
                <div style={{ color: "#fca5a5", fontSize: 12 }}>{errorMsg}</div>
              </div>
            </div>
          )}

          {/* ── Datos extraídos por Claude AI ── */}
          {uploadStatus === "success" && extraccion && (
            <div style={{ background: "#052e16", border: `1px solid ${C.accent}55`, borderRadius: 10, padding: 16 }}>
              {/* Banner de éxito */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.accent}22` }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div>
                  <div style={{ color: C.accent, fontWeight: 800, fontSize: 13 }}>PDF procesado correctamente</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>Claude AI extrajo los siguientes datos del documento</div>
                </div>
              </div>

              {/* Campos extraídos */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { l: "Número de OC",  v: extraccion.numeroOC,                                   color: C.info   },
                  { l: "Agrícola",      v: extraccion.agricultor,                                 color: C.text   },
                  { l: "Fecha entrega", v: extraccion.fechaEntrega,                               color: C.warn   },
                  { l: "Total",         v: extraccion.total > 0 ? fmt(extraccion.total) : null,   color: C.warn   },
                ].filter(x => x.v).map((x, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: C.panelAlt, borderRadius: 7 }}>
                    <span style={{ color: C.muted, fontSize: 12 }}>{x.l}</span>
                    <span style={{ color: x.color, fontWeight: 700, fontSize: 13 }}>{x.v}</span>
                  </div>
                ))}
              </div>

              {/* Productos / materiales */}
              {extraccion.productos?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.accent}22` }}>
                  <div style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>PRODUCTOS DETECTADOS</div>
                  {extraccion.productos.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: C.panelAlt, borderRadius: 7, marginBottom: 4 }}>
                      <span style={{ color: C.text, fontSize: 13 }}>
                        {p.nombre}
                        <span style={{ color: C.muted, marginLeft: 6 }}>× {p.cantidad}</span>
                      </span>
                      {p.precio > 0 && (
                        <span style={{ color: C.accentDim, fontWeight: 700, fontSize: 12 }}>{fmt(p.precio * p.cantidad)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Nota extraída del PDF */}
              {extraccion.notas && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: C.panelAlt, borderRadius: 8, color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
                  📝 <strong style={{ color: C.text }}>Nota del documento:</strong> {extraccion.notas}
                </div>
              )}

              {/* Aviso si faltan datos importantes */}
              {!extraccion.numeroOC && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#1c1000", border: `1px solid ${C.warn}44`, borderRadius: 8, color: C.warn, fontSize: 12 }}>
                  ⚠️ No se detectó número de OC. Puedes ingresarlo manualmente abajo.
                </div>
              )}
            </div>
          )}

          {/* ── Fecha de entrega requerida (solo visible tras subida exitosa) ── */}
          {uploadStatus === "success" && extraccion && (
            <div style={{ background: "#1c1000", border: `1px solid ${C.warn}44`, borderRadius: 10, padding: 14 }}>
              <label style={{ color: C.warn, fontSize: 11, display: "block", marginBottom: 8, letterSpacing: 1 }}>
                🚚 ¿PARA CUÁNDO LO NECESITAS? *
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {[["+3 días", 3], ["+7 días", 7], ["+14 días", 14], ["+30 días", 30]].map(([lbl, d]) => {
                  const x = new Date(); x.setDate(x.getDate() + d);
                  const v = x.toISOString().slice(0, 10);
                  return (
                    <button key={lbl} onClick={() => setFechaEntrega(v)}
                      style={{ background: fechaEntrega === v ? "#451a03" : C.panelAlt, border: `1px solid ${fechaEntrega === v ? C.warn : C.border}`, color: fechaEntrega === v ? C.warn : C.muted, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: fechaEntrega === v ? 700 : 400 }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
              {!fechaEntrega && (
                <div style={{ color: C.danger, fontSize: 11, marginTop: 6 }}>⚠️ Este campo es obligatorio para enviar</div>
              )}
            </div>
          )}

          {/* ── Nota adicional ── */}
          {uploadStatus === "success" && extraccion && (
            <div>
              <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 5, letterSpacing: 1 }}>NOTA ADICIONAL (opcional)</label>
              <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Alguna observación..."
                style={{ width: "100%", background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 12px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          )}

          {/* ── Botón de envío con estado ── */}
          <div>
            <Btn
              onClick={() => canSend && !sending && onEnviar({ ...extraccion, nota })}
              style={{
                width: "100%",
                padding: "13px",
                opacity: (canSend && !sending) ? 1 : 0.4,
                cursor: (canSend && !sending) ? "pointer" : "not-allowed",
                fontSize: 14,
              }}
              disabled={!canSend || sending}
            >
              {sending ? "⏳ Enviando solicitud..." : "📤 Enviar a SL Produce"}
            </Btn>

            {/* Razón por la que el botón está desactivado */}
            {!canSend && uploadStatus !== "idle" && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
                {!contratoId && "· Selecciona un contrato  "}
                {!fechaEntrega && "· Indica la fecha de entrega  "}
                {!extraccion && uploadStatus !== "uploading" && "· Sube un PDF válido"}
              </div>
            )}

            {/* Error al enviar la solicitud al backend */}
            {envioError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#450a0a", border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "12px 14px", marginTop: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🚨</span>
                <div>
                  <div style={{ color: C.danger, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Error al enviar la solicitud</div>
                  <div style={{ color: "#fca5a5", fontSize: 12 }}>{envioError}</div>
                </div>
              </div>
            )}

            {/* Instrucción inicial */}
            {uploadStatus === "idle" && (
              <div style={{ marginTop: 8, color: C.muted, fontSize: 11, textAlign: "center" }}>
                Primero sube tu PDF para continuar
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── PEDIR MATERIALES ─────────────────────────────────────
function PedirMateriales({ miId, miUsername, misContratos, solicitudes, setSolicitudes, nextId }) {
  const [modo, setModo]               = useState(null);
  const [lineas, setLineas]           = useState([{ materialId: "", cantidad: "" }]);
  const [contratoId, setContratoId]   = useState(misContratos[0]?.id || "");
  const [nota, setNota]               = useState("");
  const [enviado, setEnviado]         = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [numeroOC, setNumeroOC]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [envioError, setEnvioError]   = useState("");

  const contrato      = misContratos.find(c => c.id === contratoId);
  const materialesDisp = contrato ? CATALOGO.filter(m => m.cultivo === contrato.cultivo) : CATALOGO;
  const total = lineas.reduce((s, l) => {
    const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
    return s + (mat?.precio || 0) * (parseInt(l.cantidad) || 0);
  }, 0);

  // ✅ POST /api/solicitudes
  const enviarManual = async () => {
    if (!contratoId || !fechaEntrega || !numeroOC || !lineas.some(l => l.materialId && l.cantidad)) return;
    setSaving(true);
    const items = lineas.filter(l => l.materialId).map(l => {
      const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
      return { materialId: parseInt(l.materialId), nombre: mat?.nombre, cantidad: parseInt(l.cantidad), precio: mat?.precio };
    });
    const res = await api.post("/api/solicitudes", { id: nextId, numero_oc: numeroOC, items, notas: nota });
    if (res.ok) {
      setSolicitudes(prev => [...prev, { ...res.data, tipo: "manual", materiales: items, total, fechaEntrega, estado: "En revision", contratoId }]);
      setEnviado(true);
    }
    setSaving(false);
  };

  // ✅ enviar desde PDF — usa FormData + POST /api/solicitudes/pdf + JWT
  const enviarPDF = async (datos) => {
    setSaving(true);
    setEnvioError("");

    // 1. Validar que exista archivo y sea PDF
    if (!datos.archivo || !(datos.archivo instanceof File)) {
      setEnvioError("No se encontró el archivo PDF. Vuelve a seleccionarlo.");
      setSaving(false);
      return;
    }
    if (datos.archivo.type !== "application/pdf" && !datos.archivo.name.toLowerCase().endsWith(".pdf")) {
      setEnvioError("El archivo seleccionado no es un PDF válido.");
      setSaving(false);
      return;
    }

    // 2. Construir FormData con el archivo real
    const formData = new FormData();
    formData.append("file", datos.archivo);
    formData.append("numero_oc",    datos.numeroOC  || "");
    formData.append("notas",        datos.nota      || nota || "");
    formData.append("contrato_id",  contratoId      || "");
    formData.append("fecha_entrega", fechaEntrega   || "");
    if (datos.pdfPath) formData.append("pdf_path", datos.pdfPath);

    try {
      // 3. fetch directo: sin Content-Type (el browser pone el boundary solo)
      const res = await fetch(`${API_URL}/api/solicitudes/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("slp_token")}`,
          // ⚠️ NO incluir Content-Type aquí
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        setEnvioError(`Error del servidor (${res.status}): ${text.slice(0, 120)}`);
        setSaving(false);
        return;
      }

      const json = await res.json();

      if (json.ok) {
        // 4. Mantener lógica existente: actualizar lista y marcar como enviado
        setSolicitudes(prev => [
          ...prev,
          {
            ...json.data,
            tipo: "pdf",
            archivo: datos.archivo.name,
            estado: "En revision",
            total: datos.total || 0,
            fechaEntrega,
            contratoId,
          },
        ]);
        setEnviado(true);
      } else {
        setEnvioError(json.error || "No se pudo enviar la solicitud. Intenta de nuevo.");
      }
    } catch {
      setEnvioError("Error de conexión al enviar. ¿Está corriendo el backend?");
    }

    setSaving(false);
  };

  if (enviado) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.accent, fontSize: 22, margin: "0 0 12px" }}>¡Solicitud enviada!</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 8px" }}>Tu solicitud {nextId} fue enviada a SL Produce</p>
      <p style={{ color: C.warn, fontSize: 13, margin: "0 0 24px" }}>🚚 Entrega solicitada para: {fechaEntrega}</p>
      <button onClick={() => { setEnviado(false); setModo(null); setLineas([{ materialId: "", cantidad: "" }]); setFechaEntrega(""); setNumeroOC(""); setNota(""); }}
        style={{ background: C.accentMuted, border: "none", color: "#fff", borderRadius: 9, padding: "12px 28px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
        Hacer otro pedido
      </button>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Pedir Materiales</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Solicita empaques a SL Produce</p>

      {!modo && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}>
          {[
            { id: "manual", icon: "📝", title: "Captura manual", desc: "Selecciona materiales y cantidades del catálogo", color: C.accent },
            { id: "pdf",    icon: "📄", title: "Subir PDF",       desc: "Adjunta tu orden de compra, Claude la lee automáticamente", color: C.info },
          ].map(m => (
            <button key={m.id} onClick={() => setModo(m.id)}
              style={{ background: C.panel, border: `2px solid ${C.border}`, borderRadius: 14, padding: "28px 20px", cursor: "pointer", textAlign: "left", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = m.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{m.icon}</div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{m.title}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      {modo === "manual" && (
        <div style={{ maxWidth: 620 }}>
          <button onClick={() => setModo(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Volver</button>
          <Card>
            <h3 style={{ fontFamily: "'Syne', sans-serif", color: C.accent, margin: "0 0 18px" }}>Nueva solicitud manual</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Select label="CONTRATO *" value={contratoId} onChange={e => setContratoId(e.target.value)}>
                {misContratos.map(c => <option key={c.id} value={c.id}>{c.id} · {c.cultivo}</option>)}
              </Select>
              <div>
                <label style={{ color: C.danger, fontSize: 11, display: "block", marginBottom: 6, letterSpacing: 1 }}>🔗 NÚMERO DE OC *</label>
                <input value={numeroOC} onChange={e => setNumeroOC(e.target.value)} placeholder="Ej: OC-2025-001"
                  style={{ width: "100%", background: numeroOC ? "#0a1a0a" : C.panelAlt, border: `1px solid ${numeroOC ? C.accent : C.danger}55`, color: C.text, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ background: "#1c1000", border: `1px solid ${C.warn}44`, borderRadius: 10, padding: 14 }}>
                <label style={{ color: C.warn, fontSize: 11, display: "block", marginBottom: 8, letterSpacing: 1 }}>🚚 ¿PARA CUÁNDO LO NECESITAS? *</label>
                <Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 8, letterSpacing: 1 }}>MATERIALES *</label>
                {lineas.map((l, i) => {
                  const mat = CATALOGO.find(m => m.id === parseInt(l.materialId));
                  const sub = (mat?.precio || 0) * (parseInt(l.cantidad) || 0);
                  return (
                    <div key={i} style={{ background: C.panelAlt, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 32px", gap: 8 }}>
                        <select value={l.materialId} onChange={e => { const nl = [...lineas]; nl[i].materialId = e.target.value; setLineas(nl); }}
                          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
                          <option value="">Seleccionar...</option>
                          {materialesDisp.map(m => <option key={m.id} value={m.id}>{m.nombre} — {fmt(m.precio)}</option>)}
                        </select>
                        <input type="number" min="1" placeholder="Cant." value={l.cantidad} onChange={e => { const nl = [...lineas]; nl[i].cantidad = e.target.value; setLineas(nl); }}
                          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 12 }} />
                        <button onClick={() => lineas.length > 1 && setLineas(lineas.filter((_, idx) => idx !== i))}
                          style={{ background: "#450a0a", border: "none", color: C.danger, borderRadius: 8, cursor: "pointer" }}>×</button>
                      </div>
                      {mat && l.cantidad && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ color: C.muted, fontSize: 11 }}>{fmt(mat.precio)} × {l.cantidad}</span>
                          <span style={{ color: C.accentDim, fontWeight: 700 }}>{fmt(sub)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => setLineas([...lineas, { materialId: "", cantidad: "" }])}
                  style={{ background: "none", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 16px", cursor: "pointer", width: "100%", fontSize: 13 }}>
                  + Agregar material
                </button>
              </div>
              <Input label="NOTA (opcional)" value={nota} onChange={e => setNota(e.target.value)} placeholder="Alguna observación..." />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: C.muted, fontSize: 11 }}>TOTAL ESTIMADO</div>
                  <div style={{ color: C.accent, fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>{fmt(total)}</div>
                </div>
                <Btn onClick={enviarManual} style={{ opacity: (fechaEntrega && numeroOC && lineas.some(l => l.materialId)) ? 1 : 0.5 }} disabled={saving}>
                  {saving ? "Enviando..." : "📤 Enviar solicitud"}
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {modo === "pdf" && (
        <ModoPDF
          misContratos={misContratos}
          contratoId={contratoId}
          setContratoId={setContratoId}
          fechaEntrega={fechaEntrega}
          setFechaEntrega={setFechaEntrega}
          nota={nota}
          setNota={setNota}
          onVolver={() => setModo(null)}
          onEnviar={enviarPDF}
          sending={saving}
          envioError={envioError}
        />
      )}
    </div>
  );
}

// ─── PORTAL AGRICULTOR COMPLETO ───────────────────────────
function PortalAgr({ usuario, entregas, contratos, solicitudes, setSolicitudes, mensajes, setMensajes, usuarios }) {
  const miId       = usuario.agricultor_id;
  const miUsername = usuario.username;
  const misEntregas    = entregas.filter(e => e.agricultorId === miId);
  const misContratos   = contratos.filter(c => c.agricultorId === miId);
  const misSolicitudes = solicitudes.filter(s => s.agricultor_id === miId || s.agricultorId === miId);
  const totalCargado   = misEntregas.reduce((s, e) => s + e.cantidad * e.precio, 0);
  const [page, setPage] = useState("inicio");

  const msgsNoLeidos = mensajes.filter(m => m.para_id === miUsername && !m.leido).length;
  const nextId = `SOL-${String(solicitudes.length + 1).padStart(3, "0")}`;

  const badges = { mensajes: msgsNoLeidos };

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar nav={NAV_AGR} active={page} onChange={setPage} usuario={usuario} badges={badges}
        onLogout={() => { localStorage.removeItem("slp_token"); localStorage.removeItem("slp_user"); window.location.reload(); }} />
      <main style={{ flex: 1, padding: "28px 36px 40px", overflowY: "auto" }}>

        {page === "inicio" && (
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Mi Panel</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Temporada 2025-A</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { icon: "🌱", label: "Cultivo activo",     val: misContratos[0]?.cultivo || "—",    color: C.accent },
                { icon: "📦", label: "Entregas recibidas", val: misEntregas.length,                  color: C.info },
                { icon: "💰", label: "Cargo acumulado",    val: fmt(totalCargado),                   color: C.warn },
                { icon: "📋", label: "Pedidos enviados",   val: misSolicitudes.length,               color: C.purple },
              ].map((k, i) => (
                <Card key={i} style={{ padding: "16px 16px" }}>
                  <div style={{ fontSize: 20, marginBottom: 7 }}>{k.icon}</div>
                  <div style={{ color: k.color, fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800 }}>{k.val}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{k.label}</div>
                </Card>
              ))}
            </div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 15, margin: "0 0 12px" }}>Mis contratos activos</h2>
            {misContratos.map(c => {
              const cargos = misEntregas.filter(e => e.contratoId === c.id);
              const total = cargos.reduce((s, e) => s + e.cantidad * e.precio, 0);
              return (
                <Card key={c.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: C.accent, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{c.id}</span>
                    <Badge estado={c.estado} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { l: "TEMPORADA",   v: c.temporada,    color: C.text },
                      { l: "LIQUIDACIÓN", v: c.liquidacion,  color: C.purple },
                      { l: "ENTREGAS",    v: `${cargos.length}`, color: C.info },
                      { l: "CARGO TOTAL", v: fmt(total),     color: C.warn },
                    ].map((x, i) => (
                      <div key={i} style={{ background: C.panelAlt, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>{x.l}</div>
                        <div style={{ color: x.color, fontWeight: 700, fontSize: 13, marginTop: 2 }}>{x.v || "—"}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {page === "solicitar" && (
          <PedirMateriales
            miId={miId}
            miUsername={miUsername}
            misContratos={misContratos}
            solicitudes={solicitudes}
            setSolicitudes={setSolicitudes}
            nextId={nextId}
          />
        )}

        {page === "mis-pedidos" && (
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Mis Pedidos</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 22px" }}>Solicitudes enviadas a SL Produce</p>
            {misSolicitudes.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Sin solicitudes aún</div>}
            {misSolicitudes.map((s, i) => (
              <Card key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: C.accent, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{s.id}</span>
                      {s.numero_oc && <span style={{ background: "#0a1a0a", color: "#a3e635", borderRadius: 5, padding: "1px 7px", fontSize: 11 }}>OC: {s.numero_oc}</span>}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{s.created_at?.slice(0, 10) || s.fecha}</div>
                    {s.oc_sl_produce && <div style={{ color: C.info, fontSize: 11, marginTop: 2 }}>→ Vinculada a {s.oc_sl_produce}</div>}
                  </div>
                  <Badge estado={s.estado === "En revision" ? "En revisión" : s.estado} />
                </div>
                {s.tipo === "pdf" && (
                  <div style={{ background: C.panelAlt, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ color: C.info, fontSize: 13 }}>{s.archivo || "Archivo PDF"}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>— en revisión</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {page === "entregas" && (
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, margin: "0 0 4px" }}>Entregas Recibidas</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 22px" }}>Materiales entregados por SL Produce</p>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 1.2fr 0.7fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 11, letterSpacing: 1 }}>
                <span>MATERIAL</span><span>FECHA</span><span>CONTRATO</span><span>LIQUIDACIÓN</span><span>CANT.</span><span>TOTAL</span>
              </div>
              {misEntregas.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Sin entregas registradas</div>}
              {misEntregas.map((e, i) => {
                const mat = CATALOGO.find(m => m.id === e.materialId);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 1.2fr 0.7fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                    <div>
                      <div style={{ color: C.text, fontWeight: 600 }}>{mat?.nombre}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>{mat?.cultivo}</div>
                    </div>
                    <span style={{ color: C.muted }}>{e.fecha}</span>
                    <span style={{ color: C.info, fontWeight: 600 }}>{e.contratoId}</span>
                    <div>
                      <div style={{ color: C.purple, fontWeight: 600 }}>{e.liquidacionId}</div>
                      <div style={{ color: C.muted, fontSize: 10 }}>se descuenta aquí</div>
                    </div>
                    <span style={{ color: C.text }}>{e.cantidad}</span>
                    <span style={{ color: C.warn, fontWeight: 800 }}>{fmt(e.cantidad * e.precio)}</span>
                  </div>
                );
              })}
              {misEntregas.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 18px" }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Total: </span>
                  <span style={{ color: C.warn, fontWeight: 800, fontFamily: "'Syne', sans-serif", fontSize: 16, marginLeft: 8 }}>{fmt(totalCargado)}</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {page === "contratos" && (
          <HistorialContratos contratos={contratos} entregas={misEntregas} miId={miId} esAdmin={false} />
        )}

        {page === "historial" && (
          <HistorialContratos contratos={[]} entregas={misEntregas} miId={miId} esAdmin={false} />
        )}

        {page === "mensajes" && (
          <MensajesAgr mensajes={mensajes} setMensajes={setMensajes} usuario={usuario} usuarios={usuarios} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── APP ROOT ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [usuario, setUsuario]               = useState(null);
  const [page, setPage]                     = useState("dashboard");
  const [loading, setLoading]               = useState(true);

  // ─── Estado que viene del backend ─────────────────────
  const [ordenes, setOrdenes]               = useState([]);
  const [solicitudes, setSolicitudes]       = useState([]);
  const [mensajes, setMensajes]             = useState([]);
  const [usuarios, setUsuarios]             = useState([]);

  // ─── Estado local (sin tabla en el backend aún) ───────
  const [entregas]                          = useState([]);
  const [contratos]                         = useState([]);
  const [creditoConfig, setCreditoConfig]   = useState(CREDITO_PROVEEDORES_INIT);

  // ─── Cargar Google Fonts + animación CSS para barra de progreso ──────
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);

    // Animación para la barra de progreso del upload
    if (!document.getElementById("slp-animations")) {
      const style = document.createElement("style");
      style.id = "slp-animations";
      style.textContent = `
        @keyframes pulse {
          0%   { opacity: 1; transform: translateX(-100%); }
          50%  { opacity: 0.8; }
          100% { opacity: 1; transform: translateX(100%); }
        }
        @keyframes slidein {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // ✅ Al arrancar: revisar si hay sesión guardada en localStorage
  useEffect(() => {
    const token = localStorage.getItem("slp_token");
    const user  = localStorage.getItem("slp_user");
    if (token && user) {
      try {
        const u = JSON.parse(user);
        setUsuario(u);
      } catch {
        localStorage.removeItem("slp_token");
        localStorage.removeItem("slp_user");
      }
    }
    setLoading(false);
  }, []);

  // ✅ Cargar datos del backend cuando hay sesión
  useEffect(() => {
    if (!usuario) return;
    const cargarDatos = async () => {
      try {
        const [ordenesRes, solicRes, mensajesRes, usersRes] = await Promise.all([
          api.get("/api/ordenes"),
          api.get("/api/solicitudes"),
          api.get("/api/mensajes"),
          usuario.rol === "admin" ? api.get("/api/usuarios") : Promise.resolve({ ok: true, data: [] }),
        ]);
        if (ordenesRes.ok)   setOrdenes(ordenesRes.data);
        if (solicRes.ok)     setSolicitudes(solicRes.data);
        if (mensajesRes.ok)  setMensajes(mensajesRes.data);
        if (usersRes.ok)     setUsuarios(usersRes.data);
      } catch (e) {
        console.error("Error cargando datos:", e);
      }
    };
    cargarDatos();
  }, [usuario]);

  // ✅ handleLogin — el componente Login llama a api.post("/api/login"),
  // guarda el token en localStorage y llama onLogin(data.user).
  // Aquí solo actualizamos el estado de React.
  const handleLogin = (u) => {
    setUsuario(u);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("slp_token");
    localStorage.removeItem("slp_user");
    setUsuario(null);
    setOrdenes([]);
    setSolicitudes([]);
    setMensajes([]);
    setUsuarios([]);
  };

  const msgsNoLeidos = mensajes.filter(m => m.para_id === usuario?.username && !m.leido).length;
  const solicPendientes = solicitudes.filter(s => s.estado === "En revision").length;
  const badges = { mensajes: msgsNoLeidos, ordenes: solicPendientes };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
        <div>Cargando SL Produce...</div>
      </div>
    </div>
  );

  if (!usuario) return <Login onLogin={handleLogin} />;

  if (usuario.rol === "agricultor") return (
    <PortalAgr
      usuario={usuario}
      entregas={entregas}
      contratos={contratos}
      solicitudes={solicitudes}
      setSolicitudes={setSolicitudes}
      mensajes={mensajes}
      setMensajes={setMensajes}
      usuarios={usuarios}
    />
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar nav={NAV_ADMIN} active={page} onChange={setPage} usuario={usuario} badges={badges} onLogout={handleLogout} />
      <main style={{ flex: 1, padding: "28px 36px 40px", overflowY: "auto", overflowX: "hidden" }}>
        {page === "dashboard"  && <DashboardAdmin ordenes={ordenes} solicitudes={solicitudes} />}
        {page === "ordenes"    && <Ordenes ordenes={ordenes} setOrdenes={setOrdenes} solicitudes={solicitudes} setSolicitudes={setSolicitudes} />}
        {page === "catalogo"   && <Catalogo />}
        {page === "isolve"     && <IsolveAdmin entregas={entregas} setEntregas={() => {}} contratos={contratos} ordenes={ordenes} setOrdenes={setOrdenes} />}
        {page === "credito"    && <CreditoProveedores ordenes={ordenes} creditoConfig={creditoConfig} setCreditoConfig={setCreditoConfig} />}
        {page === "historial"  && <HistorialContratos contratos={contratos} entregas={entregas} esAdmin={true} />}
        {page === "mensajes"   && <MensajesAdmin mensajes={mensajes} setMensajes={setMensajes} usuario={usuario} usuarios={usuarios} />}
        {page === "usuarios"   && <GestionUsuarios usuarios={usuarios} setUsuarios={setUsuarios} />}
        {page === "reportes"   && <ReportesAdmin ordenes={ordenes} entregas={entregas} />}
      </main>
    </div>
  );
}
