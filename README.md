# Armazón — tema padre de WordPress

Tema padre **de bloques** común a todas las webs de David en WordPress. Cada web
tiene un **tema hijo** copiado de una plantilla, y el hijo es del proyecto desde
el primer día. La decisión y sus tres condiciones están en
`E:\Repositories\armazon\decisiones\2026-10-01-wordpress-tema-padre-compartido.md`.

- Requiere **WordPress 7.1** y **PHP 8.1**. Versión actual: **0.7.7**
  (notas de cambios en «Versiones», al final).
- **El aviso de cookies NO está aquí desde la 0.7.0**: es del plugin
  **Armazón Sitio** (`armazon-wp-sitio`, 0.5.0 o superior). Una web con
  cookies opcionales necesita ese plugin; sin él no hay aviso, y el mapa
  sigue funcionando en dos clics.
- Se instala en `wp-content/themes/armazon/` (el slug de carpeta es `armazon`:
  los hijos lo nombran en `Template: armazon`).
- Sin paso de compilación: ni `@wordpress/scripts` ni `node_modules`.

## Qué va aquí y qué no

| Va en el padre | Va en el hijo |
|---|---|
| plantillas y partes genéricas (`templates/`, `parts/`) | los colores, fuentes y medidas de la marca (redefiniendo los slugs de abajo) |
| `theme.json` base: escala de espaciado, tipografía fluida, paleta neutra, cortes de `viewport` | patrones (las secciones de la web), estilos de sección, plantillas propias |
| los módulos comunes como bloques: carrusel, mapa, WhatsApp | textos de la web, logotipo, páginas |
| sus traducciones (`languages/`) | qué categorías de cookies declara la web (filtro del plugin) |

**Lo que funciona y se guarda, aunque se vea en todas las webs, NO va aquí**:
va al plugin Armazón Sitio, porque una web que cambie de tema no puede
perderlo. Es el caso del aviso de cookies (se fue en la 0.7.0): el padre no
le pone ningún estilo propio, porque el plugin trae una hoja neutra que lee
los tokens de `theme.json` (`base`, `contrast`, `border`, espaciado, tamaños);
los colores del padre y del hijo le llegan solos. Un hijo que quiera otro
aspecto lo afina con CSS sobre `.armazon-consent` en su propia hoja.

**Nada de ninguna marca ni de ningún proyecto.** Si algo solo lo usa una web, va
a su hijo. Caso frontera: un módulo que casi todas usan con variaciones va al
padre si las variaciones son **ajustes** (atributos, tokens); si son **otra
cosa**, al hijo.

## Estructura

    style.css            cabecera + lo que theme.json no expresa (foco, salto al contenido, anclas); lo encola el padre
    theme.json           base v3: layout, viewport, paleta, espaciado, tipografía, partes
    functions.php        solo carga inc/*.php
    inc/                 setup.php · blocks.php · core-blocks.php · whatsapp.php
    assets/core-blocks/  comportamiento común de bloques del núcleo (accordion.css), uno por bloque
    templates/           index, front-page, page, single, archive, search, 404
    parts/               header, footer, navigation-overlay
    patterns/            404, no-results (textos traducibles de las plantillas)
    blocks/<nombre>/     block.json + render.php (+ view.js, edit.js, style.css)
    languages/           armazon.pot · es_ES.po · es_ES.l10n.php
    tests/               pruebas de navegador + WordPress de pruebas (Playground)
    tools/i18n.mjs       extrae, fusiona y genera las traducciones
    tools/static-map.mjs imagen estática de un mapa (OpenStreetMap) para armazon/map

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
3. `functions.php` del hijo, si la web tiene cookies opcionales (el aviso es
   del plugin Armazón Sitio 0.5.0+, que tiene que estar activo):

       add_filter( 'armazon_consent_categories', fn( $c ) => array_merge( (array) $c, array( 'maps' ) ) );

   Si no declara ninguna, **no sale aviso de cookies**, que es lo normal. El
   enlace «Configurar cookies» es el bloque `armazon-site/consent` (lo lleva
   `parts/footer.html`; sin el plugin no pinta nada).
4. Número de WhatsApp de la web: `wp option update armazon_whatsapp_phone 34600111222`.
5. Lo que el hijo NO hace: copiar carpetas de `blocks/` del padre (ver la trampa
   en `inc/blocks.php`) ni llamar a funciones `armazon_*` fuera de un hook (el
   `functions.php` del hijo se carga ANTES que el del padre).

## Transiciones entre páginas (0.7.5)

Al pasar de una página a otra, la nueva entra con un fundido de 0,22 s
(View Transitions entre documentos, solo CSS: `assets/view-transitions.css`,
que `inc/view-transitions.php` mete en línea detrás de `style.css`). La
cabecera y el botón de WhatsApp del pie se quedan quietos. Con «reducir
movimiento», sin transición. Navegadores sin soporte (Firefox, hoy) cambian
de página como siempre.

Un hijo la afina o la apaga en su `theme.json`:

    "settings": { "custom": { "motion": { "page": {
        "enabled": true,       false: no se imprime nada
        "duration": "0.22s",   el fundido de la página
        "easing": "ease"
    } } } }

**Si la cabecera del hijo es un elemento `position: fixed` dentro del
`<header>` de la plantilla** (Lavandería: `.lm-header`), ese elemento lleva la
clase **`armazon-vt-header`**; sin ella la cabecera desaparece a mitad de
transición (el `<header>` mide 0 de alto y su captura sale vacía; medido el
06-10-2026). El aviso de cookies no participa: se nombra él mismo en
Armazón Sitio 0.5.1. Las decisiones y las trampas, en la cabecera de la hoja.

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
frontera y la trampa) está **en la cabecera de su `render.php`**, que es donde
aterriza quien lo toque. Aquí, el resumen.

| Bloque | Qué hace | Editor | Comportamiento |
|---|---|---|---|
| `armazon/carousel` | fila desplazable con scroll-snap; flechas, puntos opcionales, cuántos visibles por ancho; autoplay solo si se pide; con un `core/query` dentro, cada entrada es una diapositiva (0.2.0); en bucle por defecto (`loop`, 0.5.0), infinito sin clones desde 0.6.0; cada paso desliza, también con una sola de más (0.7.2); fotos con prioridad en las que se ven al cargar, diferidas las demás y `sizes` del ancho de la diapositiva, o el del atributo `imageSizes` (0.7.4, `inc/carousel-images.php`) | `edit.js` clásico (InnerBlocks) | Interactivity API (`view.js`) |
| `armazon/map` | imagen + dirección; el iframe de Google solo tras «Ver mapa» o con «maps» aceptado; enlace «Abrir en Google Maps»; sin foto, recuadro con los datos del sitio (0.3.0); mapa estático de OSM bajo el recuadro (`staticMapUrl`, 0.5.0); sin recuadro de datos si la ficha ya los dice al lado (`showDetails:false`, 0.6.0); dentro de una Consulta, datos por bindings (0.2.0) | `edit.js` clásico (selector de la mediateca) + ServerSideRender | Interactivity API |
| `armazon/whatsapp` | enlace flotante a `wa.me` con mensaje; número del bloque o de la opción del sitio | `autoRegister` | ninguno (es un enlace) |
| `armazon/language-switcher` | idioma actual («ES») en un botón con `aria-expanded` y la lista de los demás idiomas (enlaces a la misma página traducida, con `hreflang` y `lang`); los da WPML (`wpml_active_languages`); **sin WPML o con un solo idioma no pinta nada** (0.7.6) | `autoRegister` (atributo `display`: código o nombre; `layout`: `dropdown`, por defecto, o `inline`, «EN – ES» en línea sin desplegable, 0.7.7) | Interactivity API: abre, cierra con Escape (foco al botón) y al pulsar fuera |
| `core/accordion` (del núcleo) | abrir y cerrar deslizando, con tokens de movimiento (0.4.0); la respuesta funde y sube, el «+» gira 135° (0.7.3); la hoja dice la técnica y la trampa | el del núcleo | el store del núcleo + `assets/core-blocks/accordion.css` |

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

**Consentimiento, en una línea:** es del plugin Armazón Sitio desde la 0.7.0
(su `includes/class-consent.php` lo documenta entero), con el mismo contrato
que tenía aquí. El padre solo lo USA, y solo por JS: `armazon/map` mira
`window.armazonConsent?.has( 'maps' )`, escucha `armazon:consent` y, al pulsar
«Ver mapa», llama a `window.armazonConsent?.grant( 'maps' )`. Sin el plugin,
esas llamadas no hacen nada y el mapa va en dos clics (`tests/map.test.mjs`).

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

### 0.7.7 — 06-10-2026 (nuevo, no obliga a tocar ningún hijo)

- `armazon/language-switcher` gana `"layout":"inline"`: todos los idiomas en
  línea, «EN – ES», el actual con `aria-current` y en negrita y el resto
  enlazados con `hreflang`; sin desplegable ni JS. Para el menú del móvil
  (David, en Lavandería: «el selector de idioma en mobile es feo, puedes poner
  EN - ES (sin desplegable)»). Sin el atributo, sigue el desplegable.

### 0.7.6 — 06-10-2026 (nuevo, no obliga a tocar ningún hijo)

- **Bloque `armazon/language-switcher`**, el selector de idioma para webs con
  WPML (el «ES ▾» de la cabecera de Lavandería, que lo tenía en su hijo como
  `<details>` y ahora usa este). Botón con `aria-expanded`/`aria-controls` y
  lista de enlaces con `hreflang` y `lang`, cada idioma con su nombre en su
  idioma. Sin WPML, o con un solo idioma activo, no pinta nada: se puede dejar
  en la cabecera de cualquier hijo. El hijo pone el aspecto sobre
  `.armazon-language` (y la flecha, en `.armazon-language__toggle::after`).
  Decisiones, caso frontera y trampas, en la cabecera de su `render.php`.
- **Pruebas:** no hay prueba aquí. El padre de pruebas no tiene WPML (es de
  pago; no se monta en un repo compartido), y sin WPML el bloque no pinta
  nada. Lo prueba con WPML de verdad `tests/language-switcher.test.mjs` de
  Lavandería (nivel 3: cada página con su pareja, el selector lleva a ella,
  `aria-expanded` cambia, Escape cierra).

### 0.7.5 — 06-10-2026 (nuevo, no obliga a tocar ningún hijo)

- **Transiciones entre páginas** con View Transitions entre documentos, solo
  CSS (sección «Transiciones entre páginas»): fundido de la página, cabecera
  (`armazon-header`) y WhatsApp del pie (`armazon-whatsapp`) quietos, nada
  con «reducir movimiento». Tokens `settings.custom.motion.page`
  (`enabled`, `duration`, `easing`).
- **Clase `armazon-vt-header`** para un hijo con la cabecera fija dentro del
  `<header>` de la plantilla. Lavandería la necesita en `.lm-header`; sin
  ella funciona, pero la cabecera parpadea.
- **Pruebas:** `tests/view-transitions.test.mjs` (nivel 3): la navegación
  de `/prueba-modulos/` a la portada llega con `viewTransition` en
  `pagereveal`, la regla está, los nombres no se repiten y con «reducir
  movimiento» no hay transición. Vista fallar antes del CSS, y con un
  mutante sin el `@media` de «reducir movimiento». La primera versión nombraba
  `.armazon-whatsapp` a secas y la prueba la pilló: la página de pruebas tiene
  dos y un nombre repetido aborta la transición.

### 0.7.4 — 06-10-2026 (arreglo, no obliga a tocar ningún hijo)

- **Las fotos del carrusel cargan según lo que se ve.** De la auditoría de
  Lavandería: en escritorio la imagen LCP del inicio era la diapositiva 2 y
  solo la 1 llevaba `fetchpriority="high"`. Ahora, si WordPress decide que
  el carrusel es lo primero de la página (da prioridad a una de sus fotos),
  todas las diapositivas que se pueden ver al cargar —`ceil` del mayor
  `perView`— llevan `fetchpriority="high"` y ninguna `loading="lazy"`; las
  demás van diferidas y con `sizes="auto, …"`. Un carrusel más abajo no
  recibe prioridad. Medido en Lavandería: a 402 se ve la 1; a 1512, la 1,
  la 2 y la 3.
- **`sizes` del ancho de la diapositiva**, no de la ventana: sale de
  `perView` y del ancho del carrusel (`100vw` si es `align: full`; si no,
  `wideSize` o `contentSize`). Antes todas llevaban el de WordPress,
  `(max-width: 1920px) 100vw`, y en uno de tres a la vista se bajaba la de
  1536 para un hueco de ~500.
- **Atributo nuevo `imageSizes`** (texto, vacío por defecto): un hijo que
  pinta las diapositivas a otro ancho que el de `perView` escribe ahí su
  `sizes`. También los filtros `armazon_carousel_image_sizes` y
  `armazon_carousel_eager_slides`. Cómo funciona y las dos trampas, en la
  cabecera de `inc/carousel-images.php`.
- **Pruebas:** `tests/carousel-images.test.mjs` (nivel 3, página nueva
  `/prueba-carrusel-fotos/` con fotos de verdad generadas en la siembra),
  vista fallar contra la 0.7.3: «Foto 2 (diapositiva 2, visible al cargar)
  sin fetchpriority="high"».

### 0.7.3 — 06-10-2026 (arreglo, no obliga a tocar ningún hijo)

- **El FAQ (`core/accordion`) ya no «da un salto el texto».** David, en
  Lavandería, con la web de Miquel Capellà i Associats como modelo. Lo que
  hace el modelo, medido fotograma a fotograma: todo en 0,25 s ease-in-out;
  el alto crece, la respuesta pasa de opacidad 0 a 1 subiendo desde abajo y
  el «+» gira 135°. Lo que hacía el nuestro: la respuesta salía a opacidad 1
  desde el primer fotograma y, ya entera, subía 8 px (el `margin-top:
  -0.5rem` que el hijo da al panel abierto, animándose de 0 a -8): se veía
  recolocarse. Ahora los hijos del panel funden y suben (`@starting-style`
  al abrir) con la misma curva que el alto y el margen, así que ese
  desplazamiento ocurre mientras la respuesta aparece y en un solo sentido;
  al cerrar, lo mismo al revés. El alto de la pregunta solo crece o solo
  mengua, y el texto no cambia de x ni de líneas (lo de la 0.5.0 sigue).
- **Tokens nuevos** en `settings.custom.motion.accordion`: `duration`
  (0.25s), `easing` (ease-in-out), `rise` (1rem, cuánto sube la respuesta)
  y `turn` (135deg, el giro del icono abierto; con «+» acaba en «×» como
  con los 45° del núcleo). Un hijo con una flecha por icono pone su `turn`.
- **Anclas de la misma página: el salto desliza** (`scroll-behavior:
  smooth` en el raíz, salvo con «reducir movimiento») **y el destino queda
  bajo la cabecera fija**: `scroll-padding-top` = el token
  `--wp--custom--layout--cabecera` del hijo (0 si no lo tiene) más la barra
  de administración. Sin JavaScript: al entrar con `#ancla` en la URL,
  Chromium también desliza y respeta el relleno. La regla va con `:root` y
  pisa el `html { scroll-padding-top }` que ya tenía Lavandería (mismo
  valor, más la barra); el hijo puede quitar la suya.
- **El padre encola su `style.css`** (handle `armazon-style`). Hasta ahora
  solo llegaba si el hijo lo encolaba: el hijo de prueba no lo hacía y se
  quedaba sin foco visible ni salto al contenido. Lavandería lo encola con
  ese mismo handle, así que no sale dos veces.
- **Pruebas:** `accordion.test.mjs` rehecha (abrir y cerrar con los márgenes
  de Lavandería: alto monótono, texto quieto en x y líneas, opacidad que
  solo sube o baja, movimiento en un solo sentido; teclado y foco; giro de
  135°), vista fallar con la 0.7.2 («sale ya con opacidad 1»; «el + está a
  45°»). `anchors.test.mjs` nueva sobre `/prueba-anclas/` (cabecera fija de
  80 px que el hijo de prueba pone solo allí): clic que pasa por posiciones
  intermedias sin retroceder, destino a la vista al pulsar y al entrar con
  el hash, salto seco con «reducir movimiento»; vista fallar con la 0.7.2
  («0 2631»: un solo salto). Comprobado también contra el WordPress local
  de Lavandería (`/autoservicio/` y `#pasos`, a 1280 y a 390).

### 0.7.2 — 06-10-2026 (arreglo, no obliga a tocar ningún hijo)

- **El carrusel infinito desliza en vez de saltar.** David, en la portada
  de Lavandería: «el carrusel necesita una animación, va a saltos». Causa,
  medida fotograma a fotograma: con solo UNA diapositiva de más (3 fotos y
  2,4 a la vista) ninguna rotación de `order` deja desplazar una entera, y
  `view.js` caía en «rotar y scrollLeft = 0 de golpe»: el cambio entero en un
  fotograma, con «siguiente» y con «anterior». Ahora `glide()` rota y anima
  cada diapositiva con transform desde donde estaba; la que da la vuelta
  entra por un lado mientras una copia temporal e inerte sale por el otro
  (se quita al acabar). Los pasos pulsados mientras anima se encolan.
- **Pulsando seguido en una pista que sí desplaza** ya no hay tirón: la
  corrección instantánea de scrollLeft caía en el anclaje de scroll-snap más
  cercano. Ahora la pista va sin snap durante la animación propia y se
  mantiene la rotación si ya permite el viaje.
- Con «reducir movimiento» sigue sin animación: la diapositiva cambia una
  vez, sin ida y vuelta.
- **Pruebas:** `tests/carousel-glide.test.mjs` (nueva, vista fallar con la
  0.7.1) exige en cada paso al menos 3 fotogramas intermedios, ninguno que
  avance más de media diapositiva ni que retroceda, y llegar a la que toca;
  a 1200 y a 402, dando la vuelta y con tres clics seguidos. Siembra: el
  «Carrusel con una de más» en /prueba-carrusel-bucle/.

### 0.7.1 — 05-10-2026 (arreglo, no obliga a tocar ningún hijo)

- **`armazon/whatsapp` respeta el margen seguro del móvil**: la distancia a
  la esquina es `--armazon-whatsapp-offset` MÁS `env(safe-area-inset-*)`
  (abajo y el lado de su esquina), para que con `viewport-fit=cover` no
  quede bajo la barra de gestos o la muesca. Sin eso, env() vale 0 y el
  botón queda donde estaba. La esquina ya se elegía con el atributo
  `position` (`bottom-right` por defecto, o `bottom-left`); no cambia.
- Un hijo que mueva el botón lo hace con la variable, no con `inset-*`: si
  no, pierde el margen seguro (cabecera de `blocks/whatsapp/style.css`).
- **Pruebas:** `tests/whatsapp.test.mjs` mira en la hoja que las tres
  distancias llevan su `safe-area-inset-*` (en un Chromium de escritorio
  env() vale 0 y el estilo calculado no lo distingue).

### 0.7.0 — 05-10-2026 (el aviso de cookies se va al plugin: OBLIGA a instalar Armazón Sitio 0.5.0)

Lo que hay que hacer en cada web: **actualizar a la vez el padre a 0.7.0 y
Armazón Sitio a 0.5.0**. Nada más: el filtro `armazon_consent_categories`
del hijo, la cookie (quien ya eligió no vuelve a ver el aviso) y la API JS
son los mismos. Con el padre nuevo y el plugin viejo **no hay aviso** (falla
del lado seguro: nada opcional se carga, pero la web pierde el aviso). Con
el plugin nuevo y el padre viejo sale el aviso del padre y el plugin se
aparta (no hay dos).

- **Fuera**: `inc/consent.php` y `blocks/consent/` (aviso, categorías,
  cookie, `window.armazonConsent`, evento `armazon:consent`, shortcode
  `[armazon_consent_settings]`, WP Consent API). Todo eso vive ahora en
  `armazon-wp-sitio/includes/class-consent.php` y `blocks/consent/`, con el
  mismo contrato. Por qué: el consentimiento es funcionalidad, no
  presentación; si una web cambia de tema no puede quedarse sin aviso, y
  Matomo, que es del plugin, depende de él.
- **El bloque del pie se llama ahora `armazon-site/consent`**
  (`parts/footer.html` ya lo usa). El nombre viejo `armazon/consent` lo
  registra el plugin como alias oculto, así que el contenido ya guardado
  sigue pintando el enlace; lo nuevo se escribe con el nombre nuevo.
- **Estilos:** el padre no conserva ninguno. El plugin trae una hoja base
  neutra que lee los tokens de `theme.json`; el aspecto con el padre es el
  mismo que antes.
- **`armazon/map` sin el plugin**: imagen estática o recuadro y «Ver mapa»
  carga ese mapa al pulsar. Su JS habla con el aviso solo por
  `window.armazonConsent?.` y el evento, así que no le hace falta.
- **Pruebas:** fuera `tests/consent.test.mjs` (pasa al plugin, con Matomo
  híbrido contra el aviso real); `tests/map.test.mjs` prueba el mapa SIN el
  plugin (ni aviso ni `window.armazonConsent`, sin errores, «Ver mapa»
  carga); `map-static` comprueba que sin aviso el clic carga solo ese mapa y
  no deja cookie; las demás ya no contestan el aviso. El hijo de prueba deja
  de declarar categorías.

### 0.6.0 — 03-10-2026 (menor, con un cambio visible en el carrusel)

- **Carrusel infinito** (con `loop`, que ya era el valor por defecto). De la
  última se pasa a la primera SIGUIENDO en la misma dirección, y al revés,
  sin el rebobinado de la 0.5.0: flechas, teclado, puntos (el activo es el
  de la diapositiva del borde izquierdo), autoplay y el dedo en móvil
  (scroll-snap). **Sin clones:** `view.js` rota las diapositivas con
  `order` de CSS y corrige `scrollLeft` sin animación cuando la pista se
  para; el DOM no cambia (ni nth-child, ni lectura, ni tabulador). En una
  rejilla de varias filas llenada por filas (la franja de clientes de dos
  filas de Lavandería) rota por columnas; una disposición irregular
  rebobina como la 0.5.0. Con una diapositiva o todas a la vista, nada.
  **Cambio visible:** los carruseles con bucle dejan de rebobinar. **Para
  el hijo:** una regla suya con `order` sobre las diapositivas pierde contra
  la del padre, y `:first-child` ya no es «la de la izquierda» (las de
  `:nth-child` siguen pegadas a su diapositiva). Detalle en la cabecera de
  `blocks/carousel/render.php`.
- **Mapa: atributo `showDetails`** (por defecto `true`). Con `false` el
  bloque no pinta su recuadro de datos: para cuando la ficha de la sede ya
  dice la dirección al lado (en Lavandería salía dos veces). Con imagen
  estática queda solo la imagen y debajo «Ver mapa» y «Abrir en Google
  Maps»; sin imagen, solo los botones (el marco aparece al cargar el mapa).
  No obliga a tocar ningún hijo; quien lo quiera lo pone en su patrón:
  `<!-- wp:armazon/map {"showDetails":false,"metadata":{"bindings":{…}}} /-->`.
- **El «borde azul» detrás de «Ver mapa» en Lavandería no es del padre:**
  es la sombra de botón del hijo (`styles.elements.button.shadow` →
  `:root :where(.wp-element-button, .wp-block-button__link)`), que el botón
  hereda por llevar `wp-element-button`. Se quita en el hijo.
- Pruebas: `carousel-infinite.test.mjs` (fotograma a fotograma, sin
  retroceder; dedo real en móvil; rejilla de dos filas) y
  `map-details.test.mjs`, vistas fallar con la 0.5.0 (y la de la rejilla,
  con la primera versión del infinito). `carousel-loop.test.mjs` mira ahora
  lo que se ve, no `scrollLeft`.

### 0.5.0 — 03-10-2026 (menor, con un cambio visible en el carrusel)

- **Acordeón: el texto ya no «baila» al cerrar.** Causa: el núcleo deja el
  panel cerrado con `padding: 0 !important` y los hijos dan margen y relleno
  LATERAL solo al abierto (Lavandería: `margin: … 24px; padding-right:
  2.5rem`). Al cerrar, eso saltaba en el primer fotograma: el texto se
  ensanchaba, se reajustaba en menos líneas y se movía mientras la altura
  bajaba (en Lavandería, de 268/704 a 244/792 px). Ahora lo lateral se
  retiene hasta que el panel termina de plegarse (transición de 0 s con
  retraso, solo hacia `[hidden]`); el cierre es el espejo de la apertura.
- **Carrusel en bucle: atributo `loop`, por defecto `true`.** «Siguiente» en
  la última vuelve a la primera y «anterior» en la primera va a la última
  (también ← →); las dos flechas siempre activas. **Cambio visible:** los
  carruseles ya guardados pasan a dar la vuelta y su flecha izquierda deja de
  salir gris al cargar; uno que deba terminar (pasos de un proceso) se guarda
  con `"loop":false`. Funciona igual con un `core/query` dentro.
- **Mapa estático: atributos `staticMapUrl` y `staticMapId`.** Una imagen de
  OpenStreetMap con marcador del color de la marca y «© OpenStreetMap»
  dentro, hecha UNA vez con `node tools/static-map.mjs` y guardada en el
  hijo; va debajo del recuadro de datos (que se mantiene). Solo se acepta si
  la sirve el propio sitio. «Ver mapa» ahora además **concede «maps»** en el
  consentimiento (`window.armazonConsent.grant`, nuevo), así el resto de
  mapas cargan sin preguntar.
- Pruebas: `accordion.test.mjs` (caso 4, texto quieto al cerrar),
  `carousel-loop.test.mjs` y `map-static.test.mjs`, las tres vistas fallar
  con la 0.4.0.

### 0.4.0 — 03-10-2026 (menor: no obliga a tocar ningún hijo)

- **`core/accordion` abre y cierra deslizando.** El panel anima su altura de
  0 a la de su contenido (y al revés), con su relleno y su margen, y el «+»
  gira al mismo ritmo. Sin JavaScript propio: el store del núcleo sigue
  poniendo `hidden="until-found"`, `aria-expanded` y el foco; la hoja
  (`assets/core-blocks/accordion.css`, cargada solo donde hay acordeón por
  `inc/core-blocks.php`) interpola `block-size` con `interpolate-size` y
  retrasa el `content-visibility` al cerrar. Con «reducir movimiento», nada.
  Sin `interpolate-size` (Firefox, Safari) se abre de golpe, como antes.
- **Tokens nuevos** en `settings.custom.motion`: `duration` (0.3s) y
  `easing`; un hijo los cambia en su `theme.json`
  (`--wp--custom--motion--duration` / `--easing`).
- La trampa para el hijo: una regla suya con `transition` sobre el panel o
  el icono pisa la del padre (sus hojas cargan después).
- Prueba: `tests/accordion.test.mjs` sobre `/prueba-acordeon/` (alturas
  intermedias al abrir y al cerrar; ninguna con «reducir movimiento»), vista
  fallar sin la hoja.

### 0.3.2 — 03-10-2026 (arreglo, no obliga a tocar ningún hijo)

- **El arreglo de verdad del mapa aplastado: `inline-size: 100%`.** La 0.3.1
  NO lo arreglaba. Un Grupo vertical de WordPress alinea a la izquierda
  (`align-items:flex-start`) y mide a sus hijos por su contenido; el marco del
  mapa no tiene contenido en flujo (su alto sale de `aspect-ratio`), y si el
  hijo pone el pie del mapa encima (posición absoluta), la medición da ancho
  0 → alto 0. Con el mapa a todo el ancho, Autoservicio de Lavandería pasa de
  −14,5 % a +0,5 % del kit.
- **La trampa, que costó una versión:** la prueba de la 0.3.1 metía el mapa en
  un contenedor de alto fijo (otro fallo, encogerse) y pasaba con un arreglo
  que en la web real no servía. Ahora reproduce lo que pinta WordPress y lo que
  hace el hijo, y se ha visto fallar sin el arreglo.

### 0.3.1 — 03-10-2026 (arreglo INCOMPLETO: usar la 0.3.2)

- **`armazon/map` ya no se encoge dentro de un Grupo vertical.** Un Grupo
  vertical es un flex en columna, y un mapa con `overflow:hidden` (el que le
  pone un hijo para redondear el borde) podía aplastarse hasta 2 px y cortar
  todo lo de dentro. Ahora lleva `flex: none`. Lo pilló la comparación de
  altos de Lavandería Mallorca (Autoservicio salía un 14 % más corta).
  Prueba: `tests/map-in-flex.test.mjs`, vista fallar sin el arreglo.

### 0.3.0 — 02-10-2026 (menor, con un cambio visible)

- **`armazon/map` sin foto por defecto.** Antes del clic enseña un recuadro
  con los datos del sitio en texto (atributos nuevos `placeName`, `phone`,
  `hours`, además de `address`; todos aceptan bindings), «Ver mapa» y «Abrir en
  Google Maps». Con «maps» aceptado, el iframe directamente, como siempre. Una
  imagen elegida en el bloque se sigue usando.
- **Cambio visible respecto a 0.2.0:** la imagen destacada de la entrada
  (dentro de una Consulta) ya NO se usa sola: hay que marcar
  `useFeaturedImage`. Un hijo que contaba con ella la pierde y ve el recuadro.
- Prueba nueva: `tests/map-card.test.mjs` (recuadro sin imagen, datos, enlace
  tel:, ninguna petición a Google antes del clic).

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
- **`armazon/map` dentro de una Consulta.** Sus atributos de texto (dirección,
  URL de embed, enlace, imagen) aceptan **Block Bindings**, y sin imagen
  elegida usa la **imagen destacada** de la entrada. Así cada sede de una
  lista lleva su mapa. Prueba: `tests/map-query.test.mjs`.
- **`armazon/whatsapp` acepta bindings** en número, mensaje y etiqueta: el
  número puede salir de los datos de la empresa de un plugin en vez de la
  opción `armazon_whatsapp_phone`, que sigue funcionando igual.
- La lista de atributos enlazables está en `inc/blocks.php`
  (`armazon_bindable_attributes`).

### 0.1.0 — 01-10-2026

- Primera versión: plantillas, partes, `theme.json` base y los módulos
  carrusel, mapa, consentimiento y WhatsApp.

## Decisiones pendientes

- **Remoto del repo (fila 24):** sin remoto por ahora. Hay que decidir dónde
  vive y cómo llega a cada web (zip por versión o actualizador).
- **Plantilla del tema hijo:** repo aparte por crear; mientras tanto el mínimo
  es `tests/fixtures/armazon-hijo-prueba/`.
- **Build de PHP (fila 6):** sigue abierta; este tema no lo necesita.
