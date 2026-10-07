<?php
/**
 * sizes de las fotos dentro de una columna (0.7.8).
 *
 * Qué resuelve (PageSpeed de Lavandería, 06-10-2026: «mejorar la entrega de
 * imágenes»): WordPress pone a cada foto el sizes «(max-width: Wpx) 100vw,
 * Wpx», con W el ancho del fichero. En una columna de la mitad, en escritorio,
 * eso pide el doble de píxeles de los que se pintan. Medido a 1512: la nave
 * de Quiénes somos se pinta a 543 y bajaba la de 1536; las tarjetas de
 * Clientes, a 286 y bajaban la de 768; la del Autoservicio, a 660 y bajaba la
 * de 1312. En el móvil acertaba por casualidad: las columnas se apilan y
 * entonces sí es 100vw.
 *
 * Cómo, en dos tiempos (como el carrusel, inc/carousel-images.php):
 * 1. Al pintar un core/column (render_block) se marca cada <img> con
 *    data-estrategia-web-column="<parte>|<tope>|<apila>". El srcset y el sizes aún no
 *    existen: los pone wp_filter_content_tags DESPUÉS de pintar los bloques.
 *    - parte: el «width» de la columna en % o, sin él, 100 / nº de columnas
 *      (se apunta al empezar a pintar el core/columns, render_block_data);
 *    - tope: esa parte del ancho del core/columns, wideSize si es align
 *      wide, contentSize si no, ninguno si es full (theme.json, solo en px);
 *    - apila: si las columnas se apilan bajo 782 (isStackedOnMobile).
 * 2. En wp_content_img_tag (prioridad 25: después del «auto, » del núcleo y
 *    del carrusel, 20) se cambia el sizes SOLO si es exactamente el de
 *    WordPress (con o sin «auto, », que se conserva):
 *        (max-width: 781px) 100vw, min(50vw, 692px)
 *    Foto recortada (object-fit: cover con un aspect-ratio más alto que el
 *    fichero): todo se multiplica por cuánto hay que ampliarla para cubrir.
 *    Sin eso, la de portada de Lavandería industrial (3:2 en un hueco casi
 *    cuadrado) se vería borrosa. Al final se quita la marca.
 * Se ignoran el hueco entre columnas y los rellenos: sobrestima unos píxeles,
 * y mejor un poco grande que borrosa (lo mismo que el carrusel, 0.7.4).
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Cuándo: si el núcleo cambia su corte de
 *   apilar columnas (781/782 en la hoja de core/columns) o el formato de su
 *   sizes por defecto: entonces la expresión deja de casar y esto no hace
 *   nada (no rompe: queda el de WordPress).
 * - Caso frontera: un sizes escrito a mano o el del carrusel no casan con el
 *   de WordPress y no se tocan. Una columna dentro de otra: marca la de
 *   dentro (se pinta primero) y la de fuera ya no remarca.
 * - Las fotos que caben en su hueco (un icono de 64) no se tocan: el sizes
 *   de WordPress ya es su ancho.
 * - Ajuste: filtro estrategia_web_column_image_sizes( $sizes, $img, $column ).
 * - La trampa: el core/column no sabe cuántas hermanas tiene; lo sabe el
 *   core/columns ANTES de pintar las suyas. Por eso la pila. Y la marca solo
 *   se quita en las fotos que pasan por wp_filter_content_tags (contenido y
 *   plantillas): en otra, queda en el HTML sin hacer nada.
 * - Prueba: la mira el hijo (Lavandería, tests/render-blocking.test.mjs).
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/** The core stacks columns below this width (block-library/columns). */
const ESTRATEGIA_WEB_COLUMNS_STACK_MAX = 781;

/**
 * Columns being rendered: { count, cap (px or 0), stacked }.
 *
 * @return array<int, array{count:int, cap:float, stacked:bool}>
 */
function &estrategia_web_columns_stack(): array {
	static $stack = array();
	return $stack;
}

/**
 * Pushes a core/columns before its columns render.
 *
 * @param array<string, mixed> $parsed_block
 * @return array<string, mixed>
 */
function estrategia_web_columns_push( $parsed_block ): array {
	$parsed_block = (array) $parsed_block;
	if ( 'core/columns' === ( $parsed_block['blockName'] ?? '' ) ) {
		$count = 0;
		foreach ( (array) ( $parsed_block['innerBlocks'] ?? array() ) as $inner ) {
			$count += ( 'core/column' === ( $inner['blockName'] ?? '' ) ) ? 1 : 0;
		}
		$attrs   = (array) ( $parsed_block['attrs'] ?? array() );
		$align   = (string) ( $attrs['align'] ?? '' );
		$layout  = (array) wp_get_global_settings( array( 'layout' ) );
		$size    = 'full' === $align ? '' : (string) ( 'wide' === $align ? ( $layout['wideSize'] ?? '' ) : ( $layout['contentSize'] ?? '' ) );
		$stack   = &estrategia_web_columns_stack();
		$stack[] = array(
			'count'   => max( 1, $count ),
			'cap'     => preg_match( '/^(\d+(?:\.\d+)?)px$/', trim( $size ), $m ) ? (float) $m[1] : 0.0,
			'stacked' => false !== ( $attrs['isStackedOnMobile'] ?? true ),
		);
	}
	return $parsed_block;
}
add_filter( 'render_block_data', 'estrategia_web_columns_push' );

/**
 * Pops it when it is done.
 *
 * @param string $content
 */
function estrategia_web_columns_pop( $content ): string {
	$stack = &estrategia_web_columns_stack();
	array_pop( $stack );
	return (string) $content;
}
add_filter( 'render_block_core/columns', 'estrategia_web_columns_pop', 99 );

/**
 * Step 1: marks the pictures of a column with its share of the row.
 *
 * @param string               $content
 * @param array<string, mixed> $block
 */
function estrategia_web_column_images_mark( $content, $block ): string {
	$content = (string) $content;
	$stack   = &estrategia_web_columns_stack();
	$row     = end( $stack );
	if ( false === $row || ! str_contains( $content, '<img' ) ) {
		return $content;
	}
	$width = trim( (string) ( $block['attrs']['width'] ?? '' ) );
	if ( '' !== $width && ! preg_match( '/^(\d+(?:\.\d+)?)%$/', $width, $m ) ) {
		return $content; // A column in px or em: its own business.
	}
	$share = '' !== $width ? (float) $m[1] : 100 / $row['count'];
	$mark  = implode( '|', array( round( $share, 2 ), $row['cap'], $row['stacked'] ? 1 : 0 ) );
	$p     = new WP_HTML_Tag_Processor( $content );
	while ( $p->next_tag( 'img' ) ) {
		if ( null === $p->get_attribute( 'data-estrategia-web-column' ) && null === $p->get_attribute( 'sizes' ) ) {
			$p->set_attribute( 'data-estrategia-web-column', $mark );
		}
	}
	return $p->get_updated_html();
}
add_filter( 'render_block_core/column', 'estrategia_web_column_images_mark', 10, 2 );

/**
 * The sizes of a picture in a column. Pure.
 *
 * @param float $share   Part of the row, 0-100.
 * @param float $cap     Width of the row in px (0: none).
 * @param bool  $stacked If the columns stack under 782.
 * @param float $zoom    How much a cover-cropped picture is enlarged (>= 1).
 */
function estrategia_web_column_image_sizes_for( float $share, float $cap, bool $stacked, float $zoom ): string {
	$fmt     = static fn( float $n ): string => rtrim( rtrim( number_format( $n, 1, '.', '' ), '0' ), '.' );
	$vw      = $fmt( $share * $zoom ) . 'vw';
	$desktop = $cap > 0 ? sprintf( 'min(%s, %dpx)', $vw, (int) ceil( $cap * $share / 100 * $zoom ) ) : $vw;
	$mobile  = $stacked ? $fmt( 100 * $zoom ) . 'vw' : $vw;
	return sprintf( '(max-width: %dpx) %s, %s', ESTRATEGIA_WEB_COLUMNS_STACK_MAX, $mobile, $desktop );
}

/**
 * Step 2: rewrites the WordPress-default sizes of a marked picture.
 *
 * @param string $image The <img> tag, with srcset and sizes.
 */
function estrategia_web_column_image_sizes( $image ): string {
	$image = (string) $image;
	if ( ! str_contains( $image, 'data-estrategia-web-column' ) ) {
		return $image;
	}
	$p = new WP_HTML_Tag_Processor( $image );
	if ( ! $p->next_tag( 'img' ) ) {
		return $image;
	}
	list( $share, $cap, $stacked ) = array_map( 'floatval', explode( '|', (string) $p->get_attribute( 'data-estrategia-web-column' ) ) + array( 100, 0, 1 ) );
	$p->remove_attribute( 'data-estrategia-web-column' );

	$sizes = (string) $p->get_attribute( 'sizes' );
	$w     = (int) $p->get_attribute( 'width' );
	$h     = (int) $p->get_attribute( 'height' );
	$slot  = $cap > 0 ? $cap * $share / 100 : 0;
	$fits  = $slot > 0 && $w > 0 && $w <= $slot;
	if ( $share > 0 && ! $fits && null !== $p->get_attribute( 'srcset' ) && preg_match( '/^(auto,\s*)?\(max-width: (\d+)px\) 100vw, (\d+)px$/', $sizes, $m ) && $m[2] === $m[3] ) {
		$zoom  = 1.0;
		$style = (string) $p->get_attribute( 'style' );
		if ( $w > 0 && $h > 0 && preg_match( '/object-fit:\s*cover/', $style ) && preg_match( '/aspect-ratio:\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?/', $style, $ar ) ) {
			$box  = (float) $ar[1] / (float) ( $ar[2] ?? 1 );
			$zoom = $box > 0 ? max( 1.0, ( $w / $h ) / $box ) : 1.0;
		}
		$new = estrategia_web_column_image_sizes_for( $share, $cap, (bool) $stacked, round( $zoom, 2 ) );
		/**
		 * The sizes of a picture in a column.
		 *
		 * @param string               $new    Computed.
		 * @param array<string, mixed> $img    width, height, style of the <img>.
		 * @param array<string, mixed> $column share (%), cap (px, 0 = none), stacked.
		 */
		$new = (string) apply_filters( 'estrategia_web_column_image_sizes', $new, compact( 'w', 'h', 'style' ), compact( 'share', 'cap', 'stacked' ) );
		$p->set_attribute( 'sizes', ( $m[1] ? 'auto, ' : '' ) . $new );
	}
	return $p->get_updated_html();
}
add_filter( 'wp_content_img_tag', 'estrategia_web_column_image_sizes', 25 );
