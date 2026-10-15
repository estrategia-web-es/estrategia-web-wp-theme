<?php
/**
 * Shared behaviour for CORE blocks (0.4.0): what every site wants the same way
 * in a WordPress block and core does not provide.
 *
 * One stylesheet per block in assets/core-blocks/<block>.css, loaded with
 * wp_enqueue_block_style: it only reaches the page if the block is on it, and
 * the editor too. Today: accordion.css (open and close with an animated
 * height; see its header).
 *
 * How to maintain:
 * - Who: whoever touches the parent. A new stylesheet = a file in
 *   assets/core-blocks/ named after the block without "core/"; it loads itself.
 * - Edge case: what is a site's LOOK (colours, the "+" icon) goes in the
 *   child, as a block style; here only behaviour and tokens
 *   (settings.custom in the parent's theme.json).
 * - The trap: the child loads its stylesheets AFTER and can override a
 *   transition by accident (a stray "transition: none" or
 *   "transition: transform …" on the icon); if a site does not animate, look
 *   at the child's stylesheets first.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues assets/core-blocks/<name>.css for core/<name>.
 */
function estrategia_web_core_block_styles(): void {
	foreach ( glob( get_template_directory() . '/assets/core-blocks/*.css' ) ?: array() as $file ) {
		$name = basename( $file, '.css' );
		wp_enqueue_block_style(
			'core/' . $name,
			array(
				'handle' => 'estrategia-web-core-' . $name,
				'src'    => get_template_directory_uri() . '/assets/core-blocks/' . $name . '.css',
				'path'   => $file,
				'ver'    => estrategia_web_version(),
			)
		);
	}
}
add_action( 'init', 'estrategia_web_core_block_styles' );
