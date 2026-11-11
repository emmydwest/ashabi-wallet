# Swapping in the brand

The product pages (`/`, `/start`, `/wallet`, `/vault/...`, `/chat`) take their look from a
handful of tokens, so a new logo, palette and typeface is a short change in four places.

## 1. Colours: `dashboard/src/app/globals.css`

In the `@theme inline` block:

| Token | Used for | Tailwind class |
|---|---|---|
| `--color-brand` | primary buttons, progress bars, selected template, focus rings | `bg-brand`, `text-brand`, `border-brand` |
| `--color-brand-strong` | hover state of primary buttons | `hover:bg-brand-strong` |
| `--color-brand-soft` | tinted backgrounds (selected card, success badge) | `bg-brand-soft` |
| `--color-on-brand` | text on top of `--color-brand`; keep it readable against it | `text-on-brand` |
| `--color-accent` | secondary highlights (rain chance in the weather card) | `text-accent` |
| `--font-display` | headings and big numbers | `font-display` |
| `--radius-card` | corner radius of cards | `rounded-card` |

Leave `--color-safe`, `--color-pending` and `--color-danger` alone unless you mean it: they carry
meaning (paid, waiting for you, blocked) across every page, including the Arena.

The older Arena and dashboard screens still use Tailwind's emerald and rose directly as status
colours. They look right next to any brand colour, but if you want them on-brand too, search
`dashboard/src` for `emerald-`.

The headline gradient is `.text-gradient` in the same file.

## 2. Fonts: `dashboard/src/app/layout.tsx`

Load the brand face with `next/font` (Google or `next/font/local`) and give it a CSS variable,
then point `--font-display` at it in `globals.css`:

```ts
const display = Local({ src: './fonts/Brand.woff2', variable: '--font-brand' });
// <html className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}>
```

```css
--font-display: var(--font-brand);
```

Body text stays on `--font-sans`; change that variable too if the brand has a text face.

## 3. Logo: `dashboard/src/components/logo.tsx`

One component, an inline SVG sized by `className` (`size-7` in the header). Replace the SVG
with the new mark and keep the same props. The favicon is `dashboard/src/app/icon.svg`.

## 4. Name and copy

The product name appears in `site-header.tsx`, page `metadata` titles and the home page hero.
