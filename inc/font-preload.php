<?php
/**
 * Preloading of the text fonts (0.7.8).
 *
 * What it solves (Lavandería's PageSpeed, 06-10-2026, mobile): theme.json fonts
 * are requested LATE. Their @font-face rules are in the global styles, but the
 * browser does not request a font file until it knows some text uses it, and
 * it knows that when computing styles: after ALL the blocking CSS has arrived.
 * Measured locally: the stylesheets finish at 1708 ms and the two fonts are
 * requested at 1760; the images, which are in the HTML, were requested at 1704.
 * With <link rel="preload" as="font"> they go out with the HTML, in parallel.
 *
 * What it preloads: the faces of the families used by BODY TEXT and HEADINGS
 * in the global styles (styles.typography.fontFamily and
 * styles.elements.heading/h1…h6), normal style, woff2 and without
 * unicodeRange (a face with unicodeRange is only downloaded if that character
 * appears: preloading it would mean always downloading it). On Lavandería:
 * Humanist 521 regular and bold. The URLs come from the merged theme.json
 * (child over parent), so a child that changes font touches nothing here. It
 * goes through wp_preload_resources, the core mechanism (6.1+), which prints
 * them at the start of the <head> with crossorigin (without it, the browser
 * downloads the font TWICE: the preload goes without CORS and the @font-face
 * one with CORS).
 *
 * How to maintain:
 * - Who: whoever touches the parent. When: if WordPress changes how it stores
 *   fontFamilies in the global settings (today, by origin: theme / custom).
 * - Tuning: filter estrategia_web_preload_fonts( string[] $urls ). Returning
 *   array() turns preloading off; a child that uses a third font at the very
 *   top (an eyebrow heading's, for example) adds it there.
 * - Edge case: a family with five weights would preload five files and compete
 *   with the main photo. It is capped at MAX faces (4); the rest are requested
 *   as usual.
 * - The trap: a preload not used within 3 s shows up as a console warning
 *   ("preloaded but not used"). It happens if the text family has a face that
 *   no page paints (a 700 nobody uses): remove it with the filter, not by
 *   touching this.
 * - Test: tests/page-loads.test.mjs does not check it; the child does
 *   (Lavandería, tests/render-blocking.test.mjs, level 3).
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
