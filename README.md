# SL Produce API — Backend

## Variables de entorno necesarias en Railway:

```
DATABASE_URL=        (Railway te la da automáticamente con PostgreSQL)
JWT_SECRET=          slproduce_secret_2025
SQL_USER=            DevSLProd
SQL_PASSWORD=        $lPr0duc3!
SQL_SERVER=          ispSLProduce.database.windows.net
SQL_DATABASE=        spSLProduce
PORT=                3001
```

## Endpoints:

### Auth
- POST /api/login — Login con username/password

### Órdenes (requiere token)
- GET  /api/ordenes — Lista órdenes
- POST /api/ordenes — Crear orden (solo admin)
- PUT  /api/ordenes/:id — Actualizar orden (solo admin)
- DELETE /api/ordenes/:id — Eliminar orden (solo admin)

### Solicitudes (requiere token)
- GET  /api/solicitudes — Lista solicitudes
- POST /api/solicitudes — Crear solicitud (agricultor)
- PUT  /api/solicitudes/:id — Actualizar solicitud (admin)

### Mensajes (requiere token)
- GET  /api/mensajes — Mensajes del usuario
- POST /api/mensajes — Enviar mensaje
- PUT  /api/mensajes/leer — Marcar como leídos

### iSolve (público)
- GET /api/ventas — Todas las ventas de iSolve
- GET /api/growers — Lista de growers
- GET /api/contratos — Contratos agrupados

### Usuarios (solo admin)
- GET  /api/usuarios — Lista usuarios
- POST /api/usuarios — Crear usuario

### Health
- GET /api/health — Verificar que está corriendo
