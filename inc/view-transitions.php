<?php
/**
 * Transitions between pages (0.7.5): inlines assets/view-transitions.css after
 * style.css, unless the theme turns it off.
 *
 * Why inline and not as a separate stylesheet: it is little CSS and one more
 * stylesheet would be another render-blocking request (Lavandería's audit of
 * 06-10-2026 already counted 34). Why in PHP and not in style.css: the
 * @view-transition rule cannot be made conditional on a CSS variable, and the
 * child must be able to turn it off from theme.json.
 *
 * To turn it off, in the child's theme.json:
 *     "settings": { "custom": { "motion": { "page": { "enabled": false } } } }
 * To fine-tune: "duration" and "easing" in the same place (the CSS reads them
 * as --wp--custom--motion--page--duration / --easing).
 *
 * How to maintain: the what and the why of each rule are in the header of
 * assets/view-transitions.css. Edge case: "enabled": "false" (a string) also
 * turns it off; any other value, or none, leaves it on. The trap: theme.json
 * is cached; locally, use WP_DEVELOPMENT_MODE='theme' to see the change
 * without flushing the cache. Test: tests/view-transitions.test.mjs.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/** Whether the theme (parent or child theme.json) leaves page transitions on. */
function estrategia_web_view_transitions_enabled(): bool {
	$enabled = wp_get_global_settings( array( 'custom', 'motion', 'page', 'enabled' ) );
	return ! ( false === $enabled || 'false' === $enabled || 0 === $enabled || '0' === $enabled );
}

/** Adds the transitions CSS after the parent's style.css. */
function estrategia_web_view_transitions_styles(): void {
	if ( ! estrategia_web_view_transitions_enabled() ) {
		return;
	}
	$css = file_get_contents( get_template_directory() . '/assets/view-transitions.css' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( $css ) {
		wp_add_inline_style( 'estrategia-web-style', $css );
	}
}
add_action( 'wp_enqueue_scripts', 'estrategia_web_view_transitions_styles', 20 );
