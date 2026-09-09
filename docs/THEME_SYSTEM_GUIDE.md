# DevAlign AI Theme System Guide

This document defines the single source of truth for the Light & Dark theme architecture in DevAlign AI.

---

## 1. Executive Summary (For Project Owners)
DevAlign AI supports both **Light Mode** and **Dark Mode** (plus System preference synchronization). 
- Users can switch themes using the theme selector in the application header.
- The chosen theme **persists** across page reloads, tab navigation, logins, and browser restarts.
- The design maintains visual hierarchy, high contrast, and accessible UI standards in both modes without resetting.

---

## 2. Architecture Overview
DevAlign AI uses a centralized client-side React Context (`ThemeContext.tsx`) paired with Tailwind CSS class-based strategy (`darkMode: 'class'`).

### Core Components:
1. **Single Source of Truth**: `frontend/context/ThemeContext.tsx`
2. **Root HTML Element Binding**: Directly attaches or removes `.dark` and `.light` classes on `document.documentElement` (`<html class="dark">` / `<html class="light">`).
3. **Tailwind Config**: Configured with `darkMode: 'class'` in `tailwind.config.js`.
4. **CSS Tokens**: Base surface and background variables defined in `app/globals.css`.

---

## 3. Theme Persistence & Hydration Safety

### Local Storage Key
- Key: `devalign_theme`
- Allowed Values: `'light'`, `'dark'`, `'system'`

### Hydration Error Prevention
To prevent Next.js SSR hydration mismatches (where server renders HTML without theme and client modifies DOM):
- `layout.tsx` marks `<html suppressHydrationWarning>` on the root element.
- `ThemeContext.tsx` checks `window` / `localStorage` inside `useEffect` post-mount.
- Client state initializations safely fallback to `'dark'` until mounted.

---

## 4. How Components Must Support Themes

Every UI component in DevAlign AI MUST support both Light and Dark mode using Tailwind class pairings.

### Color Pairing Rules

| UI Role | Light Mode Utility Class | Dark Mode Utility Class | Combined Class String |
|---|---|---|---|
| Page Background | `bg-slate-50` | `dark:bg-slate-950` | `bg-slate-50 dark:bg-slate-950` |
| Card / Panel Surface | `bg-white` | `dark:bg-slate-900` | `bg-white dark:bg-slate-900` |
| Subtle Surface / Input | `bg-slate-100` / `bg-slate-50` | `dark:bg-slate-950` | `bg-slate-50 dark:bg-slate-950` |
| Primary Text | `text-slate-900` | `dark:text-white` | `text-slate-900 dark:text-white` |
| Secondary Text | `text-slate-600` | `dark:text-slate-400` | `text-slate-600 dark:text-slate-400` |
| Border | `border-slate-200` | `dark:border-slate-800` | `border-slate-200 dark:border-slate-800` |
| Hover State | `hover:bg-slate-100` | `dark:hover:bg-slate-800` | `hover:bg-slate-100 dark:hover:bg-slate-800` |

---

## 5. Standard Component Code Pattern

When creating a new UI component, follow this pattern:

```tsx
import React from 'react';

export function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition">
      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{description}</p>
    </div>
  );
}
```

---

## 6. Common Development Mistakes to Avoid

1. ❌ **Hardcoding Dark Classes**:
   - `bg-slate-900` without `bg-white` / `dark:bg-slate-900`.
   - Result: Component remains pitch dark even when user activates Light Mode.
2. ❌ **Hardcoding Light Classes**:
   - `bg-white text-black` without `dark:bg-slate-900 dark:text-white`.
   - Result: Bright white box glaring in Dark Mode.
3. ❌ **Creating Local Theme Hooks/State**:
   - Creating a `useState('dark')` inside a component instead of invoking `useTheme()`.
   - Result: Component loses sync with header toggle.
4. ❌ **Direct Unsafe `document` or `localStorage` Access During SSR**:
   - Accessing `localStorage.getItem` directly in render body.
   - Result: Next.js build crash or hydration mismatch error.

---

## 7. Mandatory Developer Rule

> **RULE**: *Every new UI component added to DevAlign AI MUST support both Light and Dark mode.*

---

## 8. Theme Testing Procedure

To verify theme integrity manually:
1. Open DevAlign AI in browser (`http://localhost:3000`).
2. Click theme dropdown in Header: Select **Light Mode**.
   - Verify all background cards, text, tables, modals turn clean light slate.
3. Refresh page (`F5`).
   - Verify theme remains **Light Mode**.
4. Navigate across routes (`/projects`, `/teams`, `/tasks`, `/recommendations`, `/analytics`, `/ai-planning`).
   - Verify theme remains consistent across navigation.
5. Click theme dropdown: Select **Dark Mode**.
   - Verify page transitions smoothly to sleek dark mode.
6. Open devtools console: Ensure no React hydration warning errors appear.
