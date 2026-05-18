# CLAUDE.md — Daily Life Tracker

## Design System

**Always read `DESIGN.md` before making any visual or UI decisions.**
All font choices, colors, spacing, border-radius hierarchy, and aesthetic direction
are defined there. Do not deviate without explicit user approval.

In QA mode, flag any code that doesn't match `DESIGN.md`:

- Inter / Roboto / system-ui as primary display or body font
- Emoji used as content icons (🍽️ 🏃 🔥 🚽 ⚖️ — keep emoji only in user-generated text)
- Rainbow color-coded counters (green meals / blue activity / red health / purple weight)
- Pastel gradient cards (the orange→yellow highlight card on the current landing is gone)
- `rounded-2xl` bubble-radius on every surface
- Drop shadows / glow effects on cards
- Animated skeleton / shimmer loaders
- Gradient buttons as primary CTA

A live preview of the design system, applied to Dashboard / Food log / Calendar, is at:
`~/.gstack/projects/charlielito-daily-life-tracker/designs/design-system-20260518/preview.html`

## Architecture

- Next.js 14 (App Router) · tRPC · Prisma · Supabase Postgres
- shadcn/ui primitives, restyled (not replaced) per DESIGN.md
- next-intl for i18n (en / es) — both must stay in sync
- NextAuth (credentials + Google OAuth)
- Stripe subscriptions with usage limits
- Cloudinary for image uploads, Google Gemini for macro AI

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
