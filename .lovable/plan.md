

## UI Overhaul: Restaurant Dashboard

Based on the reference image, here's the plan to match that design. No features will be changed — only visual presentation.

### Changes Overview

**1. Remove Dark Mode Toggle from Layout (`src/components/Layout.tsx`)**
- Remove `ThemeToggle` import and usage from the restaurant layout header
- Add a notification bell icon and user avatar (matching the reference top-right area)

**2. Redesign Sidebar (`src/components/Sidebar.tsx`)**
- Change sidebar background to a dark teal/green (`bg-[#1a3a36]` or similar) matching the reference
- White text for nav items, active item gets a lighter highlight background
- Group nav items with section labels ("Opérations", "Ventes") as shown in the reference
- Add user profile section at bottom with avatar and name
- Restaurant name in white at the top

**3. Redesign Dashboard Page (`src/pages/Dashboard.tsx`)**
- **Stat Cards**: Use colored background fills (green, purple, orange, blue) instead of just left-border accent. Larger bold values, subtle description text below values (e.g., "+15 vs hier", "+5% monthly trend", "12 transaction items")
- **Quick Action Cards** (Commandes en Attente / Produits en Stock): Larger cards with colored left borders (orange/green), flag emoji for pending, subtitle text ("À TRAITER", "Niveau optimal")
- Light gray page background (`bg-gray-50`)

**4. Redesign StatCard (`src/components/StatCard.tsx`)**
- Cards get a full colored background tint matching the reference (green card, purple card, orange card, blue card)
- Icon on the right side, white/dark icon in a subtle container
- Remove left-border style, use rounded cards with colored backgrounds

**5. Redesign Dashboard Charts (`src/components/DashboardCharts.tsx`)**
- **Stock by Category chart**: Replace vertical bar chart with horizontal bars showing item count + percentage labels on the right (matching reference: colored bars with "60 Items 50.00%" format)
- **Purchases chart**: Keep area chart, use teal/cyan color to match reference gradient

**6. Force Light Theme for Restaurant Pages**
- In the Layout component, force `document.documentElement.classList` to use light theme (remove "dark" class) so restaurant dashboard is always light mode

### Files to Edit
1. `src/components/Layout.tsx` — Remove ThemeToggle, add bell + avatar, force light
2. `src/components/Sidebar.tsx` — Dark teal sidebar with grouped sections, user profile at bottom
3. `src/pages/Dashboard.tsx` — Updated card layout and quick actions styling
4. `src/components/StatCard.tsx` — Colored background cards matching reference
5. `src/components/DashboardCharts.tsx` — Horizontal bars with labels for stock chart, teal area chart

