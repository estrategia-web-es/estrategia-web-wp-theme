<?php
/**
 * Precarga de las fuentes del texto (0.7.8).
 *
 * Qué resuelve (PageSpeed de Lavandería, 06-10-2026, móvil): las fuentes de
 * theme.json se piden TARDE. Sus @font-face van en los estilos globales, pero
 * el navegador no pide un fichero de fuente hasta que sabe que un texto la
 * usa, y eso lo sabe al calcular estilos: después de que llegue TODO el CSS
 * que bloquea. Medido en local: las hojas acaban en 1708 ms y las dos fuentes
 * se piden en 1760; las imágenes, que están en el HTML, se pidieron en 1704.
 * Con <link rel="preload" as="font"> salen con el HTML, en paralelo.
 *
 * Qué precarga: las caras de las familias que usan el TEXTO y los TÍTULOS en
 * los estilos globales (styles.typography.fontFamily y
 * styles.elements.heading/h1…h6), de estilo normal, en woff2 y sin
 * unicodeRange (una cara con unicodeRange solo se baja si sale ese carácter:
 * precargarla sería bajarla siempre). En Lavandería: Humanist 521 regular y
 * bold. Las URL salen del theme.json fusionado (hijo sobre padre), así que un
 * hijo que cambia de fuente no toca nada aquí. Va por wp_preload_resources,
 * el mecanismo del núcleo (6.1+), que las pinta al principio del <head> con
 * crossorigin (sin él, el navegador baja la fuente DOS veces: la precarga va
 * sin CORS y la de @font-face con CORS).
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Cuándo: si WordPress cambia cómo guarda
 *   fontFamilies en los ajustes globales (hoy, por origen: theme / custom).
 * - Ajuste: filtro estrategia_web_preload_fonts( string[] $urls ). Devolver array()
 *   apaga la precarga; un hijo que use una tercera fuente arriba del todo
 *   (la de un antetítulo, por ejemplo) la añade ahí.
 * - Caso frontera: una familia con cinco pesos precargaría cinco ficheros y
 *   competiría con la foto principal. Se corta en MAX caras (4); el resto se
 *   pide como siempre.
 * - La trampa: una precarga que no se usa en 3 s sale como aviso en la
 *   consola («preloaded but not used»). Pasa si la familia del texto tiene
 *   una cara que ninguna página pinta (un 700 que nadie usa): se quita con el
 *   filtro, no tocando esto.
 * - Prueba: tests/page-loads.test.mjs no la mira; la mira el hijo
 *   (Lavandería, tests/render-blocking.test.mjs, nivel 3).
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/** Most font faces preloaded: more would compete with the LCP image. */
const ESTRATEGIA_WEB_PRELOAD_FONTS_MAX = 4;

/**
 * Font files to preload: the woff2 of the families of body text and headings.
 *
 * @return string[] Absolute URLs.
 */
function estrategia_web_preload_font_urls(): array {
	$slugs = array();
	$paths = array(
		array( 'typography', 'fontFamily' ),
		array( 'elements', 'heading', 'typography', 'fontFamily' ),
	);
	foreach ( array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ) as $h ) {
		$paths[] = array( 'elements', $h, 'typography', 'fontFamily' );
	}
	foreach ( $paths as $path ) {
		$value = wp_get_global_styles( $path );
		if ( is_string( $value ) && preg_match( '/(?:var:preset\|font-family\||--wp--preset--font-family--)([a-z0-9-]+)/', $value, $m ) ) {
			$slugs[ $m[1] ] = true;
		}
	}

	$by_origin = (array) wp_get_global_settings( array( 'typography', 'fontFamilies' ) );
	$families  = array();
	foreach ( array( 'default', 'theme', 'custom' ) as $origin ) {
		foreach ( (array) ( $by_origin[ $origin ] ?? array() ) as $family ) {
			if ( isset( $family['slug'] ) ) {
				$families[ $family['slug'] ] = $family; // Later origins win, as in the cascade.
			}
		}
	}

	$urls = array();
	foreach ( array_keys( $slugs ) as $slug ) {
		foreach ( (array) ( $families[ $slug ]['fontFace'] ?? array() ) as $face ) {
			$url = estrategia_web_preload_font_face_url( (array) $face );
			if ( null !== $url ) {
				$urls[] = $url;
			}
		}
	}
	$urls = array_slice( array_values( array_unique( $urls ) ), 0, ESTRATEGIA_WEB_PRELOAD_FONTS_MAX );

	/**
	 * Font files preloaded in the <head> (woff2, absolute URLs). array() turns it off.
	 *
	 * @param string[] $urls
	 */
	return array_values( array_filter( (array) apply_filters( 'estrategia_web_preload_fonts', $urls ), 'is_string' ) );
}

/**
 * The woff2 URL of a font face worth preloading, or null.
 *
 * @param array<string, mixed> $face A fontFace entry of theme.json.
 */
function estrategia_web_preload_font_face_url( array $face ): ?string {
	if ( ! empty( $face['unicodeRange'] ) || 'normal' !== ( $face['fontStyle'] ?? 'normal' ) ) {
		return null;
	}
	foreach ( (array) ( $face['src'] ?? array() ) as $src ) {
		if ( ! is_string( $src ) || ! preg_match( '/\.woff2(\?.*)?$/i', $src ) ) {
			continue;
		}
		if ( str_starts_with( $src, 'file:./' ) ) {
			return get_theme_file_uri( substr( $src, 7 ) ); // Child first, then parent: as WordPress resolves it.
		}
		return $src;
	}
	return null;
}

/**
 * Adds the fonts to the core's preload list.
 *
 * @param array<int, array<string, string>> $resources
 * @return array<int, array<string, string>>
 */
function estrategia_web_preload_fonts( $resources ): array {
	$resources = (array) $resources;
	foreach ( estrategia_web_preload_font_urls() as $url ) {
		$resources[] = array(
			'href'        => $url,
			'as'          => 'font',
			'type'        => 'font/woff2',
			'crossorigin' => 'anonymous',
		);
	}
	return $resources;
}
add_filter( 'wp_preload_resources', 'estrategia_web_preload_fonts' );
