# Armazón — tema padre de WordPress

Tema padre **de bloques** común a todas las webs de David en WordPress. Cada web
tiene un **tema hijo** copiado de una plantilla, y el hijo es del proyecto desde
el primer día. La decisión y sus tres condiciones están en
`E:\Repositories\armazon\decisiones\2026-10-01-wordpress-tema-padre-compartido.md`.

- Requiere **WordPress 7.1** y **PHP 8.1**. Versión actual: **0.2.0**
  (notas de cambios en «Versiones», al final).
- Se instala en `wp-content/themes/armazon/` (el slug de carpeta es `armazon`:
  los hijos lo nombran en `Template: armazon`).
- Sin paso de compilación: ni `@wordpress/scripts` ni `node_modules`.

## Qué va aquí y qué no

| Va en el padre | Va en el hijo |
|---|---|
| plantillas y partes genéricas (`templates/`, `parts/`) | los colores, fuentes y medidas de la marca (redefiniendo los slugs de abajo) |
| `theme.json` base: escala de espaciado, tipografía fluida, paleta neutra, cortes de `viewport` | patrones (las secciones de la web), estilos de sección, plantillas propias |
| los módulos comunes como bloques: carrusel, mapa, consentimiento, WhatsApp | textos de la web, logotipo, páginas |
| sus traducciones (`languages/`) | qué categorías de cookies declara la web |

**Nada de ninguna marca ni de ningún proyecto.** Si algo solo lo usa una web, va
a su hijo. Caso frontera: un módulo que casi todas usan con variaciones va al
padre si las variaciones son **ajustes** (atributos, tokens); si son **otra
cosa**, al hijo.

## Estructura

    style.css            cabecera + lo que theme.json no expresa (foco, salto al contenido)
    theme.json           base v3: layout, viewport, paleta, espaciado, tipografía, partes
    functions.php        solo carga inc/*.php
    inc/                 setup.php · blocks.php · consent.php · whatsapp.php
    templates/           index, front-page, page, single, archive, search, 404
    parts/               header, footer, navigation-overlay
    patterns/            404, no-results (textos traducibles de las plantillas)
    blocks/<nombre>/     block.json + render.php (+ view.js, edit.js, style.css)
    languages/           armazon.pot · es_ES.po · es_ES.l10n.php
    tests/               pruebas de navegador + WordPress de pruebas (Playground)
    tools/i18n.mjs       extrae, fusiona y genera las traducciones

## La paleta y los presets que redefine un hijo

Los slugs son el contrato con los hijos: **un hijo cambia el color, nunca el
slug**. Renombrar o quitar un slug es versión **mayor** (rompe el contenido ya
guardado, que lleva `has-<slug>-color` escrito).

| Slug | Para qué | Valor en el padre |
|---|---|---|
| `base` | fondo de la página | `#ffffff` |
| `surface` | fondo alterno: bandas, tarjetas, pie | `#f4f4f4` |
| `contrast` | texto principal | `#1a1a1a` |
| `muted` | texto secundario | `#5c5c5c` |
| `border` | bordes y separadores | `#d6d6d6` |
| `primary` | color de marca: botones, enlaces | `#1a1a1a` |
| `on-primary` | texto sobre `primary` | `#ffffff` |
| `secondary` | segundo color de marca; hover de botones | `#4a4a4a` |
| `accent` | detalles, resaltados | `#2b2b2b` |

- **Espaciado** (`--wp--preset--spacing--N`, el slug es la medida en px):
  `8 16 24 32 48 64 80 120`; 80 y 120 son fluidos (`clamp`).
- **Tipografía**: familias `system` y `mono` (fuentes del sistema, nada que
  descargar); tamaños `small medium large x-large xx-large xxx-large`, fluidos
  de `large` para arriba.
- **Cortes** (`settings.viewport`): `mobile` 480px, `tablet` 782px, los de
  WordPress. Con ellos funcionan `@mobile` / `@tablet` en `theme.json` (7.1).

En el `theme.json` del hijo, `settings.color.palette` **sustituye** la lista
entera (no se fusiona por slug): el hijo repite los nueve slugs con sus colores.

## Cómo se crea un hijo

1. Copiar la plantilla de hijo (repo aparte; hasta que exista, el mínimo es el
   de `tests/fixtures/armazon-hijo-prueba/`): `style.css` con
   `Template: armazon` y su propio `Text Domain`.
2. `theme.json` del hijo: la paleta con los nueve slugs, fuentes de la marca,
   estilos de sección en `styles/`.
3. `functions.php` del hijo, si la web tiene cookies opcionales:

       add_filter( 'armazon_consent_categories', fn() => array( 'statistics' ) );

   Si no declara ninguna, **no sale aviso de cookies**, que es lo normal (ver
   el módulo de consentimiento).
4. Número de WhatsApp de la web: `wp option update armazon_whatsapp_phone 34600111222`.
5. Lo que el hijo NO hace: copiar carpetas de `blocks/` del padre (ver la trampa
   en `inc/blocks.php`) ni llamar a funciones `armazon_*` fuera de un hook (el
   `functions.php` del hijo se carga ANTES que el del padre).

## Cómo se versiona y se actualiza

Versionado semántico en la cabecera de `style.css` (y en `block.json` de cada
bloque que cambie). Cada versión lleva su etiqueta git y su nota de cambios.

- **Menor / parche**: no obliga a tocar ningún hijo. Atributos nuevos siempre
  con `default`; los bloques son dinámicos (`render.php`), así que cambiar su
  marcado no invalida lo guardado.
- **Mayor**: lo que rompa a un hijo (renombrar un slug, quitar un atributo o
  un filtro). Va con una nota de qué cambiar en el hijo.
- **El hijo funciona aunque el padre no se actualice**: nadie sube de versión
  el mismo día.

Paquete para instalar, sin pruebas ni herramientas (`.gitattributes`):

    git archive --format=zip --prefix=armazon/ -o armazon-0.1.0.zip v0.1.0

**La trampa del despliegue:** lo que se toca en el Site Editor se guarda en la
base de datos y **pisa los ficheros del tema**, también los del padre. Una
actualización del padre no se ve en una web con esa parte personalizada. Antes
de cada despliegue se miran y se borran esas personalizaciones. Y `theme.json`
se cachea: en local, `WP_DEVELOPMENT_MODE='theme'`.

## Los módulos y cómo se mantiene cada uno

La documentación completa de cada uno (decisiones, quién, cuándo, caso
frontera y la trampa) está **en la cabecera de su `render.php`** (o de
`inc/consent.php`), que es donde aterriza quien lo toque. Aquí, el resumen.

| Bloque | Qué hace | Editor | Comportamiento |
|---|---|---|---|
| `armazon/carousel` | fila desplazable con scroll-snap; flechas, puntos opcionales, cuántos visibles por ancho; autoplay solo si se pide; con un `core/query` dentro, cada entrada es una diapositiva (0.2.0) | `edit.js` clásico (InnerBlocks) | Interactivity API (`view.js`) |
| `armazon/map` | imagen + dirección; el iframe de Google solo tras «Ver mapa» o con «maps» aceptado; enlace «Abrir en Google Maps» | `edit.js` clásico (selector de la mediateca) + ServerSideRender | Interactivity API |
| `armazon/consent` | botón «Configurar cookies» para el pie; el aviso lo pinta `inc/consent.php` en `wp_footer` | `autoRegister` (sin JS de editor) | Interactivity API |
| `armazon/whatsapp` | enlace flotante a `wa.me` con mensaje; número del bloque o de la opción del sitio | `autoRegister` | ninguno (es un enlace) |

**Por qué `edit.js` clásico y no un módulo:** WordPress 7.1 no admite módulos
ES como `editorScript` (no hay `editorScriptModule`). Sin compilación, lo que
queda es un script clásico con los globales `wp.*` y `createElement` en vez de
JSX. Sus dependencias están en `edit.asset.php`, **escrito a mano**, igual que
los `view.asset.php` de los módulos. Los bloques sin InnerBlocks ni mediateca
usan `supports.autoRegister` (7.0): el editor los pinta con ServerSideRender y
genera los controles; sus etiquetas traducidas salen de `labels.php`.

**Ámbito del CSS:** prefijo de clase por bloque (`.armazon-carousel__…`), que
es la convención de los bloques de WordPress, y no `@scope` (fila 1 del
Armazón, pensada para custom elements). Colores y medidas, siempre tokens.

**Consentimiento, en una línea:** con Matomo sin cookies (fila 16) y mapas en
dos clics, la mayoría de webs no declaran ninguna categoría y no muestran aviso.
API para el hijo: `armazon_consent_has()` en PHP (cuidado con la caché de
página), `window.armazonConsent` y el evento `armazon:consent` en JS, y
`<script type="text/plain" data-armazon-consent="statistics">` para scripts que
solo deben ejecutarse con consentimiento. Compatible con la WP Consent API si
está activa, sin depender de ella.

## Textos y traducciones (fila 11)

`msgid` en inglés en el código (`__()`, `_x()`, `wp.i18n.__`), dominio
`armazon`. Se traduce en `languages/es_ES.po` y se regenera:

    node tools/i18n.mjs

Que actualiza `armazon.pot`, fusiona el `.po` y genera `es_ES.l10n.php` (formato
PHP de WordPress 6.5+, sin `.mo`). El editor recibe las mismas traducciones
(`inc/blocks.php`), así que no hay JSON por script. **Dentro de un tema el
fichero se llama por el locale (`es_ES.l10n.php`), no `armazon-es_ES`**: con el
nombre largo está, pesa lo que toca y no se carga (ver `inc/setup.php`).

## Pruebas (fila 7)

    node tests/run.mjs                 levanta WordPress 7.1, corre todo y lo para
    node tests/server.mjs              solo el WordPress, para mirarlo:
                                       http://127.0.0.1:9401/prueba-modulos/
    ARMAZON_BASE_URL=http://127.0.0.1:9401 node tests/run.mjs carousel

Todas son de **nivel 3** (navegador, Playwright tomado de `portal-hs`) y cada
una dice por qué en su primera línea. El WordPress de pruebas activa el **hijo
de prueba**, así que todo se prueba con el padre funcionando como padre.

Trampas de Playground en Windows, todas medidas el 01-10-2026 y detalladas en
la cabecera de `tests/server.mjs`: `--mount=E:/…:/…` no vale (se usa
`--mount-dir`); desde Git Bash, MSYS convierte `/wordpress` en una ruta de
Windows sin dar error; el `--login` no sirve a un navegador nuevo; las rutas
bonitas inexistentes devuelven la portada con 200 (el 404 se prueba con
`?name=`); y matar el padre no mata a los hijos (`taskkill /T`).

## Versiones

Una entrada por versión, la más nueva arriba: qué cambia y si obliga a tocar
algún hijo. Quien suba la versión (cabecera de `style.css` y `version` del
`block.json` que cambie) escribe aquí su entrada en el mismo commit.

### 0.2.0 — 02-10-2026 (menor: no obliga a tocar ningún hijo)

- **`armazon/carousel` acepta una Consulta dentro.** Si un hijo directo del
  carrusel es un `core/query`, cada `<li>` de su post-template es una
  diapositiva (puntos, flechas, teclado y «Fin» cuentan entradas, no
  bloques). Sirve para pasar en carrusel una lista que vive en la base de
  datos —clientes, opiniones— sin copiar fichas a mano. Los carruseles ya
  guardados no cambian: sin consulta, cada hijo directo sigue siendo una
  diapositiva. Límites (cabecera de `blocks/carousel/render.php`): sin
  paginación dentro, el post-template hijo directo de la consulta, y en el
  editor la consulta se ve en columna. Prueba: `tests/carousel-query.test.mjs`.

### 0.1.0 — 01-10-2026

- Primera versión: plantillas, partes, `theme.json` base y los módulos
  carrusel, mapa, consentimiento y WhatsApp.

## Decisiones pendientes

- **Remoto del repo (fila 24):** sin remoto por ahora. Hay que decidir dónde
  vive y cómo llega a cada web (zip por versión o actualizador).
- **Plantilla del tema hijo:** repo aparte por crear; mientras tanto el mínimo
  es `tests/fixtures/armazon-hijo-prueba/`.
- **Build de PHP (fila 6):** sigue abierta; este tema no lo necesita.
