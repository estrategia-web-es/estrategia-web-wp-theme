<?php
/**
 * sizes of the pictures inside a column (0.7.8).
 *
 * What it solves (Lavandería's PageSpeed, 06-10-2026: "improve image
 * delivery"): WordPress gives each picture the sizes "(max-width: Wpx) 100vw,
 * Wpx", with W the file's width. In a half-width column, on desktop, that
 * requests twice the pixels that are painted. Measured at 1512: the warehouse
 * picture on Quiénes somos is painted at 543 and downloaded the 1536 one; the
 * Clientes cards, at 286 and downloaded the 768 one; the Autoservicio one, at
 * 660 and downloaded the 1312 one. On mobile it was right by chance: the
 * columns stack and then it really is 100vw.
 *
 * How, in two steps (like the carousel, inc/carousel-images.php):
 * 1. When a core/column is rendered (render_block) each <img> is marked with
 *    data-estrategia-web-column="<share>|<cap>|<stacked>". The srcset and the
 *    sizes do not exist yet: wp_filter_content_tags adds them AFTER the blocks
 *    are rendered.
 *    - share: the column's "width" in % or, without it, 100 / number of
 *      columns (noted when the core/columns starts rendering,
 *      render_block_data);
 *    - cap: that share of the core/columns width, wideSize if it is align
 *      wide, contentSize otherwise, none if it is full (theme.json, px only);
 *    - stacked: whether the columns stack below 782 (isStackedOnMobile).
 * 2. In wp_content_img_tag (priority 25: after core's "auto, " and the
 *    carousel's, 20) the sizes is changed ONLY if it is exactly WordPress's
 *    (with or without "auto, ", which is kept):
 *        (max-width: 781px) 100vw, min(50vw, 692px)
 *    Cropped picture (object-fit: cover with an aspect-ratio taller than the
 *    file): everything is multiplied by how much it must be enlarged to cover.
 *    Without that, the hero picture of Lavandería industrial (3:2 in an almost
 *    square slot) would look blurry. At the end the mark is removed.
 * The gap between columns and the paddings are ignored: it overestimates by a
 * few pixels, and slightly too large is better than blurry (same as the
 * carousel, 0.7.4).
 *
 * How to maintain:
 * - Who: whoever touches the parent. When: if core changes its column
 *   stacking breakpoint (781/782 in the core/columns stylesheet) or the format
 *   of its default sizes: then the expression stops matching and this does
 *   nothing (nothing breaks: WordPress's stays).
 * - Edge case: a hand-written sizes or the carousel's do not match
 *   WordPress's and are left alone. A column inside another: the inner one
 *   marks (it renders first) and the outer one does not re-mark.
 * - Pictures that fit in their slot (a 64 px icon) are left alone: WordPress's
 *   sizes is already their width.
 * - Tuning: filter estrategia_web_column_image_sizes( $sizes, $img, $column ).
 * - The trap: core/column does not know how many siblings it has; core/columns
 *   knows it BEFORE rendering them. Hence the stack. And the mark is only
 *   removed on pictures that go through wp_filter_content_tags (content and
 *   templates): elsewhere, it stays in the HTML doing nothing.
 * - Test: the child checks it (Lavandería, tests/render-blocking.test.mjs).
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
