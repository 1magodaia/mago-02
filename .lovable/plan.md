---
name: Strategic Explainability & Fluidity Hardening (v6.3)
description: Enhance the UI to clearly explain Pro vs Free benefits, improve fluidity, and align visually with the new brand video/logo.
type: feature
---

# Implementation Plan — Strategic Explainability & Fluidity (v6.3)

This plan focuses on making the app more intuitive for users (Free and Pro) and improving the perceived speed (fluidity) while aligning with the magical wizard theme shown in the provided logo and video.

## 1. Membership Explainability & UX
- **Membership Status Badge**: Add a floating or header-integrated badge in `src/routes/index.tsx` that shows the user's current plan (Free/Pro) and a "Benefits" button.
- **Enhanced Quota Block**: Refactor `FreeQuotaBlock` in `src/routes/index.tsx` to include a visual comparison table (Free vs Pro) to clearly explain the value proposition.
- **Pro Teaser Enhancements**: Improve the `ProTeaser` component to show "Locked" features (like citations or full emails) with a "magical" blur effect and a clear upgrade CTA.
- **Feature Highlighting**: Add subtle "Pro" icons next to features that are exclusive to paying members.

## 2. Visual Alignment (Mago IA Theme)
- **Video Background/Teaser**: Integrate the provided wizard video (`Anime_mago_globe_business...`) as a "How it works" teaser in the `HeroBanner` or a dedicated section.
- **Magical Particles & Glows**:
    - Add a `MagicalParticles` background component for auth and landing pages.
    - Enhance `EnhancedLogoImg` with even smoother, more mystical transitions.
    - Use more "Magic Purple" and "Brand Gold" gradients for buttons and active states.

## 3. Interaction Fluidity & Performance
- **Instant Result Actions**: 
    - Optimize `LeadResultCard` link handling to open external sites immediately while the app records the interaction in the background.
    - Replace the "Zap" audit button with a more integrated "Magical Scan" animation that feels faster.
- **Optimized Loading States**: 
    - Implement better skeleton loaders for the entire result list to prevent layout shifts.
    - Add a "Pre-caching" layer for common search categories to make initial loads feel instant.
- **Safe-Area Polish**: Ensure all new UI elements respect mobile safe areas and notch constraints.

## 4. Technical Roadmap
1. **DB/Schema**: No changes required (leverages existing `unlock_link` and `search_count`).
2. **Components**:
    - Create `MembershipBadge.tsx`.
    - Update `HeroBanner.tsx` to support the video teaser.
    - Refactor `LeadResultCard.tsx` for interaction speed.
3. **Styles**: Add `magical-glow` and `particle-bg` utility classes in `src/styles.css`.
4. **Validation**: Test the "upgrade flow" to ensure it's frictionless for Free users.
