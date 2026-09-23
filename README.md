# Network Tracker - Sagemcom F@st 3896

Sistema de control, monitoreo y auditoría en tiempo real para registrar cuándo se conectan y cuándo se desconectan los dispositivos en la red del router Sagemcom F@st 3896 (`http://[IP_ADDRESS]`), persistiendo toda la actividad en PocketBase.

## Estructura del Proyecto

```
network-tracker/
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # Variables de entorno y DNS resolution
│   │   ├── controllers/               # Controladores API REST
│   │   ├── routes/                    # Rutas API (/api/status, /api/devices, etc.)
│   │   ├── services/
│   │   │   ├── router.service.ts      # Scraper del router Sagemcom
│   │   │   ├── pocketbase.service.ts  # Cliente y persistencia en PocketBase
│   │   │   └── monitor.service.ts     # Daemon de detección de estados
│   │   └── server.ts                  # Servidor Express
│   ├── tests/
│   │   └── tracker.test.ts            # Suite de pruebas automatizadas
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── StatsCards.tsx         # Métricas en vivo y estado del router
    │   │   ├── DevicesTable.tsx       # Tabla de dispositivos online/offline con filtros
    │   │   ├── ActivityLog.tsx        # Historial cronológico de conexiones/desconexiones
    │   │   └── AliasModal.tsx         # Asignación de nombres personalizados
    │   ├── api.ts                     # Cliente HTTP hacia el backend
    │   ├── App.tsx                    # Layout principal y tabs
    │   └── main.tsx
    └── package.json
```

## Requisitos
- Node.js 18+
- PNPM 8+

## Ejecución Local

### 1. Iniciar Backend
```bash
cd backend
pnpm install
pnpm dev
```
El backend correrá en `http://localhost:3001` y comenzará inmediatamente a monitorear el router cada 15 segundos.

### 2. Iniciar Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
El panel estará disponible en `http://localhost:5175`.

## Pruebas Automatizadas
Para verificar en cualquier momento que la conexión al router, el parseo de dispositivos y la base de datos en PocketBase funcionen correctamente:
```bash
cd backend
pnpm test
```

## Ejecución 24/7 en el VPS (Opcional)
Dado que el VPS tiene acceso directo al router y aloja PocketBase de forma local, el backend puede ejecutarse también en el VPS con PM2:
```bash
pm2 start dist/server.js --name "network-tracker"
pm2 save
```
