# WL Plans view harness

Renders the **real** white-label client Plans view by importing the actual kodara
components — not a hand-built copy. This is what makes the output 1:1 with the app:
the real component markup, the real Tailwind v4 utilities, the real recharts chart,
and the real `lib/plans` progress math all run here.

## How it works

- `vite.config.ts` aliases `@electron/*` to a checkout of `the-kodara/kodara`
  (`apps/electron/src`). Set `KODARA_REPO` to point at your checkout (default
  `C:/tmp/kodara-review`). Two modules are mocked — `@electron/lib/trpc/client`
  (data layer) and `useOpenWLPlanTaskChat` (navigation); everything else is real.
- `src/seed.ts` builds a `WLActivePlan`-shaped object from `../plan-template.json`
  plus a 54-day-in progression, materialized so the real progress functions compute
  sensible percentages.
- `src/App.tsx` composes the cards exactly as `apps/electron/src/pages/Plan.tsx` does.

## Build

```bash
npm install
KODARA_REPO=/path/to/kodara npm run build   # outputs dist/
```

Then copy `dist/` to `../wl-plans-view/` to publish (that folder is what GitHub
Pages serves).

## Caveats

- This reproduces the **component rendering** 1:1. Matching a specific live tenant
  also needs that tenant's white-label theme + real plan data; here it's the default
  teal theme with seeded data.
- The surrounding app shell (`WLMainLayout` / `WLSidebar` / `WLTopBar`) is out of
  scope — only the Plans content is rendered.
