<?php
/**
 * Arranque del tema: dominio de traducción y soportes.
 *
 * Cómo se mantiene:
 * - Las traducciones del PADRE viven en languages/ del padre y se llaman por
 *   el LOCALE, no por el dominio: languages/es_ES.l10n.php y es_ES.po. Así lo
 *   busca WordPress dentro de la carpeta de un tema (wp-includes/l10n.php,
 *   _load_textdomain_just_in_time: "{$path}{$locale}.mo"). El nombre
 *   «armazon-es_ES» solo vale en wp-content/languages/themes/. Esa es la
 *   trampa: con el nombre largo el fichero está, pesa lo que toca y no se usa.
 * - El hijo tiene SU dominio (el slug del hijo) y su carpeta: no mezcla
 *   cadenas con «armazon».
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the theme text domain and theme supports.
 */
function armazon_setup(): void {
	load_theme_textdomain( 'armazon', get_template_directory() . '/languages' );

	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'responsive-embeds' );
}
add_action( 'after_setup_theme', 'armazon_setup' );

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
function armazon_front_page_only_when_static( array $templates ): array {
	return 'page' === get_option( 'show_on_front' ) ? $templates : array();
}
add_filter( 'frontpage_template_hierarchy', 'armazon_front_page_only_when_static' );

/**
 * Loads the parent's own style.css (focus, skip link, anchors) on the front.
 *
 * Hasta la 0.7.2 nadie lo cargaba salvo que el hijo lo encolase (Lavandería
 * lo hace con el handle «armazon-style»): en un hijo que no lo hacía, el foco
 * visible y el salto al contenido no existían. Desde la 0.7.3 lo encola el
 * padre con ESE MISMO handle, así que el hijo que ya lo encolaba no lo
 * duplica (el segundo wp_enqueue_style de un handle es un no-op) y el que no,
 * lo recibe. La trampa: si un hijo lo encola con OTRO handle, sale dos veces;
 * es inocuo (las mismas reglas), pero sobra: que lo quite.
 */
function armazon_styles(): void {
	wp_enqueue_style( 'armazon-style', get_template_directory_uri() . '/style.css', array(), armazon_version() );
}
add_action( 'wp_enqueue_scripts', 'armazon_styles' );

/**
 * Theme version, read once from style.css of the parent (not the child).
 */
function armazon_version(): string {
	static $version = null;
	if ( null === $version ) {
		$version = (string) wp_get_theme( get_template() )->get( 'Version' );
	}
	return $version;
}
