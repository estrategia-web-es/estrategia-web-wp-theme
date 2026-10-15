<?php
/**
 * Theme bootstrap: translation domain and supports.
 *
 * How to maintain:
 * - The PARENT's translations live in the parent's languages/ and are named by
 *   LOCALE, not by domain: languages/es_ES.l10n.php and es_ES.po. That is how
 *   WordPress looks for them inside a theme folder (wp-includes/l10n.php,
 *   _load_textdomain_just_in_time: "{$path}{$locale}.mo"). The name
 *   "estrategia-web-es_ES" only works in wp-content/languages/themes/. That is
 *   the trap: with the long name the file is there, has the right size and is
 *   not used.
 * - The child has ITS OWN domain (the child's slug) and its own folder: it does
 *   not mix strings with "estrategia-web".
 * - 1.1.0: the Estrategia Web plugin uses the SAME domain. Since WordPress 6.7
 *   each domain has ONE folder for just-in-time loading, and it is this one:
 *   the plugin does not override it, it forces this load and merges its own
 *   file into it (see EstrategiaWeb\Plugin::load_textdomain in the plugin). If
 *   someone changes this line to load_textdomain() or changes its folder, look
 *   there; the test that guards it is tests/page-loads.test.mjs ("404
 *   untranslated").
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the theme text domain and theme supports.
 */
function estrategia_web_setup(): void {
	load_theme_textdomain( 'estrategia-web', get_template_directory() . '/languages' );

	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'responsive-embeds' );
}
add_action( 'after_setup_theme', 'estrategia_web_setup' );

/**
 * templates/front-page.html only applies when the front page is a static page.
 *
 * WordPress uses front-page.html for the front page in BOTH modes, and in
 * «latest posts» mode it painted the content of the first post instead of the
 * list (seen in the tests on 01-10-2026). Dropping it from the hierarchy in
 * that mode falls back to home.html / index.html, which list posts.
 *
 * @param string[] $templates Template candidates.
 * @return string[]
 */
function estrategia_web_front_page_only_when_static( array $templates ): array {
	return 'page' === get_option( 'show_on_front' ) ? $templates : array();
}
add_filter( 'frontpage_template_hierarchy', 'estrategia_web_front_page_only_when_static' );

/**
 * Loads the parent's own style.css (focus, skip link, anchors) on the front.
 *
 * Up to 0.7.2 nobody loaded it unless the child enqueued it (Lavandería does
 * it with the handle "estrategia-web-style"): in a child that did not, visible
 * focus and the skip link did not exist. Since 0.7.3 the parent enqueues it
 * with THAT SAME handle, so a child that already enqueued it does not
 * duplicate it (a second wp_enqueue_style of a handle is a no-op) and one that
 * did not, gets it. The trap: if a child enqueues it with ANOTHER handle, it
 * comes out twice; harmless (the same rules), but redundant: remove it.
 */
function estrategia_web_styles(): void {
	wp_enqueue_style( 'estrategia-web-style', get_template_directory_uri() . '/style.css', array(), estrategia_web_version() );
}
add_action( 'wp_enqueue_scripts', 'estrategia_web_styles' );

/**
 * Theme version, read once from style.css of the parent (not the child).
 */
function estrategia_web_version(): string {
	static $version = null;
	if ( null === $version ) {
		$version = (string) wp_get_theme( get_template() )->get( 'Version' );
	}
	return $version;
}
