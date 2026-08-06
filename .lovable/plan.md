---
name: UX & Interface Hardening Plan (v6.2)
description: Modernize the initial UI and login flow with smooth animations, performance optimizations, and enhanced branding.
type: feature
---

# Implementation Plan — UX & Interface Hardening (v6.2)

This plan details the implementation of a more modern, responsive, and ultra-fluid interface, with a specific focus on the login experience and initial interactions.

## 1. Visual Aesthetics & Branding (Mago IA Integration)
- **Palette Refinement**: Reinforce the use of Magic Purple (`#6B46E0`) and Brand Gold (`#EF9F27`) across the app.
- **Animated Backgrounds**: Implement subtle, GPU-accelerated "blobs" or animated gradients in the background of auth/landing pages for a "magical" feel.
- **Enhanced Logo Interactions**: Add a pulse and rotation effect to the wizard logo in `src/components/logo.tsx` during loading states or specific interactions.

## 2. Ultra-Fluid Login Flow (`src/routes/auth.tsx`)
- **GPU-Accelerated Transitions**: Replace standard transitions with high-performance CSS transforms (`translateY`, `opacity`, `scale`).
- **Modal Logic Optimization**:
  - Implement a `slideUp` animation for the auth container when it enters.
  - Add a `fadeIn` overlay effect.
- **Input Micro-interactions**:
  - Add a "subtle glow" neon effect when input fields are focused.
  - Implement a dedicated password visibility toggle with smooth icon transitions.
- **Loading UX**:
  - Use a refined "magical" spinner that matches the branding.
  - Ensure zero delay in tab switching (Login / Signup / Forgot) by pre-calculating layouts.

## 3. Global Interface Refinement
- **Performance Optimization**: 
  - Ensure animations use `will-change: transform, opacity` to leverage GPU.
  - Minimize JavaScript-heavy animations in favor of CSS transitions.
- **Accessibility & Touch**:
  - Ensure all tap targets are at least 44px (consistent with previous hardening).
  - Implement a custom scrollbar that matches the Magic Purple theme.
- **Skeleton & Loading States**:
  - Refine the `LeadSkeleton` and other loading components to be smoother and more visually integrated.

## 4. Technical Roadmap
1. **Logo & Assets**: Update `src/components/logo.tsx` with enhanced animation states.
2. **Auth Page**: Refactor `src/routes/auth.tsx` with the new performance-first animation stack and visual tweaks.
3. **Global Styles**: Update `src/styles.css` (Tailwind v4) with new utility classes for "magical" effects (blobs, custom scrollbars).
4. **Testing**: Validate performance and responsiveness on mobile (iPhone/Android) via Playwright or device simulation.
