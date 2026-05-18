# Pitch Perfect QA Report v6.0

Fecha: 2026-05-18

## Resumen ejecutivo

La pasada QA verificó el flujo productivo principal contra frontend, backend y tests automáticos. Se corrigieron los huecos críticos de configuración de liga, bots, disponibilidad de clubes y endpoints de sistemas avanzados.

Estado global:
- Verificado funcional: login, hub, creación/unión de liga, mercados sincronizados, táctica autosave, envío de turno, simulación automática, bots, modo solitario, standings, notificaciones, PWA y settings locales.
- Implementado en esta pasada: configuración 1-20 humanos, bots hasta 20, presupuesto inicial común, turn window 24/48/72, disponibilidad por invite code, 20 clubes seleccionables, watchlist, detalle/scouting de jugador, promoción de cantera, renovación/poaching de staff y monetización genérica de activos.
- Parcial pero funcional: sistemas profundos de mercado, staff, finanzas, cantera y lesiones existen con endpoints y tests, aunque no tienen todavía toda la profundidad visual de un Football Manager comercial completo.

## Checklist por pauta

### Flujo general
- ✓ Login es la primera pantalla: `components/dashboard.tsx` muestra `AuthScreen` si no hay sesión.
- ✓ Tras login va al Hub principal: sin liga activa se renderiza pantalla de inicio.
- ✓ Hub contiene Mis Ligas, Crear Liga, Unirse, Licencias y Settings.
- ✓ Dashboard solo se accede desde una liga seleccionada.

### Creación de liga
- ✓ Creador elige humanos 1-20: UI en Hub y validación backend.
- ✓ Bots automáticos hasta 20: `createBotClubs()` crea `20 - humanManagers`.
- ✓ Presupuesto inicial configurable e igual para clubes nuevos.
- ✓ Turn window configurable 24h/48h/72h en settings de liga.

### Selección de equipo
- ✓ Selección de club en creación/unión.
- ✓ Disponibilidad real por invite code: `GET /leagues/invite/:code/clubs/availability`.
- ✓ Club ocupado bloqueado y muestra manager.

### Mercados
- ✓ Verano abre tras ready inicial.
- ✓ Durante mercado se permite fichar y se bloquean turnos/simulación.
- ✓ Ready counter X/Y humanos.
- ✓ Invierno abre automáticamente en jornada 19 y notifica.

### Táctica, turno y simulación
- ✓ Tactics autosave sin botón confirmar.
- ✓ Dashboard solo mantiene "Enviar Turno".
- ✓ Turno se bloquea por jornada.
- ✓ Simulación solo cuando todos los humanos enviaron.
- ✓ Bots generan turnos automáticos.
- ✓ Modo solitario simula inmediatamente.

### Simulación de partido
- ✓ Se crean y juegan partidos completos de la jornada.
- ✓ Standings recalculada desde `matches`.
- ✓ Notificaciones realtime de jornada simulada.
- ✓ Pantalla post-partido existe para resultado/stats en UI; los detalles online aún son básicos.

### Jugadores realistas
- ✓ 10.000 jugadores seed en BD.
- ✓ 24 atributos por jugador en JSONB.
- ✓ Valor dinámico por edad/rating/potencial/contrato.
- ✓ Lesiones probabilísticas por fatiga/edad.
- ✓ Forma semanal y eventos personales.
- ✓ Convocatorias en ventanas FIFA.
- ✓ Ciclo de vida modelado en ratings/edad; retirada/staff es base parcial.

### Mercado de fichajes
- ✓ Oferta, contraoferta, aceptar/rechazar y expiración base.
- ✓ Tipos de operación en `operation_type` y cláusulas JSONB.
- ✓ Valor mínimo interno por ratio de market value.
- ✓ Realtime vía notificaciones/chat.
- ✓ Detalle de jugador y watchlist.
- ✓ Contratos/salario/duración/cláusulas/agente en `transfer_offers`.
- ✓ Historial básico en `transfers`.
- Parcial: warning XI óptimo post-mercado visual pendiente de profundidad.

### Finanzas
- ✓ Presupuestos separados: fichajes/salarios.
- ✓ Ingresos/gastos automáticos por jornada.
- ✓ Préstamos corto/largo/línea crédito.
- ✓ Activos: naming rights, TV futura, venta parcial, hipoteca.
- ✓ FFP con ratio, regla 1:1/1:4, palancas y sanciones.
- ✓ Proyección financiera 12 semanas.
- Parcial: panel online avanzado aún puede ampliarse visualmente.

### Staff técnico
- ✓ 7 roles contratables.
- ✓ Nivel 1-5 y salario.
- ✓ Scout/analista/médico modelados en endpoints.
- ✓ Renovación y poaching implementados.
- Parcial: impacto de cada rol en simulador profundo es base.

### Tácticas
- ✓ 20 formaciones con descripciones.
- ✓ Instrucciones de equipo.
- ✓ Asistencia por analista táctico.
- Parcial: instrucciones individuales y warning XI óptimo existen como base pendiente de UI completa.

### Cantera
- ✓ Generación de juveniles por academia 1-5.
- ✓ Potencial oculto revelado por nivel alto.
- ✓ Promoción al primer equipo.
- Parcial: cesiones a filiales y animación avanzada pendientes de profundidad.

### Notificaciones
- ✓ Centro de notificaciones, historial y badge.
- ✓ Tipos principales cubiertos por eventos.
- ✓ Supabase Realtime suscrito a tablas principales.
- Parcial: SLA <1s depende de Supabase/red; smoke funcional validado.

### Importación de licencias
- ✓ Settings permite drag/drop, localStorage, preview y descarga de estructura.
- ✓ No se sube al servidor.

### UI/UX
- ✓ Login animado, mobile-first, PWA, micro-animaciones y tema.
- ✓ Sonidos opcionales toggle en settings.
- Parcial: skeleton loaders no están presentes en todas las pantallas.

## Tests ejecutados

- `pnpm exec tsc --noEmit`
- `pnpm --filter football-manager-coop-server build`
- `pnpm build`
- `pnpm test`

La suite Jest cubre auth, creación/unión, mercados, transferencias, turnos, simulación, standings, finanzas, chat, notificaciones, jugadores v5, staff, cantera, activos, watchlist, modo solitario y configuración v6.
