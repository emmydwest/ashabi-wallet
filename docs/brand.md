# Swapping in the brand

Every page takes its look from a handful of tokens: black, a neon mint brand colour, glass cards
and a soft glow. A new logo, palette and typeface is a short change in a few places.

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

The older Arena and dashboard screens use Tailwind's `emerald-*` classes. The same `@theme`
block redefines that scale as the mint brand, so they follow it; change both together.

Also in `globals.css`: `.glass` (card surface), `.glass-glow` (the one lit card on a page),
`.btn-brand` (primary button), `.glow-text`, the headline gradient `.text-gradient`, and the
motion utilities (`animate-float`, `animate-glow`, `animate-blink`, `animate-dot-wait`), all
switched off under `prefers-reduced-motion`.

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

`Logo` is the shield mark, an inline SVG sized by `className`; `Wordmark` pairs it with the name
and `NearBadge` is the "Built on NEAR" pill. The favicon, Apple touch icon and social card are
`dashboard/src/app/icon.png`, `apple-icon.png` and `opengraph-image.png`.

## 4. Mascot: `dashboard/src/components/mascot/mascot.tsx`

`<Mascot mood="happy | thinking | alert | blocked | approved" size={…} />`. From 112 px up it
draws the blank helmet (`public/mascot/blank.webp`) with the eyes as an SVG dot matrix over the
visor, so they blink and change between moods. Smaller copies (chat avatar, verdict chips) use
the pre-rendered `public/mascot/<mood>-128.webp`. The NEAR logo never goes on the mascot; NEAR
appears only as the "Built on NEAR" / "Powered by NEAR" badges.

Icons are `lucide-react`, at `size-4` or `size-5`, in the brand colour inside a tinted tile.

## 5. Name and copy

The product name appears in `site-header.tsx`, page `metadata` titles and the home page hero.
