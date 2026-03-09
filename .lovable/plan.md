

## Add Multi-Language Support (French, English, Moroccan Darija)

This is a significant feature that adds internationalization (i18n) to the restaurant dashboard. Each tenant can choose their preferred language.

### Architecture

1. **Database**: Add `language` column to `app_settings` table (default: `'fr'`)
2. **Translation system**: Create a `LanguageContext` + translation dictionary files for `fr`, `en`, `ar` (Darija)
3. **Settings UI**: Add a language selector card in the Settings page
4. **RTL support**: For Arabic/Darija, add `dir="rtl"` on the document root

### Files to Create/Edit

**1. Database migration** -- Add `language` column to `app_settings`
```sql
ALTER TABLE app_settings ADD COLUMN language text NOT NULL DEFAULT 'fr';
```

**2. `src/lib/translations.ts`** (New) -- Translation dictionary with all 3 languages. Keys organized by section (sidebar, dashboard, settings, common, etc.). Covers all hardcoded French strings across the app.

**3. `src/contexts/LanguageContext.tsx`** (New) -- React context providing:
- `language`: current language code (`fr` | `en` | `ar`)
- `t(key)`: translation function that looks up from dictionary
- `dir`: `'rtl'` for Arabic, `'ltr'` otherwise
- Reads language from `app_settings` query

**4. `src/pages/Settings.tsx`** -- Add a "Language / Langue" card with 3 radio options:
- Francais (fr)
- English (en)
- الدارجة المغربية (ar)
Include flag icons or labels. Save to `app_settings.language`.

**5. `src/components/Layout.tsx`** -- Apply `dir` attribute from LanguageContext to handle RTL for Darija.

**6. Wrap app with LanguageProvider** in `src/App.tsx`

**7. Update all major UI components** to use `t()` instead of hardcoded French:
- `src/components/Sidebar.tsx` -- Nav labels
- `src/pages/Dashboard.tsx` -- Stats, headings
- `src/pages/Settings.tsx` -- All labels
- `src/components/StatCard.tsx`
- `src/pages/Auth.tsx` -- Login/signup form
- All other pages (Products, Sales, Purchases, Employees, Attendance, POS, etc.)

### Translation Coverage

The translation dictionary will cover approximately 300+ keys across:
- Navigation items (Dashboard, Products, Sales, etc.)
- Common actions (Save, Cancel, Delete, Edit, Add, Search)
- Form labels and placeholders
- Status messages and toasts
- Dashboard statistics labels
- Table headers
- Dialog titles and descriptions

### RTL Handling for Darija

When Arabic is selected:
- Set `document.documentElement.dir = 'rtl'`
- Tailwind CSS handles most RTL flipping automatically
- Sidebar position swaps to right side via `dir` attribute

### Scope

This will touch most page and component files but only changes string literals -- no feature or logic changes.

