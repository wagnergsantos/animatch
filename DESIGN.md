# Design

## Color

Strategy: Committed (dark surface, cyan primary carries identity, amber accent punctuates).

Mood: "Sessão noturna de anime — brilho ciano de tela contra paredes escuras, notificações âmbar quentes."

```css
:root {
  /* bg — pure near-black, no hue tint */
  --color-bg: oklch(0.08 0.000 0);

  /* surface — bg pulled slightly lighter, for cards/panels */
  --color-surface: oklch(0.14 0.005 240);

  /* primary — cyberpunk cyan, vibrant but not fluorescent */
  --color-primary: oklch(0.72 0.14 195);

  /* accent — warm amber from seed, complementary pair with cyan */
  --color-accent: oklch(0.72 0.14 75);

  /* ink — near-white, slight cool tint toward primary */
  --color-ink: oklch(0.93 0.005 240);

  /* muted — secondary text, ink pulled 40% toward bg */
  --color-muted: oklch(0.60 0.005 240);

  /* semantic states */
  --color-error: oklch(0.63 0.20 25);
  --color-success: oklch(0.72 0.17 155);
  --color-warning: oklch(0.80 0.15 85);
}
```

Text on primary/accent fills: white (`--color-ink`) — both are saturated mid-luminance (L ~0.72, C ≥ 0.08).

## Typography

Family: Inter (400, 500, 600, 700). Single family across headings, body, labels, data.

Scale (fixed rem, ratio 1.2):

| Token | Size | Weight | Use |
|---|---|---|---|
| `--text-xs` | 0.694rem | 400 | Fine print, badges |
| `--text-sm` | 0.833rem | 400 | Labels, metadata |
| `--text-base` | 1rem | 400 | Body text |
| `--text-md` | 1.2rem | 500 | Subheadings |
| `--text-lg` | 1.44rem | 600 | Section headings |
| `--text-xl` | 1.728rem | 600 | Page headings |
| `--text-2xl` | 2.074rem | 700 | Hero/display |

Line height: 1.5 for body, 1.2 for headings. Body line length capped at 65ch.

## Spacing

Base unit: 0.5rem (8px). Scale: 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4rem, 6rem.

## Radius

- `--radius-sm`: 0.375rem (buttons, inputs, badges)
- `--radius-md`: 0.75rem (cards, panels)
- `--radius-lg`: 1rem (modals, large containers)
- `--radius-full`: 9999px (avatars, pills)

## Motion

Energy: média. Functional transitions, not decorative choreography.

- Default duration: 200ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- Hover transitions: background, border-color, box-shadow only
- Loading: skeleton shimmer, not spinners in content areas
- Reduced motion: `@media (prefers-reduced-motion: reduce)` — instant transitions, no reveals

## Components

### Cards (Anime)
- Surface background with subtle border (`oklch(0.20 0.005 240)`)
- Cover image at top, 3:4 aspect ratio
- Title, predicted score (primary color, bold), community score (muted)
- Genre tags as small pills (surface + border)
- Hover: box-shadow glow with primary color at low opacity

### Taste Profile Badges
- Inline badges with genre name + average score
- Background: primary at 15% opacity
- Text: primary color
- Top genres get filled background (primary) with white text

### Input (Username)
- Surface background, 1px border (muted)
- Focus: border transitions to primary, subtle glow
- Error: border transitions to error color

### Button (Primary)
- Background: primary
- Text: white (ink)
- Hover: primary lightened slightly (L +0.05)
- Active: primary darkened (L -0.05)
- Disabled: primary at 40% opacity
- Loading: inline spinner

## Layout

- Login screen: centered vertically and horizontally, max-width 400px
- Dashboard: single column, max-width 1200px, centered
- Recommendation grid: `repeat(auto-fit, minmax(200px, 1fr))`, gap 1.5rem
- Taste profile: horizontal scroll or flex-wrap badges
