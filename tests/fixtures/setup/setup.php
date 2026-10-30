<?php
/**
 * Seed of the test WordPress (Playground). Called by the blueprint
 * (tests/fixtures/blueprint.json) with runPHP after WordPress loads.
 *
 * It leaves: pretty permalinks, the site's WhatsApp option (the footer's
 * button uses it), and three pages:
 * - /prueba-modulos/ with the plugin's blocks, to see them working INSIDE
 *   the theme (page-loads, view-transitions: the content's WhatsApp button
 *   next to the footer's one is the case that repeated a view-transition-name);
 * - /prueba-acordeon/ with a core/accordion with a long answer (0.4.0);
 * - /prueba-anclas/ with a link to a #destino far below (0.7.3).
 * It is idempotent: if a page already exists, it rewrites it.
 *
 * 17-10-2026: the pages, posts and images of the carousel, map and WhatsApp
 * tests left with those tests for the plugin (armazon-wp-sitio,
 * modules/<block>/tests/wp/estrategia-web-<block>-test.php). What stays here
 * is what the THEME's tests use. How to tell: a page whose test measures the
 * block itself goes to the plugin; one whose test measures the theme around
 * the block (its CSS, templates, transitions) stays.
 *
 * The content (titles, labels, texts) is in Spanish on purpose: it is test
 * data for a Spanish site and the tests look for those literals.
 *
 * @package estrategia-web
 */

// set_permalink_structure() and not only update_option (28-10-2026, blog
// test): with the option alone, $wp_rewrite keeps the structure it read at
// the start of this request and flush_rewrite_rules() below writes rules
// without the post rule; /<post-slug>/ then served the home page.
global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );
update_option( 'estrategia_web_whatsapp_phone', '34611223344' );
update_option( 'estrategia_web_whatsapp_message', 'Mensaje desde la opción del sitio' );

// 1.1.0: the blocks no longer belong to the theme but to the Estrategia Web
// plugin (mounted by tests/server.mjs). Only its BLOCK modules: without
// "consent" (the cookie notice is the plugin's business), and without "site"
// or "forms", which have no role here.
update_option( 'estrategia_web_modules', array( 'carousel', 'map', 'whatsapp', 'language-switcher' ) );

$slides = '';
for ( $i = 1; $i <= 5; $i++ ) {
	$slides .= '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
		. '<div class="wp-block-group has-surface-background-color has-background">'
		. '<!-- wp:paragraph --><p>Diapositiva ' . $i . '</p><!-- /wp:paragraph -->'
		. '</div><!-- /wp:group -->';
}

$content = '<!-- wp:heading --><h2 class="wp-block-heading">Carrusel</h2><!-- /wp:heading -->'
	. '<!-- wp:estrategia-web/carousel {"label":"Carrusel de prueba","showDots":true,"loop":false,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $slides
	. '<!-- /wp:estrategia-web/carousel -->'
	. '<!-- wp:heading --><h2 class="wp-block-heading">Mapa</h2><!-- /wp:heading -->'
	. '<!-- wp:estrategia-web/map {"placeName":"Ayuntamiento de prueba","address":"Plaça de Cort 1, 07001 Palma","phone":"+34 971 22 59 00","hours":"De lunes a viernes\nDe 9:00 a 14:00","embedUrl":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3075.5!2d2.6502!3d39.5696!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMznCsDM0JzEwLjYiTiAywrAzOScwMC43IkU!5e0!3m2!1ses!2ses!4v1700000000000"} /-->'
	. '<!-- wp:estrategia-web/whatsapp {"phone":"+34 600 11 12 22","message":"Hola, ¿tenéis hora mañana?","position":"bottom-left"} /-->';

$existing = get_page_by_path( 'prueba-modulos' );
$page_id  = wp_insert_post(
	array(
		'ID'           => $existing ? $existing->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de módulos',
		'post_name'    => 'prueba-modulos',
		'post_content' => wp_slash( $content ),
	)
);

// Core accordion (0.4.0): two questions, the first with a long answer, to see
// that the panel height animates on opening and closing.
$answer = str_repeat( 'Respuesta larga de prueba para ver la altura del panel moverse poco a poco. ', 12 );
$item   = static fn( string $question, string $text ): string => '<!-- wp:accordion-item --><div class="wp-block-accordion-item">'
	. '<!-- wp:accordion-heading --><h3 class="wp-block-accordion-heading"><button type="button" class="wp-block-accordion-heading__toggle"><span class="wp-block-accordion-heading__toggle-title">' . $question . '</span><span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span></button></h3><!-- /wp:accordion-heading -->'
	. '<!-- wp:accordion-panel --><div role="region" class="wp-block-accordion-panel"><!-- wp:paragraph --><p>' . $text . '</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>' . $text . '</p><!-- /wp:paragraph --></div><!-- /wp:accordion-panel -->'
	. '</div><!-- /wp:accordion-item -->';

$accordion_content = '<!-- wp:accordion --><div role="group" class="wp-block-accordion">'
	. $item( '¿Primera pregunta?', $answer )
	. $item( '¿Segunda pregunta?', 'Respuesta corta.' )
	. '</div><!-- /wp:accordion -->';

$existing_accordion = get_page_by_path( 'prueba-acordeon' );
wp_insert_post(
	array(
		'ID'           => $existing_accordion ? $existing_accordion->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de acordeón',
		'post_name'    => 'prueba-acordeon',
		'post_content' => wp_slash( $accordion_content ),
	)
);

// Anchors (0.7.3): a link at the top to #destino, far below, to see that the
// jump scrolls smoothly and that the target does not end up under the sticky
// header (the test child makes it sticky only on this page).
$anchors_content = '<!-- wp:paragraph --><p><a href="#destino">Ir al destino</a></p><!-- /wp:paragraph -->'
	. '<!-- wp:spacer {"height":"2400px"} --><div style="height:2400px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->'
	. '<!-- wp:heading --><h2 class="wp-block-heading" id="destino">Destino</h2><!-- /wp:heading -->'
	. '<!-- wp:paragraph --><p>Texto bajo el destino.</p><!-- /wp:paragraph -->'
	. '<!-- wp:spacer {"height":"1600px"} --><div style="height:1600px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->';

$existing_anchors = get_page_by_path( 'prueba-anclas' );
wp_insert_post(
	array(
		'ID'           => $existing_anchors ? $existing_anchors->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de anclas',
		'post_name'    => 'prueba-anclas',
		'post_content' => wp_slash( $anchors_content ),
	)
);

// The blog (1.2.0): three posts in two categories, for tests/blog.test.mjs.
// «prueba-blog-a» and «-b» share a category (each is the other's related
// post); «-c» is in another one (it must never appear as related to them).
$blog_cats = array();
foreach ( array( 'prueba-uno' => 'Categoría uno', 'prueba-dos' => 'Categoría dos' ) as $slug => $name ) {
	$term                = term_exists( $slug, 'category' ) ?: wp_insert_term( $name, 'category', array( 'slug' => $slug ) );
	$blog_cats[ $slug ] = (int) $term['term_id'];
}
$blog_text = '<!-- wp:paragraph --><p>' . str_repeat( 'Texto de una entrada de prueba para medir el tiempo de lectura. ', 40 ) . '</p><!-- /wp:paragraph -->';
foreach ( array( 'a' => 'prueba-uno', 'b' => 'prueba-uno', 'c' => 'prueba-dos' ) as $letter => $cat ) {
	$existing_post = get_page_by_path( 'prueba-blog-' . $letter, OBJECT, 'post' );
	wp_insert_post(
		array(
			'ID'            => $existing_post ? $existing_post->ID : 0,
			'post_type'     => 'post',
			'post_status'   => 'publish',
			'post_title'    => 'Entrada de prueba ' . strtoupper( $letter ),
			'post_name'     => 'prueba-blog-' . $letter,
			'post_content'  => wp_slash( $blog_text ),
			'post_category' => array( $blog_cats[ $cat ] ),
			'post_author'   => 1,
		)
	);
}

flush_rewrite_rules();
echo 'estrategia-web-setup page_id=' . (int) $page_id . ' locale=' . get_locale() . ' theme=' . get_stylesheet() . "\n";
