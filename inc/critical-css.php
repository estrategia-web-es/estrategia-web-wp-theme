<?php
/**
 * CSS que no bloquea el primer pintado (0.7.8): las hojas pequeñas, dentro
 * del HTML; las grandes, diferidas detrás de su CSS crítico.
 *
 * Qué resuelve (PageSpeed de Lavandería, 06-10-2026, móvil): «solicitudes que
 * bloquean el renderizado», ~300 ms. Bloqueaban CINCO hojas: la del bloque de
 * navegación del núcleo (21 KB), la de imagen (9 KB), los style.css del padre
 * y del hijo (3 y 4 KB) y la hoja juntada del hijo (61 KB). El navegador no
 * pinta nada hasta tenerlas todas, aunque la foto principal ya haya llegado.
 *
 * Tres piezas, de la más general a la más particular:
 *
 * 1. Límite de CSS en línea (120.000 bytes; el del núcleo es 20.000).
 *    WordPress ya mete en el HTML las hojas de bloque pequeñas
 *    (wp_maybe_inline_styles), de menor a mayor hasta el límite. Con 20.000
 *    se quedaban fuera navegación e imagen, que hacen falta para pintar la
 *    cabecera y la portada. Medido en Lavandería: lo que entra por esta vía
 *    suma ~61.000 en el inicio y ~96.000 en Hostelería, con la navegación
 *    (la mayor, 20.776, entra la última: con 80.000 se quedaba fuera allí).
 *    Es CSS sin comprimir; en la red va con gzip, ~1/5. Filtro
 *    armazon_styles_inline_size_limit.
 * 2. Las hojas del tema (padre e hijo) y de los plugins encoladas por URL
 *    pasan por ese mismo mecanismo: se les pone la ruta del fichero
 *    (wp_style_add_data 'path') y WordPress las mete en línea si caben,
 *    reescribiendo sus url() relativas. Es lo que el núcleo ya hace con las
 *    hojas de bloque; aquí solo se le dice dónde está el fichero. Caso real:
 *    la de armazon-forms, que solo sale donde hay formulario (Contacto) y
 *    bloqueaba allí. Las que estén en armazon_deferred_styles no (pieza 3).
 * 3. Hojas diferidas: los handles que un hijo devuelva en el filtro
 *    armazon_deferred_styles se piden con <link rel="preload" as="style">
 *    y pasan a hoja al llegar (onload), con <noscript> por si no hay JS. SOLO
 *    si existe el CSS crítico (assets/css/dist/critical.css del hijo, o del
 *    padre; filtro armazon_critical_css_file): se pinta en un <style
 *    id="armazon-critical-css"> justo DONDE iba la primera hoja diferida.
 *    Sin crítico no se difiere nada: sería pintar la página sin estilos.
 *
 * Por qué preload y no media="print": una hoja print se pide con la prioridad
 * más baja, detrás de todas las imágenes; preload la pide alta y no bloquea.
 *
 * La cascada no cambia: la hoja diferida sigue en su sitio del <head> y, al
 * llegar, aplica en el mismo orden que antes. El crítico va antes que ella y
 * repite reglas suyas, así que cuando llega la completa no cambia nada de lo
 * que ya estaba pintado. ESO es lo que hay que vigilar (la trampa de abajo).
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre (piezas 1-3) o la hoja de un hijo (su crítico).
 * - El crítico lo GENERA el hijo (Lavandería: tools/juntar-css.mjs, a la vez
 *   que la hoja completa); el padre solo lo pinta.
 * - Caso frontera: una hoja de fuera (otro dominio, un CDN) no tiene fichero
 *   aquí: sigue como <link>, bloqueando. Una hoja que NO deba ir en línea (por
 *   grande, o porque se cachea entre páginas y compensa) se excluye con el
 *   filtro armazon_inline_style( bool, $handle ).
 * - LA TRAMPA: un crítico que se desfasa de la hoja completa. Lo que se ve
 *   arriba se pinta con el crítico y, al llegar la completa, SALTA (CLS). No
 *   da error en ningún sitio. Lo vigila la prueba del hijo
 *   (tests/render-blocking.test.mjs en Lavandería): pinta cada página SIN la
 *   hoja diferida y compara la posición de lo que se ve arriba con la página
 *   completa.
 * - Otra: el límite de la pieza 1 se cuenta por página; si un día una página
 *   lleva muchos bloques con hoja, las más grandes vuelven a ir como <link>.
 *   No rompe nada: bloquean, como antes.
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/** The id of the inline critical CSS. */
const ARMAZON_CRITICAL_CSS_ID = 'armazon-critical-css';

/**
 * Raises the core's total of CSS printed inline (piece 1).
 *
 * @param mixed $limit The core's limit (20000).
 */
function armazon_styles_inline_size_limit( $limit ): int {
	/**
	 * Bytes of stylesheets printed inline in the HTML, in total, per page.
	 *
	 * @param int $limit
	 */
	return (int) apply_filters( 'armazon_styles_inline_size_limit', max( (int) $limit, 120000 ) );
}
add_filter( 'styles_inline_size_limit', 'armazon_styles_inline_size_limit' );

/**
 * Handles loaded without blocking, if there is a critical CSS (piece 3).
 *
 * @return string[]
 */
function armazon_deferred_styles(): array {
	if ( '' === armazon_critical_css() ) {
		return array();
	}
	/**
	 * Stylesheet handles requested with rel=preload and applied on load, behind the critical CSS.
	 *
	 * @param string[] $handles
	 */
	return array_values( array_filter( (array) apply_filters( 'armazon_deferred_styles', array() ), 'is_string' ) );
}

/**
 * The critical CSS of the theme (child first), or ''.
 */
function armazon_critical_css(): string {
	static $css = null;
	if ( null === $css ) {
		/**
		 * Critical CSS file, relative to the theme (child first, then parent).
		 *
		 * @param string $file
		 */
		$file = (string) apply_filters( 'armazon_critical_css_file', 'assets/css/dist/critical.css' );
		$path = '' !== $file ? get_theme_file_path( $file ) : '';
		$css  = ( '' !== $path && is_file( $path ) ) ? trim( (string) file_get_contents( $path ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		if ( '' !== $css ) {
			// Same as the core does with inlined sheets: url() relative to the file, made absolute.
			$css = _wp_normalize_relative_css_links( $css, get_theme_file_uri( $file ) );
			$css = str_ireplace( '</style', '<\/style', $css );
		}
	}
	return $css;
}

/**
 * Gives the file path to the theme's stylesheets enqueued by URL, so that the
 * core prints them inline when they fit (piece 2). Runs after every enqueue
 * of wp_enqueue_scripts and before wp_maybe_inline_styles (both on wp_head, 1).
 */
function armazon_inline_theme_styles(): void {
	$wp_styles = wp_styles();
	$deferred  = armazon_deferred_styles();
	$roots     = array(
		get_stylesheet_directory_uri() => get_stylesheet_directory(),
		get_template_directory_uri()   => get_template_directory(),
		plugins_url()                  => WP_PLUGIN_DIR,
	);
	foreach ( $wp_styles->queue as $handle ) {
		$style = $wp_styles->registered[ $handle ] ?? null;
		// The core prints an inlined sheet without its media: only 'all' ones.
		if ( ! $style || ! is_string( $style->src ) || ! in_array( (string) $style->args, array( '', 'all' ), true ) || in_array( $handle, $deferred, true ) || $wp_styles->get_data( $handle, 'path' ) ) {
			continue;
		}
		/**
		 * Whether a theme or plugin stylesheet may be printed inline when it fits.
		 *
		 * @param bool   $inline
		 * @param string $handle
		 */
		if ( ! apply_filters( 'armazon_inline_style', true, $handle ) ) {
			continue;
		}
		$src = strtok( $style->src, '?' );
		foreach ( $roots as $uri => $dir ) {
			if ( str_starts_with( $src, $uri . '/' ) && str_ends_with( $src, '.css' ) ) {
				$path = $dir . substr( $src, strlen( $uri ) );
				if ( is_file( $path ) ) {
					wp_style_add_data( $handle, 'path', $path );
				}
				break;
			}
		}
	}
}
add_action( 'wp_enqueue_scripts', 'armazon_inline_theme_styles', PHP_INT_MAX );

/**
 * Turns a deferred stylesheet's <link> into a non-blocking one and prints the
 * critical CSS before the first of them (piece 3).
 *
 * @param string $tag    The <link> tag.
 * @param string $handle Style handle.
 * @param string $href   URL.
 * @param string $media  Media attribute.
 */
function armazon_defer_style_tag( $tag, $handle, $href, $media ): string {
	static $critical_printed = false;
	$tag = (string) $tag;
	if ( ! in_array( $handle, armazon_deferred_styles(), true ) ) {
		return $tag;
	}
	$p = new WP_HTML_Tag_Processor( $tag );
	if ( ! $p->next_tag( 'link' ) || 'stylesheet' !== $p->get_attribute( 'rel' ) ) {
		return $tag;
	}
	$p->set_attribute( 'rel', 'preload' );
	$p->set_attribute( 'as', 'style' );
	$p->set_attribute( 'onload', "this.onload=null;this.rel='stylesheet'" );
	$out = $p->get_updated_html() . '<noscript>' . trim( $tag ) . "</noscript>\n";
	if ( ! $critical_printed ) {
		$critical_printed = true;
		$out              = sprintf( "<style id=\"%s\">\n%s\n</style>\n", ARMAZON_CRITICAL_CSS_ID, armazon_critical_css() ) . $out;
	}
	return $out;
}
add_filter( 'style_loader_tag', 'armazon_defer_style_tag', 10, 4 );
