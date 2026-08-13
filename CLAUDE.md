# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is **Le Quint Hotel** — a Hotel PMS (Property Management System) built on the "Fury" Angular 16 Material Design admin template, backed by Firebase (Auth + Firestore + Storage + Cloud Functions + Messaging). The UI is in Spanish. It covers front desk, bookings, calendar, rooms, housekeeping, guest accounts, POS, cash register, invoicing, inventory, employees, users, permissions, and financial reports for a single hotel property.

Firebase project: `lequinthotel-ca6ef` (see `.firebaserc`).

## Commands

```bash
npm start              # ng serve — dev server at http://localhost:4200
npm run build           # ng build --configuration production
npm test                 # ng test (Karma/Jasmine)
ng lint                  # TSLint (tslint.json — this project still uses TSLint, not ESLint)
```

Running a single test: Karma doesn't support a CLI test-name filter well in this setup; scope with `fdescribe`/`fit` in the relevant `*.spec.ts` file, or restrict via `ng test --include='**/some.spec.ts'`.

Firebase Cloud Functions (in `functions/`, separate TypeScript project/package.json):
```bash
cd functions
npm run build            # tsc
npm run serve            # build + firebase emulators:start --only functions
npm run shell             # build + firebase functions:shell
npm run deploy            # firebase deploy --only functions
npm run logs               # firebase functions:log
```

Firebase deploys from repo root:
```bash
firebase deploy                          # everything
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

Dev container: this repo is normally opened via VS Code Dev Containers (`.devcontainer/`); see `DEV_CONTAINER_GUIDE.md` for the rebuild/persistence workflow. `check-persistence.sh` verifies the container's persistent volumes.

## Critical rule: never use `.toPromise()`

`.toPromise()` is deprecated in RxJS 7 and has caused silent failures in async service methods (see `CONTEXTO.md`). Always use `firstValueFrom()` instead:

```typescript
// Wrong
const data = await observable$.toPromise();

// Correct
import { firstValueFrom } from 'rxjs';
const data = await firstValueFrom(observable$);
```

## Architecture

### Layering (repository pattern, partially migrated)

The codebase is mid-migration to a layered/clean architecture. Two patterns currently coexist:

- **New pattern** (`domain/` + `infrastructure/`): `domain/repositories/*.repository.ts` are abstract contracts extending `BaseRepository<T>` (`src/app/domain/repositories/base.repository.ts`); `infrastructure/repositories/*-firebase.repository.ts` implement them against Firestore, typically extending `BaseFirestoreRepository<T>` (`src/app/infrastructure/repositories/base-firestore.repository.ts`). Wiring happens in `app.module.ts` via `{ provide: XRepository, useClass: XFirebaseRepository }`. Follow this pattern for new entities — see `PATRON_REPOSITORY.md` for the full rationale and a worked example (Product).
- **Legacy pattern** (`core/repositories/`): older repositories (e.g. booking, guest, room, expense, inventory-movement, product) live directly under `src/app/core/repositories/` and are consumed by matching services in `src/app/core/services/`. These are not yet migrated to `domain`/`infrastructure`.

Layer flow: `Components (features/*, layout/*)` → `Services (core/services, application/services)` → `Repositories (domain/repositories abstract, or core/repositories directly)` → `Firestore`.

### Feature modules

`src/app/features/private/*` holds one lazy-loaded module per business area (bookings, calendar, cash-register, dashboard, employees, front-desk, guest-accounts, guests, housekeeping, inventory, invoices, notifications, parameters, permissions, pos, products, profile, reports, rooms, transactions, users). Each is registered as a lazy route in `src/app/app-routing.module.ts` under the `LayoutComponent` (guarded by `AuthGuard`). `src/app/features/public/login` handles auth. `src/app/examples/*` is unmodified Fury template demo content (auth pages, component showcases) — not part of the hotel domain.

### RBAC (role/permission system)

- Roles: `UserRole` enum in `src/app/core/models/user-role.enum.ts` (superadmin, admin, manager, receptionist, housekeeper, guest), with a numeric `ROLE_HIERARCHY`.
- Per-role allowed routes live in Firestore collection `rolePermissions`, seeded from `DEFAULT_ROLE_PERMISSIONS` in `src/app/domain/models/role-permission.model.ts` (superadmin gets `['*']`). Managed live via the `/permissions` feature module.
- Route access is enforced by `PermissionGuard` (`src/app/core/guards/permission.guard.ts`) via `PermissionService.hasRouteAccess()`, separately from `AuthGuard` which only checks authentication. The sidenav also hides items the current role can't access. See `PERMISSIONS_SYSTEM.md` and `GUARDS_Y_AUTORIZACION.md` for details.

### Core domain rules (hotel operations)

- **Bookings**: only active rooms can be booked; no overlapping dates for the same room; creating/cancelling a booking does not itself change the room's physical status — the visual `reserved` state is computed live from bookings.
- **Check-in**: only `confirmed` bookings; room must be `available` (shown as `reserved`); auto-creates a Guest Account with a lodging charge; room becomes `occupied`.
- **Check-out**: only `checked-in` bookings; room becomes `dirty` (not `cleaning`); the Guest Account stays open until manually closed, and can only close at balance = 0.
- **Guest Accounts**: only `open` accounts accept charges; 13% tax applied to charges; payments cannot exceed the pending balance.
- Room status values: `available | occupied | dirty | cleaning | maintenance | blocked`. Booking status values: `pending | confirmed | checked-in | checked-out | cancelled | no-show`.

Room map view (`features/private/rooms/room-map-actions-dialog`) renders per-floor SVGs from `src/assets/img/hotel-map/`, matching elements by `id="room-{number}"`; SVG click handlers must run inside `NgZone.run()` since they originate outside Angular's zone.

### Firestore

Key collections: `users`, `rooms`, `bookings`, `guestAccounts`, `rolePermissions`, `notifications`, `invoices`. Schemas and current `firestore.rules` content are documented in `CONTEXTO.md`. Composite indexes are in `firestore.indexes.json`. When adding a query that needs a new composite index, update `firestore.indexes.json` and deploy with `firebase deploy --only firestore:indexes` (or the console will emit a direct-create link on first query failure).

Cloud Functions (`functions/src/index.ts`) currently expose privileged, admin-only operations (e.g. `forceLogoutUser`, which revokes refresh tokens and resets Firestore session state) that can't be done safely from client-side security rules alone.

### Documentation map

This repo keeps extensive per-feature Markdown docs at the root (one file per module/topic, e.g. `BOOKINGS_MODULE_COMPLETE.md`, `HOUSEKEEPING_MODULE.md`, `INVOICING_MODULE_README.md`, `PERMISSIONS_SYSTEM.md`, `ROOMS_MAP_VIEW_V2.md`, `TEMAS_Y_COLORES.md`, etc.). `CONTEXTO.md` is the running master summary — check it first for cross-cutting context, known issues, and Firestore schemas before diving into an individual module doc.
