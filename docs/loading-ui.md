# Portal loading UI

## Structure

- TypeScript and Tailwind CSS v4 are already installed.
- Reusable components live in `src/components/ui`, imported through `@/components/ui`. The `@/*` alias resolves to `src/*`; a second root-level `components/ui` folder would split the component library and break these imports.
- Global styles: `src/app/globals.css`. Portal layout styles use colocated CSS modules.
- `components.json` records the shadcn directory aliases and Tailwind v4 CSS entry point. `src/lib/utils.ts` provides the standard `cn` helper. Inline Tailwind colors are selected for future generated components, preserving the existing portal theme.
- The supplied ripple loader is `src/components/ui/loader-4.tsx`; the original minimal demo is `src/components/ui/demo.tsx`.

The project already has the required setup. For a fresh project the shadcn CLI command is `npx shadcn@latest init`; this existing project uses the checked-in configuration. See the [official components.json guide](https://ui.shadcn.com/docs/components-json).

## Usage

```tsx
import Loader from "@/components/ui/loader-4";

// Standalone status, original size and colors.
<Loader />

// Inside a button which already has a pending label.
<Loader size={18} decorative />
```

`size` is the total width/height in pixels (default 162). `label` supplies screen-reader text. `decorative` hides the graphic from assistive technology when nearby text describes the operation. `className` supports layout customization.

The nine cells retain the supplied colors, staggered delays and 1.5s ripple. Inline spans allow valid button markup. Reduced-motion users see a static colored grid. No assets, API calls, external state or timers are needed by the component.

`styled-components` v6 is registered for streaming SSR through `src/lib/styled-components-registry.tsx`, the root layout and `compiler.styledComponents`. The registry follows the installed Next.js CSS-in-JS guide and [styled-components guidance](https://styled-components.com/docs/advanced#nextjs).

The shared `(portal)` route group uses a content-only `PortalSkeleton` fallback for dashboard, account, attendance and management pages. Its authenticated layout has a separate Suspense boundary with a neutral shell for the initial request. Navigation keeps the header mounted and interactive; skeletons never cover the screen with a blocking overlay. Account collections suspend independently of the overview and tabs. Login and account buttons retain their existing pending state.

## Checking the UI

Navigate between dashboard/account with browser network throttling, then submit a form to see the compact version. Check both themes and reduced-motion mode. Do not run destructive profile or password changes solely to test the animation.

Run `node ops/qa/navigation-streaming.mjs` to check that shell output precedes delayed account/record results, and that background downloads wait for load/idle and skip slow or data-saving connections. This is an isolated streaming test, not a production latency benchmark.

Validation completed: targeted ESLint, TypeScript, `git diff --check`, and `npm run build -- --webpack` passed. A local server-render smoke check verified nine cells, original colors/delays, the 162/84/18px variants, status semantics, inline button markup and reduced-motion CSS. The browser connection was unavailable, so animated appearance and interactive layout have not been visually verified.
