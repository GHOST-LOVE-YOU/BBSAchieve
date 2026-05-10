---
version: alpha
name: Slite Inspired (Dark)
description: An inspired interpretation of Slite's design language, dark-adapted — the warm-cream canvas gives way to a deep ink-navy near-black canvas (deepened from Slite's #2d2f34 ink color), preserving the deep-blue CTA and the 50-pixel pill button radius, while the six pastel section families dim to deep-saturated bands and the pill-tag rhythm flips its bg-text polarity (deeper bg, lighter ink).

colors:
  primary: "#2e77e5"
  primary-soft: "#5a98ee"
  on-primary: "#0c0d10"
  ink: "#ffffff"
  ink-strong: "#ffffff"
  canvas: "#0c0d10"
  canvas-soft: "#15171c"
  canvas-cream: "#1d1f25"
  surface: "#1d1f25"
  surface-elevated: "#262931"
  surface-deep: "#06070a"
  surface-blush: "#3a1a25"
  surface-butter: "#3a3215"
  surface-sage: "#1d3326"
  surface-sky: "#1a2839"
  surface-peach: "#3a251a"
  surface-mauve: "#321f2c"
  ink-secondary: "rgba(255,255,255,0.72)"
  ink-tertiary: "rgba(255,255,255,0.55)"
  ash: "rgba(255,255,255,0.40)"
  mute: "rgba(255,255,255,0.28)"
  hairline: "rgba(255,255,255,0.10)"
  hairline-soft: "rgba(255,255,255,0.06)"
  tag-yellow-bg: "#3a3215"
  tag-yellow-ink: "#f7e6a1"
  tag-green-bg: "#1d3326"
  tag-green-ink: "#a8d0ad"
  tag-blue-bg: "#1a2839"
  tag-blue-ink: "#9bb6dc"
  tag-mauve-bg: "#321f2c"
  tag-mauve-ink: "#e6b9d3"
  tag-turquoise-bg: "#13282e"
  tag-turquoise-ink: "#9ec4ce"
  tag-red-bg: "#3a1a1a"
  tag-red-ink: "#e6a3a3"
  super-gradient-start: "#3d1f31"
  super-gradient-mid: "#7a3982"
  super-gradient-end: "#3d2459"
  error: "#e6a3a3"
  success: "#a8d0ad"

typography:
  display-xl:
    fontFamily: Garnett
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  display-lg:
    fontFamily: Garnett
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  display-md:
    fontFamily: Garnett
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  heading-lg:
    fontFamily: Garnett
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  heading-md:
    fontFamily: Garnett
    fontSize: 19.2px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  body-lg:
    fontFamily: Garnett
    fontSize: 19.2px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  body-md:
    fontFamily: Garnett
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  body-md-bold:
    fontFamily: Garnett
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  link-md:
    fontFamily: Garnett
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  body-sm:
    fontFamily: Garnett
    fontSize: 13.6px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  body-sm-bold:
    fontFamily: Garnett
    fontSize: 13.6px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  caption-eyebrow:
    fontFamily: UniversalSans
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0
    textTransform: uppercase
    fontFeature: "ss14, ss15, ss19"
  caption-tag:
    fontFamily: UniversalSans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  button-md:
    fontFamily: UniversalSans
    fontSize: 13.6px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"
  button-lg:
    fontFamily: UniversalSans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: 0
  ui-md:
    fontFamily: UniversalSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: "ss14, ss15, ss19"

rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 12px
  xl: 16px
  pill: 42px
  pill-lg: 50px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  3xl: 40px
  section: 56px
  section-lg: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 12px 24px
  button-primary-pressed:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 24px
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 24px
  button-tertiary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 24px
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 12px 56px
  button-ghost:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 16px
  pill-tag-yellow:
    backgroundColor: "{colors.tag-yellow-bg}"
    textColor: "{colors.tag-yellow-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  pill-tag-green:
    backgroundColor: "{colors.tag-green-bg}"
    textColor: "{colors.tag-green-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  pill-tag-blue:
    backgroundColor: "{colors.tag-blue-bg}"
    textColor: "{colors.tag-blue-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  pill-tag-mauve:
    backgroundColor: "{colors.tag-mauve-bg}"
    textColor: "{colors.tag-mauve-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  pill-tag-turquoise:
    backgroundColor: "{colors.tag-turquoise-bg}"
    textColor: "{colors.tag-turquoise-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  pill-tag-red:
    backgroundColor: "{colors.tag-red-bg}"
    textColor: "{colors.tag-red-ink}"
    typography: "{typography.caption-tag}"
    rounded: "{rounded.pill-lg}"
    padding: 0 8px
  text-input:
    backgroundColor: "{colors.surface-deep}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
  text-input-focused:
    backgroundColor: "{colors.surface-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md-bold}"
    padding: 16px 32px
    height: 64px
  nav-link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md-bold}"
    padding: 8px 12px
  feature-card-pastel:
    backgroundColor: "{colors.surface-blush}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  feature-card-cream:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  feature-card-white:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  pricing-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  pricing-card-featured:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  customer-story-row:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 16px 24px
  testimonial-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  document-window-chrome:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 16px
  editor-formatting-tile:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-eyebrow}"
    rounded: "{rounded.lg}"
    padding: 16px
  faq-row:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    rounded: "{rounded.xl}"
    padding: 16px 24px
  super-suite-card:
    backgroundColor: "{colors.super-gradient-start}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  cta-banner-dark:
    backgroundColor: "{colors.surface-deep}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.xl}"
    padding: 48px
  sidebar-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md-bold}"
    rounded: "{rounded.lg}"
    padding: 8px 16px
  sidebar-tab-inactive:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 8px 16px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.body-sm}"
    padding: 64px 32px
  logo-strip-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ash}"
    padding: 32px 0
---

> This is the **dark mode** version of the Slite design system. It is fully self-contained — use this document alone when building dark-themed interfaces.

## Overview

The dark adaptation deepens Slite's #2d2f34 ink — already the brand's darkest color in light mode — into a true page canvas (`{colors.canvas}` #0c0d10), then layers two slightly-lighter surfaces above it for cards and elevated elements. The deep-blue CTA (`{colors.primary}` #2e77e5) is preserved and brightened one step from light's #1863dc, because dark canvases swallow the deeper blue. The 50-pixel pill button radius (`{rounded.pill-lg}`) carries through unchanged — the radius IS the brand's button identity in either theme.

What changes is the pastel system. Light Slite rotates six pastel section bands (peach, blush, butter, sage, sky, mauve) at high tinted-cream opacity. Dark Slite **inverts each pastel into a deep-saturated band** — blush becomes deep-rose-on-near-black, butter becomes deep-mustard, sage becomes forest, sky becomes deep-navy, mauve becomes deep-plum. The bands are still recognizable as their light-mode hue families, but they now read as warm color-pools floating on a near-black canvas, like stained-glass at night.

The pill-tag system flips polarity. In light mode each pill pairs a tinted-pastel-bg (e.g. `#c3dfc7` sage) with a darker-matching ink (e.g. `#547358` forest). In dark mode that polarity inverts: the pill-bg becomes the deep-saturated band hue (e.g. `#1d3326` forest-deep), and the pill-ink becomes the lifted lighter version (e.g. `#a8d0ad` sage-light). The tag's hue family remains the same; only its lightness pair flips. This keeps the six-color tag wheel recognizable across themes while preserving WCAG contrast on dark.

Text inverts to white at full strength, then steps down through three opacity tiers (72 % / 55 % / 40 % / 28 %) for body, helper, and disabled roles — instead of light mode's four named greys. The translucent-white opacity ladder is the dark equivalent of light's named ink-secondary / ink-tertiary / ash / mute.

The Garnett + UniversalSans pairing is unchanged. OpenType `ss14, ss15, ss19` features stay engaged. Body weight stays at 400 — white-on-dark already feels brighter than ink-on-cream, so do not be tempted to upweight body for the dark theme.

**Key Characteristics:**
- Three-step surface ladder: `{colors.canvas}` (#0c0d10) → `{colors.canvas-soft}` (#15171c) → `{colors.surface}` (#1d1f25), with `{colors.surface-elevated}` (#262931) for the rare floating-card moment and `{colors.surface-deep}` (#06070a) for the deep CTA banner
- Six pastel section bands deepen to saturated near-black tints (`{colors.surface-blush}`, `{colors.surface-butter}`, `{colors.surface-sage}`, `{colors.surface-sky}`, `{colors.surface-peach}`, `{colors.surface-mauve}`) — same families, deeper saturation
- Pill-tag polarity flips: deep-saturated bg + lighter-matching ink (preserves the six-color tag wheel)
- Royal blue `{colors.primary}` brightens one step (#1863dc → #2e77e5) for dark-canvas legibility; `{rounded.pill-lg}` 50-px pill radius unchanged
- Text uses white plus four opacity tiers (100 / 72 / 55 / 40 / 28 %)
- Hairlines flip to translucent white (`{colors.hairline}` 10 % / `{colors.hairline-soft}` 6 %)
- Featured pricing tier inverts the inversion: instead of light-mode's dark-ink fill, dark-mode's featured tier uses white `{colors.ink}` fill with dark text — the polarity flip carries the same emphasis pattern across themes

## Colors

> Source: dark-adapted from the light DESIGN.md. Token names match between the two files; values change by lightness role. The six pastel surface bands maintain their hue families across themes while flipping their lightness.

### Brand & Accent

- **Royal Blue** (`{colors.primary}` — #2e77e5): One step lighter than light-mode's #1863dc — preserves CTA legibility on the deep canvas.
- **Royal Blue Soft** (`{colors.primary-soft}` — #5a98ee): Lighter blue for inline links on light-tinted surfaces and pressed-state lift.

### Surface (the brightness-step ladder)

- **Canvas** (`{colors.canvas}` — #0c0d10): Default dark page canvas. A deepened, slightly cool near-black derived from Slite's #2d2f34 ink stepped further toward black.
- **Canvas Soft** (`{colors.canvas-soft}` — #15171c): One step lighter than canvas. Used for full-bleed body bands and cream-soft equivalents.
- **Canvas Cream** (`{colors.canvas-cream}` — #1d1f25): The dark equivalent of light's beige cream — used on subtle band differentiation.
- **Surface** (`{colors.surface}` — #1d1f25): Default card surface — pricing tiers, document mockups, modal bodies, form inputs (above a dark inset).
- **Surface Elevated** (`{colors.surface-elevated}` — #262931): Two steps above canvas. Reserved for floating cards, secondary buttons, popovers.
- **Surface Deep** (`{colors.surface-deep}` — #06070a): Deeper than canvas. Reserved for the dense bottom-of-page CTA banner and inset form-field backgrounds.

### Pastel Section Bands (deep-saturated dark-mode tints)

- **Surface Blush** (`{colors.surface-blush}` — #3a1a25): Deep-rose band — dark-mode equivalent of light's #fce0e0.
- **Surface Butter** (`{colors.surface-butter}` — #3a3215): Deep-mustard band.
- **Surface Sage** (`{colors.surface-sage}` — #1d3326): Deep-forest band.
- **Surface Sky** (`{colors.surface-sky}` — #1a2839): Deep-navy band.
- **Surface Peach** (`{colors.surface-peach}` — #3a251a): Deep-warm-brown band.
- **Surface Mauve** (`{colors.surface-mauve}` — #321f2c): Deep-plum band.

### Hairlines (translucent white)

- **Hairline** (`{colors.hairline}` — rgba(255,255,255,0.10)): Default 1-pixel translucent stroke.
- **Hairline Soft** (`{colors.hairline-soft}` — rgba(255,255,255,0.06)): Quieter variant for tertiary divisions.

### Text (opacity tiers)

- **Ink** (`{colors.ink}` — #ffffff): Headlines and primary body — equivalent of light's #2d2f34.
- **Ink Secondary** (`{colors.ink-secondary}` — rgba(255,255,255,0.72)): Body copy under headlines, helper text — dark equivalent of light's #3f434a.
- **Ink Tertiary** (`{colors.ink-tertiary}` — rgba(255,255,255,0.55)): Footer category headers, meta — equivalent of light's #5e646e.
- **Ash** (`{colors.ash}` — rgba(255,255,255,0.40)): Tertiary labels, monochrome wordmarks — equivalent of light's #969ca6.
- **Mute** (`{colors.mute}` — rgba(255,255,255,0.28)): Form placeholder, lowest-priority captions — equivalent of light's #acb1b9.

### Semantic — Pill Tag Polarity Flip

Each tag family preserves its hue identity. The polarity flips: bg becomes the deep-saturated band hue, ink becomes the lifted lighter shade.

- **Tag Yellow** (`{colors.tag-yellow-bg}` / `{colors.tag-yellow-ink}` — #3a3215 / #f7e6a1): Deep-mustard pill, butter text.
- **Tag Green** (`{colors.tag-green-bg}` / `{colors.tag-green-ink}` — #1d3326 / #a8d0ad): Deep-forest pill, sage-light text.
- **Tag Blue** (`{colors.tag-blue-bg}` / `{colors.tag-blue-ink}` — #1a2839 / #9bb6dc): Deep-navy pill, sky text.
- **Tag Mauve** (`{colors.tag-mauve-bg}` / `{colors.tag-mauve-ink}` — #321f2c / #e6b9d3): Deep-plum pill, mauve-light text.
- **Tag Turquoise** (`{colors.tag-turquoise-bg}` / `{colors.tag-turquoise-ink}` — #13282e / #9ec4ce): Deep-teal pill, cyan-light text.
- **Tag Red** (`{colors.tag-red-bg}` / `{colors.tag-red-ink}` — #3a1a1a / #e6a3a3): Deep-burgundy pill, rose-light text.
- **Success** (`{colors.success}` — #a8d0ad): Same hex as `{colors.tag-green-ink}`.
- **Error** (`{colors.error}` — #e6a3a3): Same hex as `{colors.tag-red-ink}`.

### Brand Gradient

- **Super Gradient** (`{colors.super-gradient-start}` → `{colors.super-gradient-end}` — #3d1f31 → #7a3982 → #3d2459): The dark-adapted Super gradient. Same pink-to-purple family, deeper saturation. Reserved for the Slite + Super suite promo card.

## Typography

### Font Family

Identical to light. **Garnett** display + body, **UniversalSans** UI. OpenType `ss14, ss15, ss19` engaged everywhere. Substitute with **Inter** at the same weights, engaging Inter's `ss01` / `ss02`.

### Hierarchy

| Token | Family | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| `{typography.display-xl}` | Garnett | 64px | 500 | 1.20 | 0 | Hero headlines |
| `{typography.display-lg}` | Garnett | 36px | 500 | 1.20 | 0 | Section openers |
| `{typography.display-md}` | Garnett | 32px | 500 | 1.50 | 0 | Sub-section headlines |
| `{typography.heading-lg}` | Garnett | 24px | 400 | 1.60 | 0 | FAQ row titles |
| `{typography.heading-md}` | Garnett | 19.2px | 500 | 1.50 | 0 | Card titles |
| `{typography.body-lg}` | Garnett | 19.2px | 400 | 1.50 | 0 | Hero subtitles |
| `{typography.body-md}` | Garnett | 16px | 400 | 1.50 | 0 | Default body |
| `{typography.body-md-bold}` | Garnett | 16px | 500 | 1.50 | 0 | Nav links, label emphasis |
| `{typography.link-md}` | Garnett | 16px | 500 | 1.50 | 0 | Inline links |
| `{typography.body-sm}` | Garnett | 13.6px | 400 | 1.50 | 0 | Footer copy |
| `{typography.body-sm-bold}` | Garnett | 13.6px | 500 | 1.50 | 0 | Helper bold |
| `{typography.caption-eyebrow}` | UniversalSans | 11px | 700 | 1.40 | 0 | Editor formatting tiles, eyebrow |
| `{typography.caption-tag}` | UniversalSans | 12px | 600 | 1.40 | 0 | Pill tag labels |
| `{typography.button-md}` | UniversalSans | 13.6px | 600 | 1.50 | 0 | Default button label |
| `{typography.button-lg}` | UniversalSans | 14px | 500 | 1.60 | 0 | Larger CTA labels |
| `{typography.ui-md}` | UniversalSans | 16px | 400 | 1.50 | 0 | Form input text |

### Principles

- **OpenType stylistic sets stay on.** `ss14, ss15, ss19` — identical to light.
- **Color carries the role, weight stays calm.** Headlines use full-white `{colors.ink}`; body steps to `{colors.ink-secondary}` (72 %); meta to `{colors.ink-tertiary}` (55 %).
- **One uppercase moment.** `{typography.caption-eyebrow}` only.
- **Don't upweight body.** White-on-dark already feels brighter than ink-on-cream — weight 400 is correct, weight 500 over-asserts.

## Layout

### Spacing System

Identical to the light system.

- **Base unit**: 8 px.
- **Tokens**: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 20 · `{spacing.xl}` 24 · `{spacing.xxl}` 32 · `{spacing.3xl}` 40 · `{spacing.section}` 56 · `{spacing.section-lg}` 80.

### Grid & Container

Unchanged. Max content ~1200 px, asymmetric 5/7 splits on text + mockup rows, full-bleed pastel bands at every breakpoint.

### Whitespace Philosophy

The dark canvas absorbs the same generous spacing rhythm. Deep pastel bands (`{colors.surface-blush}`, `{colors.surface-butter}`, etc.) provide the same chunking that the light pastels do — the canvas → tinted-band → canvas rotation still drives page rhythm.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow; sits on `{colors.canvas}` | Section bands, eyebrow captions, body bands, pastel feature cards |
| 1 — Soft drop | `0 1px 3px rgba(0,0,0,0.45)`, `0 2px 12px rgba(0,0,0,0.40)`, `0 4px 16px rgba(0,0,0,0.30)` | Default card on canvas |
| 2 — Tighter drop | `0 1px 3px rgba(0,0,0,0.50)`, `0 2px 6px rgba(0,0,0,0.40)` | Floating tooltips, dropdowns |

Shadows climb to 30–50 % black opacity on dark — anything lower disappears. The translucent-white inset on cards (Level 1) provides the same edge-without-stroke effect as light's translucent-black.

### Decorative Depth

- **Deep-saturated pastel bands** carry the chunking. Same rhythm as light, deeper tints.
- **Document chrome** preserves window-chrome treatment. Traffic-light dots stay colorful.
- **Super gradient** preserved at deep-saturation tints for the suite card.
- **No glass, no neumorphism.** Flat-with-soft-shadow.

## Shapes

### Border Radius Scale

Identical to light.

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 6px | Modals, dialogs |
| `{rounded.sm}` | 8px | Status badges, form inputs |
| `{rounded.md}` | 10px | Mid-size cards |
| `{rounded.lg}` | 12px | Editor formatting tiles, sidebar tabs |
| `{rounded.xl}` | 16px | **Default card radius** |
| `{rounded.pill}` | 42px | Tighter alt pills |
| `{rounded.pill-lg}` | 50px | **Button & badge radius** |
| `{rounded.full}` | 9999px | Avatar circles |

### Photography Geometry

Unchanged. Avatars in `{rounded.full}` 40–48 px circles; editor tiles 80 × 80 at `{rounded.lg}` on `{colors.surface-elevated}`; document mockups at `{rounded.xl}`.

## Components

> No hover states. Variants live as separate front-matter entries.

### Buttons

**`button-primary`** — primary CTA
- Background `{colors.primary}` (#2e77e5), text `{colors.ink}` (white), type `{typography.button-md}`, padding 12 × 24 px, rounded `{rounded.pill-lg}`.

**`button-ink`** — persistent dark-pill CTA — POLARITY FLIPPED for dark mode
- Background `{colors.ink}` (white), text `{colors.canvas}` (near-black), type `{typography.button-md}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.
- The polarity flip: in light mode `button-ink` is a near-black pill on cream; in dark mode it becomes a white pill on near-black canvas. The shape and role identity are preserved.

**`button-secondary`** — surface-elevated pill
- Background `{colors.surface-elevated}` (#262931), text `{colors.ink}`, type `{typography.button-md}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.

**`button-tertiary`** — quietest surface pill
- Background `{colors.surface}` (#1d1f25), text `{colors.ink-secondary}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.

**`button-outline`** — wide-padding pill
- Background `{colors.surface}`, text `{colors.ink}`, padding 12 × 56 px, rounded `{rounded.pill-lg}`.

**`button-ghost`** — minimal text-button
- Background transparent over `{colors.canvas}`, text `{colors.ink}`, padding 8 × 16 px, rounded `{rounded.pill-lg}`.

### Pill Tags

Six-color wheel preserved. Bg becomes the deep-saturated band hue, ink becomes the lifted lighter shade.

**`pill-tag-yellow`** — Deep-mustard bg + butter ink. **`pill-tag-green`** — Deep-forest bg + sage-light ink. **`pill-tag-blue`** — Deep-navy bg + sky ink. **`pill-tag-mauve`** — Deep-plum bg + mauve-light ink. **`pill-tag-turquoise`** — Deep-teal bg + cyan-light ink. **`pill-tag-red`** — Deep-burgundy bg + rose-light ink.

### Inputs & Forms

**`text-input`** — standard form field
- Background `{colors.surface-deep}`, text `{colors.ink}`, placeholder `{colors.mute}`, type `{typography.ui-md}`, rounded `{rounded.sm}`, padding 12 × 16 px, 1-px `{colors.hairline}` border.

**`text-input-focused`** — focus state
- Border switches to `{colors.primary}` (#2e77e5) at 2-px outline.

### Navigation

**`nav-bar`** (Desktop)
- Dark `{colors.canvas}` bar, ~64 px tall, 1-px `{colors.hairline}` bottom border. Slot order unchanged from light.

**`nav-link`**, **`sidebar-tab`** + **`sidebar-tab-inactive`** — same shapes, dark-canvas tokens.

### Cards & Containers

**`feature-card-pastel`** — tinted dark-band feature card
- Background = whichever deep-pastel band the card sits in (`{colors.surface-blush}`, etc.), text `{colors.ink}`, rounded `{rounded.xl}`, padding 24 px.

**`feature-card-cream`** — quiet card
- Background `{colors.canvas-soft}`, padding 24 px, rounded `{rounded.xl}`.

**`feature-card-white`** — surface card on canvas
- Background `{colors.surface}` (#1d1f25), text `{colors.ink}`, rounded `{rounded.xl}`, padding 24 px, Level 1 elevation.

**`pricing-card`** — pricing tier
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 32 px, Level 1.

**`pricing-card-featured`** — featured tier — POLARITY DOUBLE FLIP
- Background `{colors.ink}` (white) — fully inverted slab on the dark canvas, text `{colors.canvas}` (near-black), rounded `{rounded.xl}`, padding 32 px.
- The polarity inverts twice between themes: light's featured tier is dark-on-cream; dark's featured tier is white-on-near-black. The chromatic emphasis pattern is preserved.

**`customer-story-row`**, **`testimonial-card`**, **`document-window-chrome`** — same shapes as light, dark-surface tokens.

**`document-window-chrome`** preserves macOS traffic-light dots (yellow/green/red stay colorful — they belong to the chrome, not the theme).

### Signature Composites

**`editor-formatting-tile`** — formatting-palette tile — POLARITY FLIPPED
- Background `{colors.surface-elevated}` (#262931), text `{colors.ink}` (white), rounded `{rounded.lg}`, padding 16 px.
- Light mode tiles are dark-on-cream; dark mode tiles flip to surface-elevated (slightly lighter than canvas) to maintain visual separation. Tile typography stays identical: 11-px uppercase `{typography.caption-eyebrow}`.

**`super-suite-card`** — Slite + Super lockup
- Background `{colors.super-gradient-start}` → `{colors.super-gradient-end}` deep-saturated gradient. Same pink-to-purple family, deeper.

**`faq-row`** — accordion
- Background `{colors.canvas-soft}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 16 × 24 px.

**`cta-banner-dark`** — bottom-of-page CTA
- Background `{colors.surface-deep}` (#06070a — even deeper than canvas), text `{colors.ink}`, rounded `{rounded.xl}`, padding 48 px. The deepest moment in the system.

**`logo-strip-row`** — monochrome customer-logo band
- Background `{colors.canvas}`, wordmarks rendered in `{colors.ash}` (40 % white), padding 32 × 0 px.

**`footer`** — multi-column footer
- Background `{colors.canvas}`, text `{colors.ink-tertiary}`, type `{typography.body-sm}`, padding 64 × 32 px, 1-px `{colors.hairline}` top border.

## Do's and Don'ts

### Do

- Use the three-step surface ladder (`{colors.canvas}` → `{colors.canvas-soft}` → `{colors.surface}`) to recreate the calm separation that light Slite gets from cream-and-white.
- Preserve the deep-blue accent at `{colors.primary}` (#2e77e5) — one step lighter than light's #1863dc, but unchanged in role.
- Step text through opacity tiers (100 / 72 / 55 / 40 / 28 %) instead of inventing new text colors.
- Use translucent-white hairlines (`{colors.hairline}`) instead of solid grey.
- Scale shadow opacity to 30–50 % on dark canvases.
- Flip pill-tag polarity systematically: deep-saturated bg + lifted-lighter ink. Each tag family stays in its hue.
- Flip `button-ink` polarity: white pill on near-black canvas (the dark counterpart of light's near-black pill on cream).
- Flip `pricing-card-featured` polarity: white slab on dark canvas (the chromatic emphasis pattern preserved).

### Don't

- Don't darken the royal-blue accent. Dark Slite still has exactly one chromatic moment.
- Don't use solid black (#000000) as the canvas. Dark Slite's DNA is the cool near-black `{colors.canvas}` (#0c0d10), not pure black.
- Don't introduce new accent colors to compensate for the dark canvas. The system stays one-blue.
- Don't apply a 4 %-opacity shadow to dark cards — it disappears. Use 30–50 %.
- Don't switch button corners. Buttons stay `{rounded.pill-lg}` (50 px); cards stay `{rounded.xl}` (16 px).
- Don't underweight body. White-on-dark feels brighter than ink-on-cream; weight 400 is correct.
- Don't break the pastel hue families. A "blue tag" with mauve ink violates the wheel.

## Responsive Behavior

### Breakpoints

Identical to the light system.

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1088 px | Full 1200-px max |
| Desktop | 845–1087 px | Slight padding tightening |
| Tablet | 768–844 px | Nav collapses to hamburger |
| Mobile Wide | 660–767 px | Pricing tiers stack 2 + 1 |
| Mobile | 480–659 px | Single-column stack |
| Mobile Narrow | 425–479 px | Hero scales to display-md |
| Small Mobile | < 425 px | Section padding ~32 px |

### Touch Targets

- Buttons hold ~44–48 px tap height — meets WCAG AAA 44 × 44.
- On dark canvases the white `button-ink` pill needs particular care — the inset translucent-white frame disappears at touch sizes; rely on padding for the tap area.

### Collapsing Strategy

Identical to light. Nav hamburger at < 845 px; brand wordmark + `button-ink` stay; pricing 3 → 2 → 1; feature 4 → 3 → 2 → 1; pastel bands always full-bleed.

### Image Behavior

- Document-window mockups render with their natural colors over the dark canvas — do NOT add a multiply or invert filter. Window chrome stays colorful.
- Editor formatting tiles preserve their `{rounded.lg}` corners and 11-px caption.
- Hero illustrations may need a subtle 1-px `{colors.hairline}` outline on dark to separate from canvas.

## Iteration Guide

1. Focus on ONE component at a time. The five highest-leverage components — `button-primary`, `button-ink`, `pill-tag-*` family, `feature-card-pastel`, `pricing-card-featured` — drive the rest.
2. Reference tokens directly via `{token.ref}` syntax — never hard-code hex.
3. Run `npx @google/design.md lint DESIGN-DARK.md` after edits.
4. Add new variants as separate component entries.
5. Default body text to `{colors.ink-secondary}` (72 % white). Reserve full `{colors.ink}` for headlines.
6. Keep `{colors.primary}` scarce — same rule as light. One blue per viewport.
7. The pill-tag polarity flip is systematic — every tag family flips deep-bg + light-ink. Don't break the wheel.
8. The `button-ink` and `pricing-card-featured` polarity flips are deliberate role-preserving moves — they are the dark equivalent of the chromatic emphasis pattern light uses.
