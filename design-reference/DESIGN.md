---
name: Marine Spatial Intelligence
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#bbc9c7'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#869491'
  outline-variant: '#3c4947'
  surface-tint: '#5adace'
  primary: '#6feee1'
  on-primary: '#003733'
  primary-container: '#4fd1c5'
  on-primary-container: '#005750'
  inverse-primary: '#006a63'
  secondary: '#aecae1'
  on-secondary: '#173345'
  secondary-container: '#314c5f'
  on-secondary-container: '#a0bcd2'
  tertiary: '#c7dcef'
  on-tertiary: '#1f3241'
  tertiary-container: '#acc0d3'
  on-tertiary-container: '#3b4f5e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79f7ea'
  primary-fixed-dim: '#5adace'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#cae6fd'
  secondary-fixed-dim: '#aecae1'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#2f4a5c'
  tertiary-fixed: '#d0e5f8'
  tertiary-fixed-dim: '#b5c9dc'
  on-tertiary-fixed: '#081d2b'
  on-tertiary-fixed-variant: '#364958'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max-width: 1440px
---

## Brand & Style
The design system is built upon a philosophy of **Atmospheric Precision**. It targets high-stakes maritime decision-making where clarity and focus are paramount. The visual language balances a serious, technical foundation with a premium, spatial aesthetic that mimics the layered depth of the ocean.

The style is a refined fusion of **Glassmorphism** and **Minimalism**. It utilizes high-transparency surfaces, deep environmental blurs, and subtle light-leak effects to create a sense of immersion. The UI should feel like a sophisticated HUD (Heads-Up Display) projected within a clear, marine environment—uncluttered, professional, and technologically advanced.

## Colors
The palette is rooted in the deep-sea spectrum. The **Deep Abyss Navy** serves as the infinite canvas, providing maximum contrast for data visualization. **Sea-glass Cyan** is reserved strictly for interactive elements, critical data paths, and active AI states, ensuring it acts as a beacon within the dark interface.

Surfaces use a tiered approach to **Translucent Sea-glass Blue**. Higher-level containers should have lower opacity and higher blur to simulate proximity to the "surface," while lower-level background panels are more opaque. Use **Soft White** for primary text to ensure AA-level contrast, and **Muted Slate** for secondary metadata to maintain visual hierarchy without clutter.

## Typography
The typography strategy creates a tension between brand character and functional utility. **Outfit** is used for high-level headings and brand moments; its wide, rounded apertures feel modern and expansive. 

For all data-heavy and interactive UI elements, **Plus Jakarta Sans** provides exceptional legibility. Use generous line heights (1.5x for body) to maintain the "airy" spatial feel. Label styles should utilize slight tracking (letter-spacing) and semi-bold weights to remain distinct even when placed on semi-transparent glass backgrounds.

## Layout & Spacing
The system employs a **Fluid Spatial Grid**. Layouts should feel open and unconfined. Components are placed on a 12-column grid for desktop, but spacing is driven by large, intentional gaps (24px+ gutters) to prevent the "dense dashboard" feel common in legacy maritime software.

Margins are wide to frame the content, suggesting a window into a vast environment. On mobile, the layout reflows to a single column with reduced margins, but the vertical rhythm remains consistent to preserve the premium feel. Use "Safe Areas" around floating glass panels to ensure backdrop blurs don't overlap awkwardly with high-contrast text beneath.

## Elevation & Depth
Depth is not communicated via shadows, but through **Optical Layering**. 
1. **The Abyss (Base):** Solid `#050B14`.
2. **The Trench (Secondary):** Deep Navy cards with 2px inner glows to define edges.
3. **The Reef (Active Surface):** Glassmorphic panels with `#1A3648` at 60% opacity and a 16px backdrop blur.
4. **The Surface (Interaction):** Floating elements with 1px `#4FD1C5` (at 30% opacity) borders and subtle top-down "environmental" lighting gradients.

Edges must be defined by **1px translucent borders** rather than drop shadows. This creates a "thin-film" aesthetic that feels technical and precise. Use a subtle linear gradient (from top-left to bottom-right) on the border to simulate a light source reflecting off the glass edge.

## Shapes
The shape language is **Organic yet Structural**. High corner radii are essential to the design system's approachable and modern marine character. Large parent containers should use a 24px or 32px radius, while nested components (like buttons or input fields) scale down to 12px.

Avoid sharp 90-degree angles entirely. This "softened tech" approach ensures that even complex data displays feel fluid and integrated into the atmospheric background.

## Components
- **Glass Buttons:** Primary buttons use a solid `#4FD1C5` with dark text. Secondary buttons use a glass background with a `#4FD1C5` 1px border. Hover states should trigger an increase in backdrop blur and a soft outer glow.
- **Data Cards:** Containers with a 24px radius and a 12px backdrop blur. Content should be padded by 24px internally.
- **Input Fields:** Semi-transparent dark fills (`#000000` at 20%) with a bottom-only or subtle all-around border that brightens on focus.
- **Spatial Chips:** Rounded (pill-shaped) indicators for status. Use Sea-glass Cyan for "Active/Stable" and a muted Coral for "Alerts."
- **Layered Lists:** List items separated by 1px low-opacity lines; use a subtle hover state that "lifts" the item by increasing its background opacity by 10%.
- **Environmental Indicators:** Vertical progress bars or gauges should use glowing gradients of Cyan to represent fluid levels or AI confidence scores.