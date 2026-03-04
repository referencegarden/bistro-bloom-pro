

# PWA Offline-First Enhancement Plan

## Goal
Make the app resilient to internet outages by caching the UI and queuing operations locally, then syncing when connectivity returns. The app still needs internet for initial setup and periodic sync, but can function during temporary outages.

## What this does NOT do
- Does not eliminate the need for internet entirely
- Does not create a local database server

## Changes

### 1. Add PWA Support
- Create `public/manifest.json` with app name, icons, theme
- Create `public/sw.js` service worker to cache static assets and API responses
- Register service worker in `src/main.tsx`
- Add meta tags to `index.html`

### 2. Add Offline Data Cache Layer
- Create `src/lib/offlineStorage.ts` using IndexedDB (via a small wrapper)
- Cache critical read data: products, menu items, employees, categories
- On page load: show cached data immediately, refresh from server in background

### 3. Add Offline Action Queue
- Create `src/lib/offlineQueue.ts` to store pending mutations (sales, attendance, orders) in IndexedDB when offline
- On reconnection: replay queued actions to the server
- Show badge/indicator for pending unsynced actions

### 4. Add Online/Offline Status Indicator
- Create `src/components/ConnectionStatus.tsx` — small banner when offline
- Use `navigator.onLine` + periodic health check to detect connectivity

### 5. Update Key Pages
- **POS**: Cache menu items, allow creating orders offline, queue for sync
- **Attendance**: Allow check-in/out offline, queue for sync
- **Sales**: Cache products, allow recording sales offline

## Files to Create/Modify
| File | Action |
|------|--------|
| `public/manifest.json` | Create |
| `public/sw.js` | Create |
| `index.html` | Modify (add manifest link + meta tags) |
| `src/main.tsx` | Modify (register service worker) |
| `src/lib/offlineStorage.ts` | Create |
| `src/lib/offlineQueue.ts` | Create |
| `src/components/ConnectionStatus.tsx` | Create |
| `src/components/Layout.tsx` | Modify (add ConnectionStatus) |
| Key pages (POS, Attendance, Sales) | Modify (add offline cache reads + queue writes) |

## Limitation
Authentication still requires internet. Users must log in while online; sessions are cached locally afterward.

