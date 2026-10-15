<?php
/**
 * Estrategia Web — parent block theme.
 *
 * This file only loads inc/*.php. The logic lives there, one file per concern
 * (setup, core blocks, transitions, performance). Since 1.1.0 the theme
 * registers no blocks: the carousel, the map, WhatsApp and the language
 * switcher are modules of the Estrategia Web plugin, just like the cookie
 * notice (which moved out in 0.7.0). A new block goes there.
 *
 * How to maintain:
 * - A new concern is a new file in inc/, not one more block here.
 * - They load in alphabetical order. If one depends on another, the name rules
 *   (that is why functions used by others live in files that load earlier or
 *   are called inside hooks, never when the file loads).
 * - The trap: the child theme has its own functions.php and WordPress loads the
 *   CHILD's BEFORE the parent's. A child that calls an estrategia_web_* function
 *   when its file loads blows up; it must do it inside a hook (init,
 *   after_setup_theme...). That is why there are no "pluggable" functions here
 *   (if ! function_exists): the child changes behaviour with filters.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/inc/*.php' ) ?: array() as $estrategia_web_file ) {
	require_once $estrategia_web_file;
}
unset( $estrategia_web_file );
