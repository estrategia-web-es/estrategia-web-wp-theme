<?php
/**
 * Transiciones entre páginas (0.7.5): mete assets/view-transitions.css en
 * línea detrás de style.css, salvo que el tema lo apague.
 *
 * Por qué en línea y no como hoja aparte: es poco CSS y una hoja más sería
 * otra petición que bloquea el pintado (la auditoría de Lavandería del
 * 06-10-2026 ya contaba 34). Por qué en PHP y no en style.css: la regla
 * @view-transition no se puede condicionar a una variable CSS, y el hijo
 * tiene que poder apagarla desde theme.json.
 *
 * Apagar, en el theme.json del hijo:
 *     "settings": { "custom": { "motion": { "page": { "enabled": false } } } }
 * Afinar: "duration" y "easing" en el mismo sitio (los lee el CSS como
 * --wp--custom--motion--page--duration / --easing).
 *
 * Cómo se mantiene: el qué y el porqué de cada regla, en la cabecera de
 * assets/view-transitions.css. Caso frontera: "enabled": "false" (texto)
 * también apaga; cualquier otro valor, o ninguno, la deja puesta. La trampa:
 * theme.json se cachea; en local, WP_DEVELOPMENT_MODE='theme' para ver el
 * cambio sin vaciar caché. Prueba: tests/view-transitions.test.mjs.
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
