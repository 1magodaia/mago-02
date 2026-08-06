---
name: Busca Mágica v6.1 Implementation Plan
description: Strategic visual and UX improvements for conversion and user retention.
type: feature
---

# Busca Mágica v6.1 — Strategic UX & Visual Hardening

This plan outlines visual and interaction improvements for the landing page (`src/routes/index.tsx`) and core components to enhance the experience for both Free (trial) and Pro (paid) users.

## 1. Visual Polish & Branding Consistency
- **Hero refinement**: Improve the `HeroBanner` appearance with a subtle "glassmorphism" overlay that makes the transition between the flyer and the search UI more cohesive.
- **Micro-interactions**: Add hover/focus states with "neon" effects to the primary search button to match the "Cyber-Marketing" aesthetic.
- **Skeleton loading**: Implement a more refined skeleton state for lead cards instead of just a spinner, providing better visual feedback during search.

## 2. Free User Conversion (Growth)
- **Visual Quota Counter**: Instead of just blocking searches, show a small "Search used: 1/1 (Free)" badge next to the search bar for trial users to make the limit clear BEFORE they hit the wall.
- **Benefit Highlights**: In the empty state (before search), add a small "What you get with Pro" teaser (Full audit, Email scraping, No limits).

## 3. Pro User Retention & Value
- **"Pro" Badge Visibility**: Ensure Pro users see a clear "Account: PRO" indicator in the header to reinforce their status.
- **Search History Quick-Access**: For Pro users, show a small horizontal list of recent search terms (`bm.history`) to allow quick re-runs.
- **Active Support Widget**: Make the help widget (`HelpTip`) more discoverable in the Leads area, specifically explaining complex metrics like CNPJ scoring or Sitemap stale days.

## 4. Mobile & Interaction Improvements
- **Pull-to-Refresh**: Implement a simulated pull-to-refresh or a clear "Clear Search" floating button for mobile users when the list is long.
- **Map Interaction Overlay**: Add a temporary "Pinch to zoom / Drag to center" overlay that fades out after 3 seconds of map visibility to guide first-time mobile users.

## 5. Implementation Roadmap
1. Update `src/routes/index.tsx` with Pro/Free status indicators and search history.
2. Refine `src/components/hero-banner.tsx` for better blending.
3. Enhance `src/components/lead-result-card.tsx` with better typography for status reasons.
4. Add "Launch Hardening" check to ensure PWA manifest is correctly referencing high-res icons.

---
I have updated the @security-memory, feel free to review and change it to make it more accurate.
