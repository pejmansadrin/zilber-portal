# Frosted glass

Use the shared material from `src/styles/glass.css` (loaded by `globals.css`):

```tsx
<section className="glass-surface rounded-3xl p-6">Content</section>
<div className="glass-scrim fixed inset-0 z-50">Dialog</div>
```

`glass` is an alias for `glass-surface`. In a CSS module:

```css
.card {
  composes: glass-surface from global;
  padding: 24px;
  --glass-blur: 36px;
}
```

Theme tokens in `globals.css` control the tint, blur, border, highlight and shadow.
Overrides: `--glass-tint`, `--glass-blur`, `--glass-saturation`,
`--glass-shadow`, `--glass-radius`, and `--glass-scrim-tint`.
The material has an opaque fallback when backdrop filtering is unavailable or
reduced transparency is requested. Light and dark themes share the implementation.

The frosted layer is `::after`, behind the content in an isolated stacking context.
The host remains unfiltered, so it does not create a backdrop root or a fixed-position
containing block for its menus. Existing `::before` decorations remain available.

- Reserve `::after`; do not overwrite it on a glass element.
- Do not add opaque backgrounds or backdrop filters to the host. Change the tint token.
- Do not leave `will-change: opacity`, `filter`, masks, or opacity below 1 on ancestors.
  These can limit the area sampled by the blur. Use transform-only wrapper animations,
  or move overlays outside such ancestors (a portal where needed).
- Nested glass samples the already composited outer material; it cannot recover detail
  hidden by an opaque ancestor. No CSS class can bypass that browser limitation.
- Flat backgrounds have no detail to blur. Blur becomes visible over text, imagery,
  and color boundaries; do not compensate with excessive transparency.
- Apply to a container around inputs/images, not to replaced elements themselves.
- This is a visual material, not a dialog implementation: focus, dismissal, scroll
  locking and accessible names remain responsibilities of the component.

Migrated surfaces: login card/fields/dialog/loading, portal panels/sidebar/header/
profile menu/section picker/dock/loading, dashboard cards, attendance glass controls
and request-dialog scrims.
