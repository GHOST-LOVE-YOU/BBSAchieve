---
version: alpha
name: Slite Inspired
description: An inspired interpretation of Slite's design language — a warm-cream knowledge-base system that pairs pastel section bands (peach, blush, sage, butter) with a dark-navy ink and a single deep-blue CTA, all anchored on a generous 50-pixel pill-button radius and Garnett's stylistic-set display type.

colors:
  primary: "#1863dc"
  primary-soft: "#2e77e5"
  on-primary: "#fdfdfd"
  ink: "#2d2f34"
  ink-strong: "#000000"
  canvas: "#f6e9d8"
  canvas-soft: "#f9efe4"
  canvas-cream: "#f0e4d6"
  surface: "#fdfdfd"
  surface-blush: "#fce0e0"
  surface-butter: "#f7e6a1"
  surface-sage: "#c3dfc7"
  surface-sky: "#dbe7f2"
  surface-peach: "#f9d9c4"
  surface-mauve: "#efd4e3"
  ink-secondary: "#3f434a"
  ink-tertiary: "#5e646e"
  ash: "#969ca6"
  mute: "#acb1b9"
  hairline: "#d8dadf"
  hairline-soft: "#e4e2dc"
  tag-yellow-bg: "#f7e6a1"
  tag-yellow-ink: "#7f6c1f"
  tag-green-bg: "#c3dfc7"
  tag-green-ink: "#547358"
  tag-blue-bg: "#dbe7f2"
  tag-blue-ink: "#446aa7"
  tag-mauve-bg: "#efd4e3"
  tag-mauve-ink: "#b1729b"
  tag-turquoise-bg: "#cfe2e7"
  tag-turquoise-ink: "#437184"
  tag-red-bg: "#f4d6d6"
  tag-red-ink: "#bf6969"
  super-gradient-start: "#f9d6e8"
  super-gradient-mid: "#ce6bd6"
  super-gradient-end: "#7c4d9e"
  error: "#bf6969"
  success: "#547358"

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
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 12px 24px
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 24px
  button-secondary:
    backgroundColor: "{colors.canvas-cream}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill-lg}"
    padding: 8px 24px
  button-tertiary:
    backgroundColor: "{colors.canvas-soft}"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
  text-input-focused:
    backgroundColor: "{colors.surface}"
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
    textColor: "{colors.on-primary}"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-eyebrow}"
    rounded: "{rounded.lg}"
    padding: 16px
  faq-row:
    backgroundColor: "{colors.canvas}"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.xl}"
    padding: 48px
  sidebar-tab:
    backgroundColor: "{colors.canvas-cream}"
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

## Overview

Slite is built on a warm cream-peach canvas — `{colors.canvas}` (#f6e9d8) — that immediately separates the brand from the cold-white default of most B2B SaaS. The cream is not decorative; it is the system's foundational decision. White cards `{colors.surface}` (#fdfdfd) sit above the cream and read as paper-on-paper, not as the inverse contrast you'd get on a stark white site. The dark-navy ink `{colors.ink}` (#2d2f34) carries every headline, every body line, and every primary nav label with a calm, near-black weight.

The system rotates a **pastel section ladder** through the page: peach → blush pink → cream → dark-navy → cream → peach. Each band introduces a tinted surface (`{colors.surface-blush}`, `{colors.surface-butter}`, `{colors.surface-sage}`, `{colors.surface-mauve}`) plus a small wheel of matching pill tags (`{components.pill-tag-yellow}`, `{components.pill-tag-green}`, `{components.pill-tag-blue}`, `{components.pill-tag-mauve}`, `{components.pill-tag-turquoise}`, `{components.pill-tag-red}`) where the tag's text color is a darkened version of the same hue family — yellow text on butter, green text on sage, mauve text on blush. The pastel-and-darker-text rhythm is the brand's most identifiable component-level signature.

Buttons are **always pills**. The primary CTA is a deep-blue pill (`{colors.primary}` #1863dc), the persistent top-nav "Start for free" is a dark-ink pill (`{components.button-ink}`), and secondary actions get cream-on-cream pills (`{components.button-secondary}`, `{components.button-tertiary}`). All four button variants share the same 50-pixel `{rounded.pill-lg}` radius — the radius IS the button identity. Cards take a softer 16-pixel `{rounded.xl}`, modals a tighter 6-pixel `{rounded.xs}`, and circular avatars / illustration moments use `{rounded.full}`.

Typography is led by **Garnett** — a humanist-geometric display sans with three OpenType stylistic sets active across the site (`ss14`, `ss15`, `ss19`). Display headlines run up to 64 pixels at weight 500 with a tight 1.20 line-height; body and link text drop to weight 400/500 at 16–19.2 pixels with a generous 1.5–1.6 line-height. UI surfaces (buttons, badges, eyebrow captions) switch to **UniversalSans** — a tighter system-feeling sans that runs at 11–14 pixels with the same OpenType set engaged.

**Key Characteristics:**
- Warm cream canvas `{colors.canvas}` (#f6e9d8) as the page foundation — the brand's most distinctive choice; never pure white
- Six-color pastel section-band rotation (`{colors.surface-blush}`, `{colors.surface-butter}`, `{colors.surface-sage}`, `{colors.surface-mauve}`, `{colors.surface-peach}`, `{colors.surface-sky}`) cycling through long-scroll pages
- Pill button radius (`{rounded.pill-lg}` 50 px) is the button signature — every variant uses it
- Single deep-blue primary CTA (`{colors.primary}` #1863dc) reserved for "Get Slite for free" / "Get access" / "Book a demo"; dark-ink pill (`{components.button-ink}`) carries the persistent nav CTA
- Garnett display + UniversalSans UI font pairing with `ss14, ss15, ss19` OpenType features active everywhere
- Pill tags with tinted-pastel-bg + darker-matching-text (yellow/green/blue/mauve/turquoise/red families) — the most recognizable atomic component
- Featured pricing tier inverts to dark-navy fill `{colors.ink}` with white text and a deep-blue CTA — emphasis is chromatic, the rare moment Slite breaks the cream rhythm
- Playful illustration-led section openers (people, books, magnifying glasses, scissors) — the pastel section bands are usually introduced by an illustrative still rather than a stock photo

## Colors

> Source pages: home, features, editor, suite, pricing, resources. The same palette holds across all six surfaces — the section-band rhythm reuses the pastel surfaces in different orders, but no page introduces a token absent from the home extraction.

### Brand & Accent

- **Royal Blue** (`{colors.primary}` — #1863dc): The single brand chromatic moment. Reserved for primary CTAs ("Get Slite for free", "Get access", "Book a demo"), focused-input borders, and inline links on dark surfaces.
- **Royal Blue Soft** (`{colors.primary-soft}` — #2e77e5): Slightly lighter blue used for secondary blue accents, dot indicators, and inline links on light surfaces.

### Surface

- **Cream Canvas** (`{colors.canvas}` — #f6e9d8): The default page background. Warm, paper-like, slightly peach.
- **Cream Soft** (`{colors.canvas-soft}` — #f9efe4): A lighter cream used for subtle band differentiation and quiet card surfaces.
- **Cream Beige** (`{colors.canvas-cream}` — #f0e4d6): The deeper-cream variant used on the secondary button (`{components.button-secondary}`) and on full-bleed bands that need to read as "warmer than canvas."
- **White** (`{colors.surface}` — #fdfdfd): Card surfaces, document mockups, modal bodies, form inputs. Always rests above cream.
- **Surface Blush** (`{colors.surface-blush}` — #fce0e0): Pink section band (the document mockup band on the home hero).
- **Surface Butter** (`{colors.surface-butter}` — #f7e6a1): Yellow tinted band; same hex as `{colors.tag-yellow-bg}`.
- **Surface Sage** (`{colors.surface-sage}` — #c3dfc7): Green tinted band; same hex as `{colors.tag-green-bg}`.
- **Surface Sky** (`{colors.surface-sky}` — #dbe7f2): Blue tinted band.
- **Surface Peach** (`{colors.surface-peach}` — #f9d9c4): Warm peach band, deeper than canvas.
- **Surface Mauve** (`{colors.surface-mauve}` — #efd4e3): Pink-mauve band used on suite-promo gradients.
- **Hairline** (`{colors.hairline}` — #d8dadf): 1-pixel dividers around cards and modals.
- **Hairline Soft** (`{colors.hairline-soft}` — #e4e2dc): Quieter cream-tinted divider used inside cards.

### Text

- **Ink** (`{colors.ink}` — #2d2f34): Headlines, primary body text, dark-pill button background (`{components.button-ink}`).
- **Ink Strong** (`{colors.ink-strong}` — #000000): Reserved for the brand wordmark and the highest-contrast moments only.
- **Ink Secondary** (`{colors.ink-secondary}` — #3f434a): Body copy under headlines, helper text.
- **Ink Tertiary** (`{colors.ink-tertiary}` — #5e646e): Footer category headers, meta data.
- **Ash** (`{colors.ash}` — #969ca6): Tertiary labels, monochrome wordmarks in the logo strip.
- **Mute** (`{colors.mute}` — #acb1b9): Form placeholder text, lowest-priority captions.

### Semantic

- **Tag Yellow** (`{colors.tag-yellow-bg}` / `{colors.tag-yellow-ink}` — #f7e6a1 / #7f6c1f): Butter-tinted pill, dark-mustard text.
- **Tag Green** (`{colors.tag-green-bg}` / `{colors.tag-green-ink}` — #c3dfc7 / #547358): Sage-tinted pill, deep-forest text.
- **Tag Blue** (`{colors.tag-blue-bg}` / `{colors.tag-blue-ink}` — #dbe7f2 / #446aa7): Sky pill, navy text.
- **Tag Mauve** (`{colors.tag-mauve-bg}` / `{colors.tag-mauve-ink}` — #efd4e3 / #b1729b): Pink-mauve pill, plum text.
- **Tag Turquoise** (`{colors.tag-turquoise-bg}` / `{colors.tag-turquoise-ink}` — #cfe2e7 / #437184): Pale-cyan pill, deep-teal text.
- **Tag Red** (`{colors.tag-red-bg}` / `{colors.tag-red-ink}` — #f4d6d6 / #bf6969): Soft-rose pill, brick-red text. Doubles as `{colors.error}`.
- **Success** (`{colors.success}` — #547358): Same hex as `{colors.tag-green-ink}`.
- **Error** (`{colors.error}` — #bf6969): Same hex as `{colors.tag-red-ink}`.

### Brand Gradient

- **Super Gradient** (`{colors.super-gradient-start}` → `{colors.super-gradient-mid}` → `{colors.super-gradient-end}` — #f9d6e8 → #ce6bd6 → #7c4d9e): A pink-to-mauve-to-deep-violet gradient used on the "Slite + Super" suite promo card and on the suite-page brand lockup. The only multi-stop gradient in the system; everywhere else surfaces are flat.

## Typography

### Font Family

Primary display + body: **Garnett** (Velvetyne / Velvet foundry) — a humanist geometric sans with subtle pen-stroke contrast. Three stylistic sets are active across every text role: **`ss14`** (alternate single-storey `a`), **`ss15`** (alternate `g`), **`ss19`** (alternate ampersand). Together they tilt Garnett toward a warmer, more humanist feel than its default neutral cut.

Secondary UI font: **UniversalSans** (Universal Sans by Universal Thirst) — a tighter system-style sans used for buttons, eyebrow captions, and badges. Same OpenType set is engaged so the two faces share family-level character.

For inspired implementations, substitute **Inter** for both faces at the same weights. To approximate Garnett's character, engage Inter's `ss01` (single-storey `a`) and `ss02` (alternate `g`) features; they map closely to Garnett's `ss14` / `ss15`.

### Hierarchy

| Token | Family | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| `{typography.display-xl}` | Garnett | 64px | 500 | 1.20 | 0 | Hero headlines on home / pricing |
| `{typography.display-lg}` | Garnett | 36px | 500 | 1.20 | 0 | Section openers |
| `{typography.display-md}` | Garnett | 32px | 500 | 1.50 | 0 | Sub-section headlines |
| `{typography.heading-lg}` | Garnett | 24px | 400 | 1.60 | 0 | FAQ row titles, customer-story names |
| `{typography.heading-md}` | Garnett | 19.2px | 500 | 1.50 | 0 | Card titles, pricing-tier names |
| `{typography.body-lg}` | Garnett | 19.2px | 400 | 1.50 | 0 | Hero subtitles |
| `{typography.body-md}` | Garnett | 16px | 400 | 1.50 | 0 | Default body, card copy |
| `{typography.body-md-bold}` | Garnett | 16px | 500 | 1.50 | 0 | Nav links, label emphasis |
| `{typography.link-md}` | Garnett | 16px | 500 | 1.50 | 0 | Inline call-to-action links |
| `{typography.body-sm}` | Garnett | 13.6px | 400 | 1.50 | 0 | Footer copy, helper text |
| `{typography.body-sm-bold}` | Garnett | 13.6px | 500 | 1.50 | 0 | Bolded helper, badge labels |
| `{typography.caption-eyebrow}` | UniversalSans | 11px | 700 | 1.40 | 0 | Editor formatting tiles ("HEADING", "BOLD"), all-caps eyebrow |
| `{typography.caption-tag}` | UniversalSans | 12px | 600 | 1.40 | 0 | Pill tag labels |
| `{typography.button-md}` | UniversalSans | 13.6px | 600 | 1.50 | 0 | Default button label |
| `{typography.button-lg}` | UniversalSans | 14px | 500 | 1.60 | 0 | Larger CTA labels (hero pills) |
| `{typography.ui-md}` | UniversalSans | 16px | 400 | 1.50 | 0 | Form input text, inline UI |

### Principles

- **OpenType stylistic sets are always on.** Every Garnett text role engages `ss14, ss15, ss19`. The single-storey `a` and alternate `g` are part of the brand voice — disabling them flattens the system to a generic geometric sans.
- **Two-family pairing.** Garnett carries display + body; UniversalSans carries buttons + tags + UI. They never swap roles.
- **Weight is calm.** Display tops out at weight 500; body sits at 400. There is no 700 in body copy — only in the all-caps eyebrow caption.
- **Generous line-height.** 1.5 is the default body line-height; long-form drops to 1.6. Display headlines tighten to 1.2 only at the hero size.
- **One uppercase moment.** The 11-pixel eyebrow caption is the only uppercase role.

### Note on Font Substitutes

Garnett and UniversalSans are both proprietary. Substitute **Inter** for both, at the same weights, and engage `ss01` / `ss02` to approximate the alternate `a` / `g`. The `ss19` ampersand has no clean Inter analogue — accept the loss; it appears rarely. UniversalSans's button kerning at 13.6 px is slightly tighter than Inter's default; reduce letter-spacing by `-0.01em` on `{typography.button-md}` and `{typography.button-lg}` if rendering in Inter.

## Layout

### Spacing System

- **Base unit**: 8 px (with 2-px and 4-px subdivisions for tight UI).
- **Tokens (front matter)**: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 20 · `{spacing.xl}` 24 · `{spacing.xxl}` 32 · `{spacing.3xl}` 40 · `{spacing.section}` 56 · `{spacing.section-lg}` 80.
- **Card internal padding**: 24 px on feature cards (`{components.feature-card-pastel}`), 32 px on pricing tiers (`{components.pricing-card}`), 16 px on customer-story rows (`{components.customer-story-row}`).
- **Section vertical padding**: 56–80 px between major bands; 40 px between sub-sections.
- **Tight UI (badges, pill-tags)**: 0 × 8 px padding — pills hug their text content closely.

### Grid & Container

- **Max content width**: ~1200 px on marketing surfaces; ~1080 px on pricing comparison tables.
- **Column patterns**: 1-up centered hero, 2-up text+illustration mid-page splits, 3-up pricing tiers, 3-up customer-story rows, 4-up feature pastel-card grids.
- **Asymmetric splits**: The home and editor pages use frequent 5/7 splits — text on the left at half-width, mockup on the right at full bleed. This gives the cream canvas room to breathe and lets the pastel sections function as section dividers.

### Whitespace Philosophy

Slite treats whitespace as section air. Each pastel band gets 56–80 px of vertical breathing room above and below its content; cards never butt against the band edge. The section-band rotation (cream → blush → cream → sage → cream) does the visual chunking that boxes / borders would do on a denser system. As a result, hairlines and shadows are rare; the tinted backgrounds carry the structure.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow; sits on `{colors.canvas}` or `{colors.surface}` | Cream-on-cream sections, eyebrow captions, body bands, pastel feature cards |
| 1 — Soft drop | `0px 1px 4px rgba(0,0,0,0.08)`, `0 2px 12px rgba(0,0,0,0.06)`, `0 4px 16px rgba(0,0,0,0.04)`, `0 4px 16px rgba(0,0,0,0.01)` | Default white card on cream — pricing tiers, document mockup, modal |
| 2 — Tighter drop | `0 1px 3px rgba(0,0,0,0.10)`, `0 2px 6px rgba(0,0,0,0.05)`, `0 4px 12px rgba(0,0,0,0.01)` | Floating tooltips, dropdowns, secondary popovers |

Shadows are **multi-layer and very soft**. The signature drop is a four-stack of black at 1–8 % opacity — visible as presence, never as a frame. Pastel bands themselves do not get shadows; only white/cream cards lifted above a band do. The dark-pill button (`{components.button-ink}`) carries no shadow either — its near-black fill against cream provides enough contrast on its own.

### Decorative Depth

- **Pastel section bands** are the brand's primary depth strategy. By rotating tinted backgrounds, Slite creates layered depth without ever using a stronger shadow than 8 % black.
- **Document chrome** — the home hero's "Company Handbook" mockup uses a window-chrome surface (`{components.document-window-chrome}`) framed inside the blush band. The chrome is the only place macOS-style traffic-light dots appear.
- **Super gradient** (`{colors.super-gradient-start}` → `{colors.super-gradient-end}`) is the only non-flat surface treatment in the entire system — reserved for the Slite + Super suite promo and the suite-page brand lockup.
- **No glass, no neumorphism, no glow.** The system is resolutely flat-with-soft-shadow.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 6px | Modals, dialogs, small dropdowns |
| `{rounded.sm}` | 8px | Status badges, form inputs, small chips |
| `{rounded.md}` | 10px | Mid-size cards, secondary tiles |
| `{rounded.lg}` | 12px | Editor formatting tiles, sidebar tabs |
| `{rounded.xl}` | 16px | **The default card radius** — feature cards, pricing tiers, FAQ rows, document chrome |
| `{rounded.pill}` | 42px | Tighter hero pills (alt sizing) |
| `{rounded.pill-lg}` | 50px | **The button & badge radius** — every primary, secondary, ink button + every pill tag |
| `{rounded.full}` | 9999px | Avatar circles, illustration roundels |

### Photography Geometry

- **Customer-story avatars** sit inside circular pill lockups (`{rounded.full}`) sized 40–48 px, presented in a row at the start of each customer-story row card.
- **Editor formatting tiles** are square-ish 80 × 80 px panels at `{rounded.lg}` on a near-black `{colors.ink}` surface — they hold an icon glyph plus an uppercase 11-px caption ("HEADING", "BOLD", "ITALIC", etc.). Twelve tiles in a 3 × 4 grid.
- **Document mockup**: The hero's "Company Handbook" frame uses `{rounded.xl}` corners with the macOS traffic-light dots in the upper-left of the chrome band.
- **Aspect ratios**: 16:9 for product/editor screenshots; 4:3 for customer-story avatar+content tiles; 1:1 for square illustration moments; 3:4 portrait for the "Super + Slite" person-photo card.

## Components

> No hover states are documented. Every component below specifies Default and (where extracted) Pressed/Active. Variants live as separate front-matter entries.

### Buttons

**`button-primary`** — primary CTA ("Get Slite for free", "Get access", "Book a demo")
- Background `{colors.primary}` (#1863dc), text `{colors.on-primary}` (#fdfdfd), type `{typography.button-md}`, padding 12 × 24 px, rounded `{rounded.pill-lg}` (50 px).
- The single highest-prominence action on hero and pricing pages.

**`button-ink`** — persistent dark-pill CTA in the top nav ("Start for free")
- Background `{colors.ink}` (#2d2f34), text `{colors.on-primary}`, type `{typography.button-md}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.
- Shorter than `button-primary` (8-px vertical padding vs 12). Reads as the always-present nav CTA, while `button-primary` is the in-page action.

**`button-secondary`** — cream-pill outline on warm canvas ("Book a demo" hero variant)
- Background `{colors.canvas-cream}` (#f0e4d6), text `{colors.ink}`, type `{typography.button-md}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.

**`button-tertiary`** — quietest cream pill, used on dense pages
- Background `{colors.canvas-soft}` (#f9efe4) at 0.8 opacity, text `{colors.ink-secondary}`, type `{typography.button-md}`, padding 8 × 24 px, rounded `{rounded.pill-lg}`.

**`button-outline`** — wide-padding white pill used as a section-bottom CTA ("See all the apps")
- Background `{colors.surface}`, text `{colors.ink}`, 1-px transparent border, padding 12 × 56 px (much wider horizontal padding), rounded `{rounded.pill-lg}`.

**`button-ghost`** — minimal text-button used inside tight UI strips
- Background transparent over `{colors.surface}`, text `{colors.ink-strong}`, type `{typography.button-md}`, padding 8 × 16 px, rounded `{rounded.pill-lg}`.

### Pill Tags (signature component)

The pill-tag system is Slite's most identifiable atomic pattern. Six color families, each with a tinted-pastel background at 40 % opacity and a darker matching text at full saturation. All pills share the same shape (`{rounded.pill-lg}`, 0 × 8 px padding, 12 px / 600 weight UniversalSans). They appear on feature cards, document mockups, customer-story rows, and inside section eyebrows.

**`pill-tag-yellow`** — Butter background (`{colors.tag-yellow-bg}`) + mustard text (`{colors.tag-yellow-ink}`).
**`pill-tag-green`** — Sage background (`{colors.tag-green-bg}`) + forest text (`{colors.tag-green-ink}`).
**`pill-tag-blue`** — Sky background (`{colors.tag-blue-bg}`) + navy text (`{colors.tag-blue-ink}`).
**`pill-tag-mauve`** — Mauve background (`{colors.tag-mauve-bg}`) + plum text (`{colors.tag-mauve-ink}`).
**`pill-tag-turquoise`** — Cyan background (`{colors.tag-turquoise-bg}`) + teal text (`{colors.tag-turquoise-ink}`).
**`pill-tag-red`** — Rose background (`{colors.tag-red-bg}`) + brick text (`{colors.tag-red-ink}`).

### Inputs & Forms

**`text-input`** — standard form field
- Background `{colors.surface}`, text `{colors.ink}`, placeholder `{colors.mute}`, type `{typography.ui-md}`, rounded `{rounded.sm}` (8 px), padding 12 × 16 px, 1-px `{colors.hairline}` border.

**`text-input-focused`** — focus state
- Same shape; border switches to `{colors.primary}` (#1863dc), 2-px outline ring inside.

### Navigation

**`nav-bar`** (Desktop)
- Cream `{colors.canvas}` bar, ~64 px tall, padding 16 × 32 px.
- Slot order: brand wordmark left → utility links (Product / Solutions / Pricing / Resources) center-left → "Sign in" + "Book a demo" `button-ghost` + "Start for free" `button-ink` right.
- Type `{typography.body-md-bold}` for nav links.

**`nav-link`** — inline nav text link
- Background transparent over `{colors.canvas}`, text `{colors.ink}`, padding 8 × 12 px, type `{typography.body-md-bold}`.

**`sidebar-tab`** + **`sidebar-tab-inactive`** (resources/pricing pages)
- Active: cream-beige fill (`{colors.canvas-cream}`), ink text, weight 500, rounded `{rounded.lg}` (12 px), padding 8 × 16 px.
- Inactive: same shape, no fill, ink-tertiary text, weight 400.

### Cards & Containers

**`feature-card-pastel`** — tinted-band feature card (one per pastel family)
- Background = whichever surface band the card sits in (`{colors.surface-blush}`, `{colors.surface-butter}`, `{colors.surface-sage}`, etc.), text `{colors.ink}`, rounded `{rounded.xl}` (16 px), padding 24 px.
- Holds an illustration or icon at top, a short body line, and often a `{components.pill-tag-*}` label at the top-left.

**`feature-card-cream`** — quiet cream-on-cream card
- Background `{colors.canvas-soft}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 24 px. Used for dense feature grids where pastels would over-saturate.

**`feature-card-white`** — white card on cream
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 24 px, Elevation Level 1. The default card on hero and pricing surfaces.

**`pricing-card`** — pricing tier (Standard / Premium variants share the shell)
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 32 px, Level 1 elevation. Tier name in `{typography.heading-md}`, price in `{typography.display-xl}` (large), feature list in `{typography.body-md}`.

**`pricing-card-featured`** — featured "Knowledge Suite" / "Enterprise" tier (inversion)
- Background `{colors.ink}` (#2d2f34) — fully inverted dark slab, text `{colors.on-primary}`, rounded `{rounded.xl}`, padding 32 px. The CTA inside is a `{components.button-primary}` blue pill, which pops vividly against the dark fill.
- This inversion is the rare moment Slite breaks its cream rhythm — featured tier emphasis is chromatic, not typographic.

**`customer-story-row`** — single-row testimonial card with avatars + name + role + company
- Background `{colors.canvas-soft}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 16 × 24 px. Avatar pair on the left in `{rounded.full}` circles, headline in `{typography.body-md-bold}`, company name in `{typography.body-sm}` `{colors.ink-tertiary}`.

**`testimonial-card`** — full-quote testimonial (3-up grid on suite page)
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 24 px, Level 1 elevation. Holds a 3–4-line quote in `{typography.body-md}` plus an attribution line below.

**`document-window-chrome`** — the home hero's "Company Handbook" mockup
- Background `{colors.surface}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 16 px. The window includes a cream chrome strip at the top with three macOS traffic-light dots; the body holds page tabs, a sidebar nav, and a document with `{components.pill-tag-*}` labels marking sections.

### Signature Composites

**`editor-formatting-tile`** — single tile from the editor-page formatting palette
- Background `{colors.ink}` (#2d2f34) — dark slab, text `{colors.on-primary}`, rounded `{rounded.lg}` (12 px), padding 16 px. Each tile holds a glyph icon plus an 11-px uppercase caption ("HEADING", "BOLD", "ITALIC", "UNDERLINE", "BULLET LIST", "TABLES", "CODE SNIPPET", etc.).
- The 12-tile 3 × 4 grid is the editor page's hero element.

**`super-suite-card`** — the Slite + Super lockup card on the suite page
- Background `{colors.super-gradient-start}` → `{colors.super-gradient-end}` gradient, text `{colors.ink}`, rounded `{rounded.xl}`, padding 32 px. Holds a person photo at the center plus the dual brand wordmarks ("slite" + "super") on either side.
- The only multi-stop gradient surface in the system.

**`faq-row`** — accordion line item (pricing page)
- Background `{colors.canvas}`, text `{colors.ink}`, rounded `{rounded.xl}`, padding 16 × 24 px. Question in `{typography.heading-md}`; expanded body in `{typography.body-md}` underneath.

**`cta-banner-dark`** — full-bleed near-black CTA at the end of long-form pages
- Background `{colors.ink}`, text `{colors.on-primary}`, rounded `{rounded.xl}`, padding 48 px. Headline in `{typography.display-lg}` + a single `{components.button-primary}` blue pill.

**`logo-strip-row`** — monochrome customer-logo band ("Trusted by leading fast-moving teams")
- Background `{colors.canvas}`, wordmarks rendered in `{colors.ash}` at single-baseline alignment, padding 32 × 0 px. No card chrome.

**`footer`** — multi-column dense footer
- Background `{colors.canvas}`, text `{colors.ink-tertiary}`, type `{typography.body-sm}`, padding 64 × 32 px. 5-column layout with bold uppercase category headers (`{typography.caption-eyebrow}`) above link columns.

## Do's and Don'ts

### Do

- Use `{colors.canvas}` (#f6e9d8) as the page background. The warm cream is the brand's foundational decision; replacing it with white removes Slite's most distinctive signature.
- Cycle pastel section bands (`{colors.surface-blush}` → `{colors.canvas}` → `{colors.surface-butter}` → `{colors.canvas}` → `{colors.surface-sage}` → `{colors.ink}`) through long-scroll pages. The rotation IS the page rhythm.
- Pair tinted-pastel pill backgrounds with darker matching text — `{colors.tag-yellow-bg}` + `{colors.tag-yellow-ink}`, `{colors.tag-green-bg}` + `{colors.tag-green-ink}`, etc. Never use a pill background without its matching ink.
- Default every interactive button to `{rounded.pill-lg}` (50 px). The pill IS the button identity.
- Reserve `{colors.primary}` (#1863dc) for primary in-page CTAs; use `{components.button-ink}` for the persistent top-nav CTA.
- Engage Garnett's `ss14, ss15, ss19` OpenType features on every text role — alternate `a` and `g` are part of the brand voice.
- Invert featured pricing tiers to `{colors.ink}` fill with `{components.button-primary}` blue pill — the chromatic inversion is the deliberate emphasis pattern.
- Frame editor / formatting palettes as dark `{colors.ink}` tiles with white 11-px uppercase captions.

### Don't

- Don't replace `{colors.canvas}` with pure `#ffffff`. Cream is the brand's anchor.
- Don't introduce a second primary color outside `{colors.primary}`. The blue is the only chromatic CTA.
- Don't apply heavy shadows. The signature is a four-layer 1–8 % black drop — anything denser reads as a different brand.
- Don't break the radius pairing — buttons stay `{rounded.pill-lg}` (50 px), cards stay `{rounded.xl}` (16 px), modals stay `{rounded.xs}` (6 px). Never let cards take the pill radius.
- Don't introduce uppercase weight 700 outside `{typography.caption-eyebrow}`. The all-caps eyebrow is the only uppercase moment.
- Don't add a multi-stop gradient anywhere except the Super suite lockup. Gradients are reserved.
- Don't use a pill tag without its matching darker-text ink — a sage-bg pill with white text breaks the system.
- Don't apply outline buttons over pastel section bands. Outline buttons live on white surfaces only; pastel bands take filled pills.
- Don't disable Garnett's stylistic sets. The single-storey `a` is part of the voice.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1088 px | Full 1200-px max content; 4-up feature grids stay 4-up |
| Desktop | 845–1087 px | 4-up grids may compress to 3-up + 1; pricing comparison table stays full-width |
| Tablet | 768–844 px | Nav collapses to hamburger; 3-up grids drop to 2-up; pricing tiers stack into 2 + 1 |
| Mobile Wide | 660–767 px | Pricing tiers stack to single column; feature grids become 2-up |
| Mobile | 480–659 px | Single-column stack; pastel section bands stretch full-width; document mockup scales proportionally |
| Mobile Narrow | 425–479 px | Hero `{typography.display-xl}` scales to `{typography.display-md}` (~32 px); nav becomes a single brand-wordmark + hamburger row |
| Small Mobile | < 425 px | Section padding drops to ~32 px; card padding drops to 16 px |

### Touch Targets

- Buttons (`{components.button-primary}`, `{components.button-ink}`, `{components.button-secondary}`) maintain ~44–48 px tap height through padding (8–12 px vertical + 1.5 line-height + 13.6-px text). Meets WCAG AAA 44 × 44.
- Pill tags are smaller (~28 px tall) — they are read-only labels, not interactive, so reduced size is acceptable.
- Form inputs (`{components.text-input}`) sit at 44 px tall, comfortable for thumb input.
- Nav links collapse into a stacked drawer at < 845 px; each row is at least 48 px tall.

### Collapsing Strategy

- **Nav**: utility links collapse behind a hamburger at < 845 px; brand wordmark + `{components.button-ink}` ("Start for free") remain visible at every breakpoint.
- **Pricing grid (3-up)**: collapses 3 → 2 → 1 across desktop → tablet → mobile. Featured tier always sits in the center on desktop, moves to the top on mobile.
- **Feature pastel grid (4-up)**: collapses 4 → 3 → 2 → 1.
- **Customer-story row**: at mobile, the avatar pair stacks above the quote instead of beside.
- **Display type**: 64 → 48 → 36 → 32 px down the breakpoint ladder; line-height stays proportional (1.20 → 1.30).
- **Section bands**: pastel bands always go full-bleed at every breakpoint — they never get gutters. The cream canvas between bands is what shrinks.

### Image Behavior

- Document-window mockups inside `{components.document-window-chrome}` scale proportionally; their 16-px corners are preserved at every size.
- Customer-story avatar circles never crop below 32 px in diameter.
- Hero illustrations (people, books, magnifying glasses) sit on cream `{colors.canvas}` and scale via `max-width: 100%`.
- The "Super + Slite" person photo on the suite page maintains a 3:4 portrait ratio across breakpoints.

## Iteration Guide

1. Focus on ONE component at a time. The five highest-leverage components — `button-primary`, `button-ink`, `pill-tag-*` family, `feature-card-pastel`, `pricing-card-featured` — set the tone for everything else.
2. Reference component names and tokens directly (`{colors.primary}`, `{rounded.pill-lg}`, `{components.button-ink}`) — do not paraphrase or hard-code hex values.
3. Run `npx @google/design.md lint DESIGN.md` after edits.
4. Add new variants as separate component entries (`-pressed`, `-disabled`, `-focused`) — never bury them inside prose.
5. Default to `{typography.body-md}` for body, `{typography.heading-md}` for card titles, `{typography.caption-eyebrow}` for the all-caps eyebrow moment, and `{typography.button-md}` for button labels.
6. Keep `{colors.primary}` scarce. If two royal-blue elements appear in the same viewport, consider whether one should drop to `{components.button-ink}` or `{components.button-secondary}`.
7. The pastel section-band rotation is the page rhythm — when designing a new long-scroll page, lay out the band sequence first (e.g. cream → blush → cream → sage → ink → cream) BEFORE picking components.
8. Pill tags always pair their `*-bg` token with the matching `*-ink` token. Never mix families.
