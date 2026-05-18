# Design System — Daily Life Tracker

> **The health app a thoughtful doctor would respect.** Calm, private, adult.
> This app handles intimate body data (weight photos, food, bowel movements, pain levels).
> Every design choice serves one memorable thing: **treat body data with editorial gravity, not gamified hype.**

## Product Context

- **What this is:** A private health journal — daily tracking of nutrition (AI-calculated macros), weight, intestinal health (Bristol stool scale), physical activity, and calorie balance.
- **Who it's for:** Adults logging intimate clinical data about their own bodies, often from a phone, over months and years.
- **Space/industry:** Health & wellness apps, but explicitly *not* fitness-influencer / Instagram-y. Closer in spirit to a private medical journal or a Field Notes notebook than to MyFitnessPal.
- **Project type:** Mobile-first web app with desktop dashboards. Next.js 14, tRPC, shadcn/ui foundations, Tailwind, i18n (en / es).

## Aesthetic Direction

- **Direction:** Editorial Medical Minimal
- **Decoration level:** Minimal — typography and number-driven layouts do all the work. Hairline rules instead of card boxes. No decorative blobs, no gradients, no icon circles.
- **Mood:** Calm, private, deliberate, adult. Reads like a personal medical chart edited by a thoughtful designer. Carries the gravity of clinical journals (NEJM, The Lancet) and the restraint of editorial sites (Are.na, Reuters Tabs).
- **Reference touchstones:** clinical journals (visual restraint, tabular figures), Are.na (hairline rules + serif), Field Notes (paper-warm neutrals), Stripe Docs (typographic clarity).

## Typography

Three voices, no Inter.

- **Display / Hero:** **Instrument Serif** — Free, Google Fonts. Old-style serif with bookish personality. Page titles, large editorial numbers, the wordmark. Italic for accent emphasis.
- **Body & UI:** **General Sans** (300/400/500/600) — Free, Fontshare CDN. Warm geometric sans with character. Body copy, labels, buttons, inputs, navigation.
- **Data:** **Geist Mono** (400/500) — Free, Google Fonts. `tabular-nums` enabled. Time stamps, calorie totals, weight, macros — any place numbers should align in a column.
- **Loading:** Google Fonts for Instrument Serif + Geist Mono via `<link>`; Fontshare for General Sans via `<link>`. Both preconnected.

**Type scale** (1.25 modular):

| Token       | Px / line / tracking          | Family             |
|-------------|-------------------------------|--------------------|
| `hero`      | 56 / 60 / -0.02em             | Instrument Serif   |
| `h1`        | 40 / 44 / -0.015em            | Instrument Serif   |
| `h2`        | 24 / 32                       | General Sans 500   |
| `h3`        | 18 / 28                       | General Sans 500   |
| `body`      | 16 / 26                       | General Sans 400   |
| `small`     | 14 / 22                       | General Sans 400   |
| `micro`     | 12 / 18 · `tracking:.08em` · uppercase | General Sans 500 |
| `data-xl`   | 52 / 56 / -0.015em · tabular  | Instrument Serif   |
| `data-md`   | 18 / 24 · tabular             | Geist Mono         |

## Color

**Approach:** restrained — one accent, sparingly. No green-good / blue-info / purple-weight rainbow.

### Light
| Role        | Hex        | Usage                                                        |
|-------------|------------|--------------------------------------------------------------|
| Paper       | `#FAFAF7`  | Page background — warm off-white, not clinical-cold          |
| Paper 2     | `#F4F2EB`  | Secondary surface, subtle mockup frames                       |
| Surface     | `#FFFFFF`  | Cards, modal interiors, input fields                          |
| Ink         | `#111110`  | Primary text, primary button background                       |
| Ink 2       | `#2A2A27`  | Body emphasis                                                 |
| Muted       | `#6F6E69`  | Secondary text, labels                                        |
| Muted 2     | `#9C9A91`  | Tertiary text, dimmed dates                                   |
| Hairline    | `#E5E3DC`  | All dividers, default borders                                 |
| Hairline+   | `#D0CDC2`  | Hover/focused borders                                         |
| **Iron Red**| `#B0413E`  | THE accent — today marker, deficit, attention-needed only     |
| Iron soft   | `#F1DAD8`  | Iron-tinted backgrounds (today cell, attention chip)          |

### Dark
| Role        | Hex        |
|-------------|------------|
| Paper       | `#0F0F0D`  |
| Paper 2     | `#1A1A17`  |
| Surface     | `#161613`  |
| Ink         | `#EDEAE0`  |
| Ink 2       | `#C9C5B9`  |
| Muted       | `#928F84`  |
| Hairline    | `#2A2925`  |
| Iron Red    | `#D86663`  |
| Iron soft   | `#3A1E1D`  |

### Semantic (rare — only when truly needed)
| Role     | Hex        | Usage                                            |
|----------|------------|--------------------------------------------------|
| Success  | `#2E6B4C`  | Botanical green — confirmed save, met goal       |
| Warning  | `#B5790E`  | Mustard — approaching usage limit                |
| Error    | `#9B2C2C`  | Deep — destructive confirmations only            |

**Dark mode strategy:** redesign surfaces (don't just invert). Drop saturation 10–20% on accent. Same iron-red, warmer in dark.

## Spacing

- **Base unit:** 4 px
- **Density:** comfortable — more breath than typical SaaS. Section padding 64–96 px desktop, 32–48 px mobile.
- **Scale:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`
- **Vertical rhythm:** rule above and below every section. No drop shadows on surfaces.

## Layout

- **Approach:** hybrid — grid-disciplined for app screens (data wants alignment), creative-editorial for landing/marketing.
- **Grid:** 12-col on desktop with 32 px gutter; single-column on mobile.
- **Max content width:** 1280 px wide canvas, 1200 px reading column.
- **Sidebar (app shell):** 220 px, line icons (1.5 px stroke), 2 px iron-red active rail on the left of the active item — not chip backgrounds.
- **Border radius:**
  - `0` on most app surfaces (hairline frames)
  - `4` on inputs and small interactive elements
  - `8` on modals and sheets
  - `9999` on avatars and pill tags
  - **No `rounded-2xl` everywhere. No bubble-radius.**

## Motion

- **Approach:** minimal-functional. Fades + slides. No parallax. No spring bounce. No skeleton-shimmer.
- **Easing:** enter `ease-out`, exit `ease-in`, state changes `ease-in-out`.
- **Duration:** `micro` 80 ms · `short` 180–220 ms · `medium` 280–360 ms · `long` 480 ms (rare).

## Iconography

- **Library:** [`lucide-react`](https://lucide.dev) (already in dependencies).
- **Stroke:** 1.5 px, consistent across sizes.
- **Sizes:** 14 / 16 / 20 / 24 — pick one per role.
- **No emoji as content icons.** Drop 🍽️ 🏃 🔥 🚽 ⚖️ everywhere they appear. Emoji is reserved for user-generated content only (meal descriptions, notes).

## Components

Built on existing shadcn/ui primitives. Restyled, not replaced.

- **Button:** four variants — `default` (ink), `iron` (accent — for one CTA per screen max), `ghost` (hairline border), `link`. No gradient buttons.
- **Input / textarea / select:** white surface, hairline border, ink-on-focus, 12 px vertical / 14 px horizontal padding, 15 px font.
- **Card:** hairline border, no shadow, no radius on app screens. Modals get 8 px radius.
- **Pillar strip:** the dashboard's defining component — 4 numerical pillars in a row, hairline dividers, big serif numbers with tabular figures, lowercase units, optional iron-red on the one number that needs attention.
- **Meal list row:** typographic list, not card grid. Time (mono) · name + description · macros (mono) · kcal (mono right-aligned).
- **Calendar cell:** number in serif, marks in mono, today in iron-soft background with iron text.

## Anti-patterns (never ship)

- ❌ Purple-violet gradients as accent
- ❌ Pastel gradient "feature highlight" cards on landing (the current orange→yellow card)
- ❌ 3-column SaaS feature grid with icon circles
- ❌ Centered everything with uniform spacing
- ❌ Rainbow color-coded counters (green meals / blue activity / red health / purple weight)
- ❌ Bubble-radius (`rounded-2xl`) on every surface
- ❌ Gradient buttons as primary CTA
- ❌ Emoji as content icons
- ❌ Inter, Roboto, system-ui as display or body
- ❌ Drop shadows or glow effects on cards
- ❌ Animated skeletons or shimmer loaders — use a calm `Loading…` line instead

## Voice & Microcopy

- Direct, calm, adult. No exclamation points. No emoji in app chrome.
- Time stamps in 24-hour mono (`19:48`). Dates in serif italic for emphasis (`Monday, May 18.`).
- Empty states are one sentence in italic serif, not a marketing pitch.
- Numbers always have lowercase units (`kcal`, `kg`, `ml`, `g`), separated from the value by a small space.

## Implementation Notes

- **Tailwind config:** add the palette as CSS variables and reference them via `bg-paper`, `text-ink`, etc. Keep the shadcn `hsl(var(--…))` pattern; just retune the variables to the new palette.
- **Fonts:** load via `next/font/google` for Instrument Serif + Geist Mono. General Sans loads from Fontshare via `<link>` in `<head>` (it's free, no API key).
- **Globals.css:** replace the current `--background / --foreground / --primary` block with the variables above (paper / ink / iron, etc.).
- **Body class:** `font-sans` should resolve to General Sans; `font-display` (new) to Instrument Serif; `font-mono` to Geist Mono.
- **`tabular-nums`:** apply via a utility class `.tnum` to every number on the dashboard, calendar, food log, weight history.

## Reference

A live preview of the system applied to Dashboard, Food log, and Calendar screens — including light/dark mode — lives at:

```
~/.gstack/projects/charlielito-daily-life-tracker/designs/design-system-20260518/preview.html
```

Open it in a browser before making visual decisions to anchor your eye.

## Decisions Log

| Date       | Decision                                                                                       |
|------------|------------------------------------------------------------------------------------------------|
| 2026-05-18 | Initial design system created. Editorial Medical aesthetic, Iron Red `#B0413E` accent.         |
| 2026-05-18 | Dropped Inter (current default). Adopted Instrument Serif + General Sans + Geist Mono.         |
| 2026-05-18 | Dropped emoji content icons. Adopted Lucide line icons at 1.5 px stroke.                       |
| 2026-05-18 | Dropped rainbow stat counters. Hierarchy via type weight and position, not color.              |
| 2026-05-18 | Removed pastel gradient highlight card from landing. Replaced with editorial composition.      |
