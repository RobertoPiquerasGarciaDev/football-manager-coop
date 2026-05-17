# Pitch Perfect QA Audit

## Estado verificado

- Frontend local: `http://localhost:3000`.
- Backend local: `http://localhost:3001`.
- Producción frontend: `https://football-manager-ui.vercel.app`.
- Producción backend: `https://backend-production-d7a8.up.railway.app`.

## Checks automáticos

- TypeScript: `pnpm exec tsc --noEmit`.
- Backend build: `pnpm --filter football-manager-coop-server build`.
- Frontend build: `pnpm build`.
- API smoke tests: `pnpm test`.
- Health: `GET /health`.

## Flujos funcionando

- Registro, login y JWT.
- Crear liga, unirse por código y asignar club por usuario.
- Lobby, mercado de verano, cierre por ready de managers y temporada activa.
- Restricción backend de turnos/fichajes según estado de mercado.
- Confirmación de turnos y simulación automática de jornada completa.
- Clubs bot, partidos de bots y clasificación recalculada desde `matches`.
- Notificaciones persistidas y Realtime para ligas, turnos, partidos, standings, transferencias, finanzas y chat.
- Finanzas persistidas por club con balance, deuda, presupuestos, fair play financiero y proyección a 12 semanas.
- Mercado con valoración dinámica, ofertas, contraofertas, aceptación/rechazo y expiración a 72h.
- Chat de liga persistido por canal.

## Riesgos residuales no bloqueantes

- La IA táctica de bots es determinista y básica, suficiente para simular jornadas completas pero no todavía comparable a un motor táctico profundo.
- Lighthouse debe ejecutarse con navegador real en el entorno final; el build de Next se mantiene dentro del objetivo operativo.
- Las finanzas usan fórmulas realistas simplificadas y se recalculan por jornada.
