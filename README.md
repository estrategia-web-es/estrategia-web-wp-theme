# Estrategia Web — WordPress parent theme

**Block** parent theme shared by all of David's WordPress sites. Each site has
a **child theme** copied from a template, and the child belongs to the project
from day one. The decision and its three conditions are in
`E:\Repositories\armazon\decisiones\2026-10-01-wordpress-tema-padre-compartido.md`.

- Requires **WordPress 7.1** and **PHP 8.1**. Current version: **1.1.0**
  (changelog in «Versions», at the end).
- **Design only since 1.1.0** (14-10-2026, «one theme + one plugin»): it
  registers no block, a WordPress.org requirement. The blocks its templates
  and parts use (`estrategia-web/carousel`, `…/map`, `…/whatsapp`,
  `…/language-switcher`) are modules of the **Estrategia Web** plugin
  (`E:\Repositories\armazon-wp-sitio`, folder `modules/`). **Without the
  plugin, or with the module switched off, the block is not rendered and
  there is no error**: the footer comes out without the WhatsApp button, and
  that's it.
- **The cookie notice is not here either since 0.7.0**: it is the `consent`
  module of the same plugin. Without it there is no notice, and the map still
  works in two clicks.
- It is installed in `wp-content/themes/estrategia-web/` (the folder slug is
  `estrategia-web`: children name it in `Template: estrategia-web`).
- No build step: neither `@wordpress/scripts` nor `node_modules`.

## What goes here and what does not

| Goes in the parent | Goes in the child |
|---|---|
| generic templates and parts (`templates/`, `parts/`) | the brand's colours, fonts and sizes (redefining the slugs below) |
| base `theme.json`: spacing scale, fluid typography, neutral palette, `viewport` breakpoints | patterns (the site's sections), section styles, its own templates |
| how the plugin's blocks look inside the design (`assets/view-transitions.css`, tokens) | the site's texts, logo, pages |
| its translations (`languages/`) | which cookie categories the site declares (plugin filter) |

**A new block does NOT go here** (1.1.0): it goes as a module of the
Estrategia Web plugin. The theme can only USE blocks in its templates, parts
and patterns.

**What works and stores data, even if it shows on every site, does NOT go
here**: it goes to the Estrategia Web plugin, because a site that changes
theme must not lose it. That is the case of the cookie notice (it left in
0.7.0): the parent gives it no style of its own, because the plugin ships a
neutral stylesheet that reads the `theme.json` tokens (`base`, `contrast`,
`border`, spacing, sizes); the parent's and child's colours reach it on their
own. A child that wants a different look fine-tunes it with CSS on
`.estrategia-web-consent` in its own stylesheet.

**Nothing from any brand or any project.** If only one site uses something, it
goes to its child. Borderline case: a module that almost all sites use with
variations goes to the parent if the variations are **settings** (attributes,
tokens); if they are **something else**, to the child.

## Structure

    style.css            header + what theme.json cannot express (focus, skip to content, anchors); enqueued by the parent
    theme.json           base v3: layout, viewport, palette, spacing, typography, parts
    functions.php        only loads inc/*.php
    inc/                 setup.php · core-blocks.php · view-transitions.php · performance (0.7.8):
                         critical-css.php · font-preload.php · column-image-sizes.php
    assets/core-blocks/  shared behaviour of core blocks (accordion.css), one per block
    templates/           index, front-page, page, single, archive, search, 404
    parts/               header, footer, navigation-overlay
    patterns/            404, no-results (translatable texts of the templates)
    languages/           estrategia-web.pot · es_ES.po · es_ES.l10n.php
    tests/               browser tests + test WordPress (Playground)
    tools/i18n.mjs       extracts, merges and generates the translations
    tools/static-map.mjs static image of a map (OpenStreetMap) for estrategia-web/map

## The palette and the presets a child redefines

The slugs are the contract with the children: **a child changes the colour,
never the slug**. Renaming or removing a slug is a **major** version (it
breaks already-saved content, which has `has-<slug>-color` written into it).

| Slug | What for | Value in the parent |
|---|---|---|
| `base` | page background | `#ffffff` |
| `surface` | alternate background: bands, cards, footer | `#f4f4f4` |
| `contrast` | main text | `#1a1a1a` |
| `muted` | secondary text | `#5c5c5c` |
| `border` | borders and separators | `#d6d6d6` |
| `primary` | brand colour: buttons, links | `#1a1a1a` |
| `on-primary` | text on `primary` | `#ffffff` |
| `secondary` | second brand colour; button hover | `#4a4a4a` |
| `accent` | details, highlights | `#2b2b2b` |

- **Spacing** (`--wp--preset--spacing--N`, the slug is the size in px):
  `8 16 24 32 48 64 80 120`; 80 and 120 are fluid (`clamp`).
- **Typography**: families `system` and `mono` (system fonts, nothing to
  download); sizes `small medium large x-large xx-large xxx-large`, fluid
  from `large` upwards.
- **Breakpoints** (`settings.viewport`): `mobile` 480px, `tablet` 782px,
  WordPress's own. With them `@mobile` / `@tablet` work in `theme.json` (7.1).

In the child's `theme.json`, `settings.color.palette` **replaces** the whole
list (it is not merged by slug): the child repeats the nine slugs with its
colours.

## How a child is created

1. Copy the child template (separate repo; until it exists, the minimum is
   the one in `tests/fixtures/estrategia-web-hijo-prueba/`): `style.css` with
   `Template: estrategia-web` and its own `Text Domain`.
2. The child's `theme.json`: the palette with the nine slugs, the brand's
   fonts, section styles in `styles/`.
3. The child's `functions.php`, if the site has optional cookies (the notice
   belongs to the Estrategia Web Site plugin 0.5.0+, which must be active):

       add_filter( 'estrategia_web_consent_categories', fn( $c ) => array_merge( (array) $c, array( 'maps' ) ) );

   If it declares none, **no cookie notice appears**, which is the normal
   case. The «Cookie settings» link is the `estrategia-web-site/consent`
   block (`parts/footer.html` includes it; without the plugin it renders
   nothing).
4. The site's WhatsApp number: `wp option update estrategia_web_whatsapp_phone 34600111222`.
5. What the child does NOT do: copy folders from the parent's `blocks/` (see
   the trap in `inc/blocks.php`) or call `estrategia_web_*` functions outside
   a hook (the child's `functions.php` is loaded BEFORE the parent's).

## Page transitions (0.7.5)

When moving from one page to another, the new one comes in with a 0.22 s
fade (cross-document View Transitions, CSS only: `assets/view-transitions.css`,
which `inc/view-transitions.php` inlines after `style.css`). The header and
the footer's WhatsApp button stay still. With «reduce motion», no
transition. Browsers without support (Firefox, today) change page as always.

A child fine-tunes it or switches it off in its `theme.json`:

    "settings": { "custom": { "motion": { "page": {
        "enabled": true,       false: nothing is printed
        "duration": "0.22s",   the page fade
        "easing": "ease"
    } } } }

**If the child's header is a `position: fixed` element inside the template's
`<header>`** (Lavandería: `.lm-header`), that element carries the class
**`estrategia-web-vt-header`**; without it the header disappears halfway
through the transition (the `<header>` is 0 tall and its snapshot comes out
empty; measured on 06-10-2026). The cookie notice does not take part: it
names itself in Estrategia Web Site 0.5.1. The decisions and the traps, in
the stylesheet's header.

## How it is versioned and updated

Semantic versioning in the `style.css` header (and in the `block.json` of each
block that changes). Each version has its git tag and its changelog entry.

- **Minor / patch**: no child needs touching. New attributes always with a
  `default`; the blocks are dynamic (`render.php`), so changing their markup
  does not invalidate what is saved.
- **Major**: whatever breaks a child (renaming a slug, removing an attribute
  or a filter). It comes with a note on what to change in the child.
- **The child works even if the parent is not updated**: nobody bumps the
  version on the same day.

Installable package, without tests or tools (`.gitattributes`):

    git archive --format=zip --prefix=estrategia-web/ -o estrategia-web-0.1.0.zip v0.1.0

**The deployment trap:** whatever is touched in the Site Editor is saved in
the database and **overrides the theme's files**, the parent's too. A parent
update is not visible on a site with that part customised. Before each
deployment those customisations are checked and deleted. And `theme.json` is
cached: locally, `WP_DEVELOPMENT_MODE='theme'`.

## The blocks it uses (and are no longer its own)

**Since 1.1.0 these blocks live in the Estrategia Web plugin**, each in its
module (`armazon-wp-sitio/modules/<block>/`), with its code, its
`render.php` and its documentation. The summary and the notes stay here
because the theme uses them in its templates. Their tests moved to the plugin
on 17-10-2026 (armazon-wp-sitio, `modules/<block>/tests/`); the test server
still mounts the plugin so that the theme's own tests (page-loads,
view-transitions) see the blocks inside the theme.
The `tools/static-map.mjs` tool has not moved either.

The full documentation of each one (decisions, who, when, borderline case
and the trap) is **in the header of its `render.php`**, in the plugin, which
is where whoever touches it lands. Here, the summary.

| Block | What it does | Editor | Behaviour |
|---|---|---|---|
| `estrategia-web/carousel` | scrollable row with scroll-snap; arrows, optional dots, how many visible per width; autoplay only if asked for; with a `core/query` inside, each post is a slide (0.2.0); looping by default (`loop`, 0.5.0), infinite without clones since 0.6.0; each step slides, also with just one extra (0.7.2); images with priority on those visible on load, the rest deferred, and `sizes` from the slide width, or from the `imageSizes` attribute (0.7.4, `inc/carousel-images.php`) | classic `edit.js` (InnerBlocks) | Interactivity API (`view.js`) |
| `estrategia-web/map` | image + address; the Google iframe only after «Show map» or with «maps» accepted; «Open in Google Maps» link; without a photo, a box with the place's details (0.3.0); OSM static map under the box (`staticMapUrl`, 0.5.0); no details box if the listing already shows them alongside (`showDetails:false`, 0.6.0); inside a Query, details via bindings (0.2.0) | classic `edit.js` (media library picker) + ServerSideRender | Interactivity API |
| `estrategia-web/whatsapp` | floating link to `wa.me` with a message; number from the block or from the site option | `autoRegister` | none (it is a link) |
| `estrategia-web/language-switcher` | current language («ES») in a button with `aria-expanded` and the list of the other languages (links to the same translated page, with `hreflang` and `lang`); provided by WPML (`wpml_active_languages`); **without WPML or with a single language it renders nothing** (0.7.6) | `autoRegister` (attribute `display`: code or name; `layout`: `dropdown`, the default, or `inline`, «EN – ES» inline without a dropdown, 0.7.7) | Interactivity API: opens, closes with Escape (focus back to the button) and when clicking outside |
| `core/accordion` (core) | open and close by sliding, with motion tokens (0.4.0); the answer fades and rises, the «+» rotates 135° (0.7.3); the stylesheet states the technique and the trap | the core one | the core store + `assets/core-blocks/accordion.css` |

**Why classic `edit.js` and not a module:** WordPress 7.1 does not accept ES
modules as `editorScript` (there is no `editorScriptModule`). Without a build,
what is left is a classic script with the `wp.*` globals and `createElement`
instead of JSX. Its dependencies are in `edit.asset.php`, **written by hand**,
just like the modules' `view.asset.php`. Blocks without InnerBlocks or media
library use `supports.autoRegister` (7.0): the editor renders them with
ServerSideRender and generates the controls; their translated labels come
from `labels.php`.

**CSS scope:** a class prefix per block (`.estrategia-web-carousel__…`), which
is the convention of WordPress blocks, and not `@scope` (row 1 of the
Armazón, meant for custom elements). Colours and sizes, always tokens.

**Consent, in one line:** it belongs to the Estrategia Web Site plugin since
0.7.0 (its `includes/class-consent.php` documents it fully), with the same
contract it had here. The parent only USES it, and only via JS:
`estrategia-web/map` checks `window.estrategiaWebConsent?.has( 'maps' )`,
listens to `estrategia-web:consent` and, on clicking «Show map», calls
`window.estrategiaWebConsent?.grant( 'maps' )`. Without the plugin, those
calls do nothing and the map works in two clicks (the plugin's `modules/map/tests/map.test.mjs`).

## Strings and translations (row 11)

`msgid` in English in the code (`__()`, `_x()`, `wp.i18n.__`), domain
`estrategia-web`. It is translated in `languages/es_ES.po` and regenerated:

    node tools/i18n.mjs

Which updates `estrategia-web.pot`, merges the `.po` and generates
`es_ES.l10n.php` (WordPress 6.5+ PHP format, no `.mo`). Since 1.1.0 the theme
no longer has editor scripts; the blocks' strings are in the plugin's `.po`,
which uses the SAME domain (`estrategia-web`): WordPress joins both files.
What remained in `es_ES.po` as `#~` are the strings of the former blocks,
obsolete. **Inside a theme the file is named after the locale
(`es_ES.l10n.php`), not `estrategia-web-es_ES`**: with the long name it is
there, has the right size and is not loaded (see `inc/setup.php`).

## Tests (row 7)

    node tests/run.mjs                 starts WordPress 7.1, runs everything and stops it
    node tests/server.mjs              only WordPress, to look at it:
                                       http://127.0.0.1:9401/prueba-modulos/
    ESTRATEGIA_WEB_BASE_URL=http://127.0.0.1:9401 node tests/run.mjs accordion

All are **level 3** (browser, Playwright taken from `portal-hs`) and each one
says why in its first line. The test WordPress activates the **test child**,
so everything is tested with the parent working as a parent, and since 1.1.0
**the Estrategia Web plugin** (mounted from `E:/Repositories/armazon-wp-sitio`,
or `ESTRATEGIA_WEB_PLUGIN`) with only the block modules switched on (without
`consent`: the cookie notice belongs to the plugin).

What tests the blocks themselves lives in the plugin; what stays here is what
measures the theme around them (its CSS, templates, transitions, translations).

Playground traps on Windows, all measured on 01-10-2026 and detailed in the
header of `tests/server.mjs`: `--mount=E:/…:/…` does not work (`--mount-dir`
is used); from Git Bash, MSYS turns `/wordpress` into a Windows path without
raising an error; `--login` does not serve a new browser; non-existent pretty
permalinks return the home page with 200 (the 404 is tested with `?name=`);
and killing the parent does not kill the children (`taskkill /T`).

## Versions

One entry per version, newest on top: what changes and whether any child
needs touching. Whoever bumps the version (`style.css` header and `version`
of the `block.json` that changes) writes their entry here in the same commit.

### 1.1.0 — 14-10-2026 (the blocks move to the plugin: the Estrategia Web plugin 1.1.0 MUST be installed)

- **The theme no longer registers blocks** (a WordPress.org requirement).
  Out: `blocks/`, `inc/blocks.php`, `inc/carousel-images.php`,
  `inc/whatsapp.php` and `inc/legacy-names.php`. All of that is now the
  **Estrategia Web** plugin 1.1.0 (modules `carousel`, `map`, `whatsapp`,
  `language-switcher`), with the SAME names: blocks `estrategia-web/…`,
  options `estrategia_web_whatsapp_*`, filters `estrategia_web_carousel_*`,
  aliases `armazon/…`.
- **What to change in a child: nothing**, if it has the plugin active.
  Lavandería did not call any of the parent's functions that left (those in
  `carousel-images.php` become `EstrategiaWeb\Carousel\images_*()`).
- **Without the plugin**: the templates and patterns that use those blocks
  raise no error; the block is not rendered (WordPress does not render an
  unregistered block).
- **Do not mix** this theme with the 1.0.0 plugins, nor the 1.0.0 theme with
  the 1.1.0 plugin (blocks registered twice). Neither 1.0.0 was ever
  published.
- Tests: still here, with the plugin mounted (`tests/server.mjs`,
  `tests/fixtures/setup/setup.php` switches on only its block modules).

### 1.0.0 — 07-10-2026 (MAJOR: name change, child themes MUST be touched)

- **«Armazón» becomes «Estrategia Web»** everywhere: folder
  `estrategia-web`, text domain, functions, constants, blocks, classes,
  options and filters (table in «Names»). Author, Theme URI and Author URI:
  Estrategia Web, https://estrategiaweb.es/.
- **What to change in a child:** `Template: estrategia-web` in its
  `style.css`; `armazon/…` → `estrategia-web/…` in patterns and templates;
  the `armazon-…` classes and properties → `estrategia-web-…` in its CSS; the
  `armazon_…` filters → `estrategia_web_…`. And run the migrator on the site
  (it is in the Estrategia Web Site plugin 1.0.0) before activating the new
  theme.
- **Aliases** for the four blocks and the two old options until 2.0.0
  (`inc/legacy-names.php`).
- It goes with **Estrategia Web Site 1.0.0** (the cookie notice and the
  `window.estrategiaWebConsent` API that the map reads are renamed at the
  same time).

### 0.7.9 — 06-10-2026 (patch, no child needs touching)

- Carousel: of the slides visible on load, only the FIRST carries
  `fetchpriority="high"`; the others load right away (no lazy) but without
  priority. With all three on «high», mobile requested ~500 KB with priority
  and only one is visible: by blocking slides 2 and 3, local LCP dropped from
  6.6 to 4.6 s (Lavandería).

### 0.7.8 — 06-10-2026 (performance, no child needs touching)

From Lavandería's mobile PageSpeed (performance 80, LCP 5.2 s): render-
blocking CSS, fonts requested late and column images downloading at twice
the size. Each file states in its header what it does, how it is maintained
and its trap.

- `inc/critical-css.php`: core's inline CSS limit goes from 20,000 to
  120,000 bytes (`estrategia_web_styles_inline_size_limit`), so the
  navigation and image block stylesheets go inside the HTML; the theme's and
  plugins' stylesheets enqueued by URL too, if they fit (they are given their
  `path`; `estrategia_web_inline_style` to exclude one). And a child can
  **defer** a large stylesheet (`estrategia_web_deferred_styles`): it goes
  with `rel="preload"` + `onload`, behind its critical CSS
  (`assets/css/dist/critical.css`, `estrategia_web_critical_css_file`), which
  the parent prints in a `<style id="estrategia-web-critical-css">` in its
  place. Without critical CSS nothing is deferred. **Visible:** with no
  child using it, the only change is that small stylesheets go inline.
- `inc/font-preload.php`: `<link rel="preload" as="font" crossorigin>` for
  the normal woff2 faces of the text and heading families in `theme.json`
  (up to 4), via `wp_preload_resources`. `estrategia_web_preload_fonts`.
- `inc/column-image-sizes.php`: the `sizes` of an image inside a
  `core/column`, if it is WordPress's (100vw), becomes the row's share
  (`(max-width: 781px) 100vw, min(50vw, 692px)`), enlarged if the image is
  cropped (`object-fit: cover`). `estrategia_web_column_image_sizes`.
- Tests: the child checks them (Lavandería, `tests/render-blocking.test.mjs`,
  level 3). None new here.

### 0.7.7 — 06-10-2026 (new, no child needs touching)

- `estrategia-web/language-switcher` gains `"layout":"inline"`: all
  languages inline, «EN – ES», the current one with `aria-current` and in
  bold and the rest linked with `hreflang`; no dropdown and no JS. For the
  mobile menu (David, on Lavandería: «el selector de idioma en mobile es
  feo, puedes poner EN - ES (sin desplegable)» — "the language selector on
  mobile is ugly, can you put EN - ES (no dropdown)"). Without the
  attribute, the dropdown stays.

### 0.7.6 — 06-10-2026 (new, no child needs touching)

- **Block `estrategia-web/language-switcher`**, the language selector for
  WPML sites (the «ES ▾» in Lavandería's header, which had it in its child as
  a `<details>` and now uses this one). Button with
  `aria-expanded`/`aria-controls` and a list of links with `hreflang` and
  `lang`, each language with its name in its own language. Without WPML, or
  with a single active language, it renders nothing: it can be left in any
  child's header. The child sets the look on `.estrategia-web-language`
  (and the arrow, on `.estrategia-web-language__toggle::after`). Decisions,
  borderline case and traps, in the header of its `render.php`.
- **Tests:** there is no test here. The test parent has no WPML (it is paid;
  it is not mounted in a shared repo), and without WPML the block renders
  nothing. Lavandería's `tests/language-switcher.test.mjs` tests it with
  real WPML (level 3: each page with its counterpart, the selector leads to
  it, `aria-expanded` changes, Escape closes).

### 0.7.5 — 06-10-2026 (new, no child needs touching)

- **Page transitions** with cross-document View Transitions, CSS only
  (section «Page transitions»): page fade, header (`estrategia-web-header`)
  and the footer's WhatsApp (`estrategia-web-whatsapp`) still, nothing with
  «reduce motion». Tokens `settings.custom.motion.page` (`enabled`,
  `duration`, `easing`).
- **Class `estrategia-web-vt-header`** for a child with the fixed header
  inside the template's `<header>`. Lavandería needs it on `.lm-header`;
  without it it works, but the header flickers.
- **Tests:** `tests/view-transitions.test.mjs` (level 3): navigation from
  `/prueba-modulos/` to the home page arrives with `viewTransition` in
  `pagereveal`, the rule is there, names are not repeated and with «reduce
  motion» there is no transition. Seen failing before the CSS, and with a
  mutant without the «reduce motion» `@media`. The first version named plain
  `.estrategia-web-whatsapp` and the test caught it: the test page has two
  and a repeated name aborts the transition.

### 0.7.4 — 06-10-2026 (fix, no child needs touching)

- **Carousel images load according to what is visible.** From Lavandería's
  audit: on desktop the home page's LCP image was slide 2 and only slide 1
  carried `fetchpriority="high"`. Now, if WordPress decides the carousel is
  the first thing on the page (it gives priority to one of its images), all
  the slides that can be seen on load —`ceil` of the largest `perView`—
  carry `fetchpriority="high"` and none `loading="lazy"`; the rest are
  deferred and with `sizes="auto, …"`. A carousel further down gets no
  priority. Measured on Lavandería: at 402 slide 1 is visible; at 1512,
  slides 1, 2 and 3.
- **`sizes` from the slide width**, not the window: it comes from `perView`
  and the carousel width (`100vw` if it is `align: full`; otherwise
  `wideSize` or `contentSize`). Before, all carried WordPress's,
  `(max-width: 1920px) 100vw`, and with three in view the 1536 one was
  downloaded for a ~500 slot.
- **New attribute `imageSizes`** (text, empty by default): a child that
  renders the slides at a width other than `perView`'s writes its `sizes`
  there. Also the filters `estrategia_web_carousel_image_sizes` and
  `estrategia_web_carousel_eager_slides`. How it works and the two traps, in
  the header of `inc/carousel-images.php`.
- **Tests:** `tests/carousel-images.test.mjs` (level 3, new page
  `/prueba-carrusel-fotos/` with real images generated in the seeding), seen
  failing against 0.7.3: «Foto 2 (diapositiva 2, visible al cargar) sin
  fetchpriority="high"».

### 0.7.3 — 06-10-2026 (fix, no child needs touching)

- **The FAQ (`core/accordion`) no longer «da un salto el texto»** ("the text
  jumps"). David, on Lavandería, with the Miquel Capellà i Associats website
  as the model. What the model does, measured frame by frame: everything in
  0.25 s ease-in-out; the height grows, the answer goes from opacity 0 to 1
  rising from below and the «+» rotates 135°. What ours did: the answer
  appeared at opacity 1 from the first frame and, already whole, rose 8 px
  (the `margin-top: -0.5rem` the child gives the open panel, animating from
  0 to -8): you could see it repositioning. Now the panel's children fade
  and rise (`@starting-style` on opening) with the same curve as the height
  and the margin, so that shift happens while the answer appears and in a
  single direction; on closing, the same in reverse. The question's height
  only grows or only shrinks, and the text does not change x or lines (the
  0.5.0 behaviour remains).
- **New tokens** in `settings.custom.motion.accordion`: `duration` (0.25s),
  `easing` (ease-in-out), `rise` (1rem, how much the answer rises) and
  `turn` (135deg, the open icon's rotation; with «+» it ends in «×» as with
  core's 45°). A child with an arrow as icon sets its own `turn`.
- **Same-page anchors: the jump slides** (`scroll-behavior: smooth` on the
  root, except with «reduce motion») **and the target ends up below the
  fixed header**: `scroll-padding-top` = the child's
  `--wp--custom--layout--cabecera` token (0 if it has none) plus the admin
  bar. No JavaScript: when arriving with `#anchor` in the URL, Chromium also
  slides and respects the padding. The rule goes on `:root` and overrides
  the `html { scroll-padding-top }` Lavandería already had (same value, plus
  the bar); the child can remove its own.
- **The parent enqueues its `style.css`** (handle `estrategia-web-style`).
  Until now it only arrived if the child enqueued it: the test child did not
  and was left without visible focus or skip to content. Lavandería enqueues
  it with that same handle, so it does not come out twice.
- **Tests:** `accordion.test.mjs` redone (open and close with Lavandería's
  margins: monotonic height, text still in x and lines, opacity that only
  goes up or down, movement in a single direction; keyboard and focus; 135°
  rotation), seen failing with 0.7.2 («sale ya con opacidad 1»; «el + está a
  45°»). New `anchors.test.mjs` on `/prueba-anclas/` (an 80 px fixed header
  the test child puts only there): a click that passes through intermediate
  positions without going back, target in view on clicking and on arriving
  with the hash, a dry jump with «reduce motion»; seen failing with 0.7.2
  («0 2631»: a single jump). Also checked against Lavandería's local
  WordPress (`/autoservicio/` and `#pasos`, at 1280 and at 390).

### 0.7.2 — 06-10-2026 (fix, no child needs touching)

- **The infinite carousel slides instead of jumping.** David, on
  Lavandería's home page: «el carrusel necesita una animación, va a saltos»
  ("the carousel needs an animation, it jumps"). Cause, measured frame by
  frame: with only ONE extra slide (3 images and 2.4 in view) no `order`
  rotation allows scrolling a whole one, and `view.js` fell into «rotate and
  scrollLeft = 0 at once»: the whole change in one frame, with «next» and
  with «previous». Now `glide()` rotates and animates each slide with a
  transform from where it was; the one that wraps around comes in from one
  side while a temporary, inert copy leaves from the other (it is removed at
  the end). Steps clicked while animating are queued.
- **Clicking repeatedly on a track that does scroll** no longer jerks: the
  instant scrollLeft correction fell on the nearest scroll-snap anchor. Now
  the track has no snap during its own animation and the rotation is kept if
  it already allows the travel.
- With «reduce motion» there is still no animation: the slide changes once,
  without going back and forth.
- **Tests:** `tests/carousel-glide.test.mjs` (new, seen failing with 0.7.1)
  requires at each step at least 3 intermediate frames, none advancing more
  than half a slide or going back, and reaching the right one; at 1200 and
  at 402, wrapping around and with three clicks in a row. Seeding: the
  «Carrusel con una de más» in /prueba-carrusel-bucle/.

### 0.7.1 — 05-10-2026 (fix, no child needs touching)

- **`estrategia-web/whatsapp` respects the mobile safe area**: the distance
  to the corner is `--estrategia-web-whatsapp-offset` PLUS
  `env(safe-area-inset-*)` (bottom and the side of its corner), so that with
  `viewport-fit=cover` it does not end up under the gesture bar or the
  notch. Without that, env() is 0 and the button stays where it was. The
  corner was already chosen with the `position` attribute (`bottom-right` by
  default, or `bottom-left`); that does not change.
- A child that moves the button does it with the variable, not with
  `inset-*`: otherwise it loses the safe area (header of
  `blocks/whatsapp/style.css`).
- **Tests:** `tests/whatsapp.test.mjs` checks in the stylesheet that the
  three distances carry their `safe-area-inset-*` (on a desktop Chromium
  env() is 0 and the computed style cannot tell).

### 0.7.0 — 05-10-2026 (the cookie notice moves to the plugin: Estrategia Web Site 0.5.0 MUST be installed)

What has to be done on each site: **update the parent to 0.7.0 and
Estrategia Web Site to 0.5.0 at the same time**. Nothing else: the child's
`estrategia_web_consent_categories` filter, the cookie (whoever already
chose does not see the notice again) and the JS API are the same. With the
new parent and the old plugin **there is no notice** (it fails on the safe
side: nothing optional is loaded, but the site loses the notice). With the
new plugin and the old parent the parent's notice shows and the plugin steps
aside (there are not two).

- **Out**: `inc/consent.php` and `blocks/consent/` (notice, categories,
  cookie, `window.estrategiaWebConsent`, `estrategia-web:consent` event,
  `[estrategia_web_consent_settings]` shortcode, WP Consent API). All of
  that now lives in `armazon-wp-sitio/includes/class-consent.php` and
  `blocks/consent/`, with the same contract. Why: consent is functionality,
  not presentation; if a site changes theme it cannot be left without a
  notice, and Matomo, which belongs to the plugin, depends on it.
- **The footer block is now called `estrategia-web-site/consent`**
  (`parts/footer.html` already uses it). The plugin registers the old name
  `estrategia-web/consent` as a hidden alias, so already-saved content still
  renders the link; new content is written with the new name.
- **Styles:** the parent keeps none. The plugin ships a neutral base
  stylesheet that reads the `theme.json` tokens; the look with the parent is
  the same as before.
- **`estrategia-web/map` without the plugin**: static image or box, and «Ver
  mapa» loads that map on click. Its JS talks to the notice only through
  `window.estrategiaWebConsent?.` and the event, so it does not need it.
- **Tests:** out goes `tests/consent.test.mjs` (moves to the plugin, with
  hybrid Matomo against the real notice); `tests/map.test.mjs` tests the map
  WITHOUT the plugin (no notice and no `window.estrategiaWebConsent`, no
  errors, «Ver mapa» loads); `map-static` checks that without a notice the
  click loads only that map and leaves no cookie; the others no longer answer
  the notice. The test child stops declaring categories.

### 0.6.0 — 03-10-2026 (minor, with a visible change in the carousel)

- **Infinite carousel** (with `loop`, which was already the default). From
  the last slide it goes to the first CONTINUING in the same direction, and
  vice versa, without 0.5.0's rewind: arrows, keyboard, dots (the active one
  is that of the slide at the left edge), autoplay and the finger on mobile
  (scroll-snap). **No clones:** `view.js` rotates the slides with CSS
  `order` and corrects `scrollLeft` without animation when the track stops;
  the DOM does not change (neither nth-child, nor reading order, nor tab
  order). In a multi-row grid filled by rows (Lavandería's two-row client
  strip) it rotates by columns; an irregular layout rewinds like 0.5.0. With
  one slide or all of them in view, nothing. **Visible change:** looping
  carousels stop rewinding. **For the child:** a rule of its own with
  `order` on the slides loses against the parent's, and `:first-child` is no
  longer «the leftmost one» (the `:nth-child` ones stay attached to their
  slide). Details in the header of `blocks/carousel/render.php`.
- **Map: `showDetails` attribute** (default `true`). With `false` the block
  does not render its details box: for when the location's listing already
  shows the address alongside (on Lavandería it appeared twice). With a
  static image only the image remains, with «Ver mapa» and «Abrir en Google
  Maps» below; without an image, only the buttons (the frame appears when
  the map loads). No child needs touching; whoever wants it puts it in their
  pattern:
  `<!-- wp:estrategia-web/map {"showDetails":false,"metadata":{"bindings":{…}}} /-->`.
- **The «blue border» behind «Ver mapa» on Lavandería is not the parent's:**
  it is the child's button shadow (`styles.elements.button.shadow` →
  `:root :where(.wp-element-button, .wp-block-button__link)`), which the
  button inherits because it carries `wp-element-button`. It is removed in
  the child.
- Tests: `carousel-infinite.test.mjs` (frame by frame, without going back;
  real finger on mobile; two-row grid) and `map-details.test.mjs`, seen
  failing with 0.5.0 (and the grid one, with the first version of the
  infinite loop). `carousel-loop.test.mjs` now checks what is visible, not
  `scrollLeft`.

### 0.5.0 — 03-10-2026 (minor, with a visible change in the carousel)

- **Accordion: the text no longer «dances» on closing.** Cause: core leaves
  the closed panel with `padding: 0 !important` and the children give
  SIDE margin and padding only to the open one (Lavandería: `margin: … 24px;
  padding-right: 2.5rem`). On closing, that jumped in the first frame: the
  text widened, reflowed into fewer lines and moved while the height
  dropped (on Lavandería, from 268/704 to 244/792 px). Now the side spacing
  is retained until the panel finishes folding (a 0 s transition with a
  delay, only towards `[hidden]`); closing mirrors opening.
- **Looping carousel: `loop` attribute, default `true`.** «Next» on the last
  goes back to the first and «previous» on the first goes to the last (also
  ← →); both arrows always active. **Visible change:** already-saved
  carousels start wrapping around and their left arrow no longer appears
  grey on load; one that must end (steps of a process) is saved with
  `"loop":false`. Works the same with a `core/query` inside.
- **Static map: `staticMapUrl` and `staticMapId` attributes.** An
  OpenStreetMap image with a marker in the brand colour and «© OpenStreetMap»
  inside, made ONCE with `node tools/static-map.mjs` and stored in the child;
  it goes below the details box (which stays). It is only accepted if the
  site itself serves it. «Ver mapa» now also **grants «maps»** in the
  consent (`window.estrategiaWebConsent.grant`, new), so the rest of the
  maps load without asking.
- Tests: `accordion.test.mjs` (case 4, text still on closing),
  `carousel-loop.test.mjs` and `map-static.test.mjs`, all three seen failing
  with 0.4.0.

### 0.4.0 — 03-10-2026 (minor: no child needs touching)

- **`core/accordion` opens and closes by sliding.** The panel animates its
  height from 0 to its content's (and back), with its padding and margin,
  and the «+» rotates at the same pace. No JavaScript of its own: core's
  store still sets `hidden="until-found"`, `aria-expanded` and focus; the
  stylesheet (`assets/core-blocks/accordion.css`, loaded only where there is
  an accordion by `inc/core-blocks.php`) interpolates `block-size` with
  `interpolate-size` and delays `content-visibility` on closing. With
  «reduce motion», nothing. Without `interpolate-size` (Firefox, Safari) it
  opens at once, as before.
- **New tokens** in `settings.custom.motion`: `duration` (0.3s) and
  `easing`; a child changes them in its `theme.json`
  (`--wp--custom--motion--duration` / `--easing`).
- The trap for the child: a rule of its own with `transition` on the panel
  or the icon overrides the parent's (its stylesheets load later).
- Test: `tests/accordion.test.mjs` on `/prueba-acordeon/` (intermediate
  heights on opening and closing; none with «reduce motion»), seen failing
  without the stylesheet.

### 0.3.2 — 03-10-2026 (fix, no child needs touching)

- **The real fix for the squashed map: `inline-size: 100%`.** 0.3.1 did NOT
  fix it. A vertical WordPress Group aligns left (`align-items:flex-start`)
  and sizes its children by their content; the map frame has no in-flow
  content (its height comes from `aspect-ratio`), and if the child puts the
  map caption on top (absolute position), the measurement gives width 0 →
  height 0. With the map at full width, Lavandería's Autoservicio goes from
  −14.5 % to +0.5 % of the kit.
- **The trap, which cost a version:** 0.3.1's test put the map in a
  fixed-height container (a different bug, shrinking) and passed with a fix
  that did not work on the real site. Now it reproduces what WordPress
  renders and what the child does, and it has been seen failing without the
  fix.

### 0.3.1 — 03-10-2026 (INCOMPLETE fix: use 0.3.2)

- **`estrategia-web/map` no longer shrinks inside a vertical Group.** A
  vertical Group is a column flex, and a map with `overflow:hidden` (which a
  child sets to round the border) could get squashed down to 2 px and clip
  everything inside. Now it carries `flex: none`. Caught by Lavandería
  Mallorca's height comparison (Autoservicio came out 14 % shorter). Test:
  `tests/map-in-flex.test.mjs`, seen failing without the fix.

### 0.3.0 — 02-10-2026 (minor, with a visible change)

- **`estrategia-web/map` without a photo by default.** Before the click it
  shows a box with the place's details in text (new attributes
  `placeName`, `phone`, `hours`, besides `address`; all accept bindings),
  «Ver mapa» and «Abrir en Google Maps». With «maps» accepted, the iframe
  directly, as always. An image chosen in the block is still used.
- **Visible change compared to 0.2.0:** the post's featured image (inside a
  Query) is NO longer used on its own: `useFeaturedImage` has to be ticked.
  A child that relied on it loses it and sees the box.
- New test: `tests/map-card.test.mjs` (box without image, details, tel:
  link, no request to Google before the click).

### 0.2.0 — 02-10-2026 (minor: no child needs touching)

- **`estrategia-web/carousel` accepts a Query inside.** If a direct child of
  the carousel is a `core/query`, each `<li>` of its post-template is a
  slide (dots, arrows, keyboard and «End» count posts, not blocks). Useful
  for showing in a carousel a list that lives in the database —clients,
  reviews— without copying cards by hand. Already-saved carousels do not
  change: without a query, each direct child is still a slide. Limits
  (header of `blocks/carousel/render.php`): no pagination inside, the
  post-template a direct child of the query, and in the editor the query
  shows as a column. Test: `tests/carousel-query.test.mjs`.
- **`estrategia-web/map` inside a Query.** Its text attributes (address,
  embed URL, link, image) accept **Block Bindings**, and with no image
  chosen it uses the post's **featured image**. That way each location in a
  list gets its map. Test: `tests/map-query.test.mjs`.
- **`estrategia-web/whatsapp` accepts bindings** on number, message and
  label: the number can come from a plugin's company data instead of the
  `estrategia_web_whatsapp_phone` option, which keeps working the same.
- The list of bindable attributes is in `inc/blocks.php`
  (`estrategia_web_bindable_attributes`).

### 0.1.0 — 01-10-2026

- First version: templates, parts, base `theme.json` and the carousel, map,
  consent and WhatsApp modules.

## Names: from «Armazón» to «Estrategia Web» (1.0.0)

Up to 0.7.9 the theme was called **Armazón** (folder `armazon`). In 1.0.0
(07-10-2026) it became **Estrategia Web** so it could be published on
WordPress.org, which requires unique prefixes of 4 or more characters. The
0.x versions in «Versions» were published under the old name. The repo is
still at `E:\Repositories\armazon-wp-padre` (its folder is not renamed yet).

| What | Before | Now |
|---|---|---|
| Folder, slug and text domain | `armazon` | `estrategia-web` |
| Functions and constants | `armazon_…`, `ARMAZON_…` | `estrategia_web_…`, `ESTRATEGIA_WEB_…` |
| Blocks | `armazon/carousel`, `/map`, `/whatsapp`, `/language-switcher` | `estrategia-web/…` |
| Public CSS classes and properties | `.armazon-carousel__…`, `--armazon-…` | `.estrategia-web-carousel__…`, `--estrategia-web-…` |
| Options | `armazon_whatsapp_phone`, `armazon_whatsapp_message` | `estrategia_web_…` |
| Filters | `armazon_deferred_styles`, `armazon_preload_fonts`… | `estrategia_web_…` |

**Why the long prefix and not `ew-` or `estweb_`:** a single one for
everything (PHP, CSS, blocks, options), without thinking which one applies in
each place. Two letters are not unique; `estweb` cannot be read.

**The old names still render** during 1.x: `inc/legacy-names.php` registers
`armazon/…` as hidden aliases and reads the old options if the new ones are
missing. They are removed in **2.0.0**, once every site has run the migrator
(the one in the Estrategia Web Site plugin; on Lavandería,
`despliegue/migrar-a-estrategia-web.mjs`).

## If you change provider

- **Licence:** GPL v2 or later (`style.css`). The theme is yours to use,
  change and take to another provider, without asking permission.
- **If you change theme**, the content stays in WordPress, but the theme's
  blocks cease to exist. What you see without it:
  - **Carousel:** its children (images, columns or the Query) still show,
    one below the other, without arrows or dots. Readable.
  - **Map:** nothing shows (the address and the link are in block
    attributes). If the address matters, also put it as text.
  - **WhatsApp button** and **language selector:** they do not show.
  - The `estrategia-web-…` **classes** left in the markup do nothing without
    the theme's stylesheet: they do not break, they do not paint.
- **Export:** WordPress's Tools › Export takes pages, posts, patterns and
  menus with their blocks as they are. What the theme customises (templates
  or parts touched in the Site Editor) lives in the database as
  `wp_template` / `wp_template_part`; the child theme is a folder that is
  copied whole.

## Pending decisions

- **Repo remote (row 24):** no remote for now. It must be decided where it
  lives and how it reaches each site (zip per version or updater).
- **Child theme template:** separate repo yet to be created; meanwhile the
  minimum is `tests/fixtures/estrategia-web-hijo-prueba/`.
- **PHP build (row 6):** still open; this theme does not need it.
- **FAQ style for `core/accordion` (29-10-2026):** the «faq» block style
  (`is-style-faq`: rows with separators, a visible «+») lives in Lavandería's
  CHILD (`theme/assets/css/faq.css`, `styles/block/faq.json`). estrategiaweb.es
  now has two FAQ blocks (SEO plan) with the plain accordion, which looks
  bare. It moves here, with the child's brand values as presets, so every
  site gets it; then Lavandería's child keeps only its overrides. David: what
  applies to every site goes in the plugin or the parent theme.
