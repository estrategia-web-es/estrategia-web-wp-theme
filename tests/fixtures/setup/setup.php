<?php
/**
 * Seed of the test WordPress (Playground). Called by the blueprint
 * (tests/fixtures/blueprint.json) with runPHP after WordPress loads.
 *
 * It leaves: pretty permalinks, the site's WhatsApp option, and the page
 * /prueba-modulos/ with the parent's blocks; /prueba-carrusel-consulta/ with
 * six posts in a carousel with core/query; /prueba-acordeon/ with a
 * core/accordion with a long answer (0.4.0); /prueba-carrusel-bucle/ and
 * /prueba-mapa-estatico/ (0.5.0); /prueba-mapa-sin-datos/ and a single-slide
 * carousel on /prueba-carrusel-bucle/ (0.6.0), and on that same page one with
 * three slides and 2.4 in view (0.7.2); /prueba-anclas/ with a link to a
 * #destino far below (0.7.3). It is idempotent: if the page or the post
 * already exists, it rewrites it.
 *
 * The content (titles, labels, texts) is in Spanish on purpose: it is test
 * data for a Spanish site and the tests look for those literals.
 *
 * @package estrategia-web
 */

update_option( 'permalink_structure', '/%postname%/' );
update_option( 'estrategia_web_whatsapp_phone', '34611223344' );
update_option( 'estrategia_web_whatsapp_message', 'Mensaje desde la opción del sitio' );

// 1.1.0: the blocks no longer belong to the theme but to the Estrategia Web
// plugin (mounted by tests/server.mjs). Only its BLOCK modules: without
// "consent", as before 1.1.0, to keep testing that the map works without a
// cookie notice (tests/map.test.mjs), and without "site" or "forms", which
// have no role here.
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

// Carousel with a Query inside (0.2.0): six posts and a page whose carousel
// holds a core/query; each <li> of its post-template is a slide.
for ( $i = 1; $i <= 6; $i++ ) {
	$slug = 'entrada-carrusel-' . $i;
	$post = get_page_by_path( $slug, OBJECT, 'post' );
	wp_insert_post(
		array(
			'ID'          => $post ? $post->ID : 0,
			'post_type'   => 'post',
			'post_status' => 'publish',
			'post_title'  => 'Entrada carrusel ' . $i,
			'post_name'   => $slug,
		)
	);
}

// The query of the six posts, for the two carousels that use it.
$query_block = static fn( int $id ): string => '<!-- wp:query {"queryId":' . $id . ',"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","search":"carrusel","inherit":false}} -->'
	. '<div class="wp-block-query"><!-- wp:post-template -->'
	. '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
	. '<div class="wp-block-group has-surface-background-color has-background"><!-- wp:post-title /--></div>'
	. '<!-- /wp:group -->'
	. '<!-- /wp:post-template --></div>'
	. '<!-- /wp:query -->';

// Looping carousel (0.5.0): one with blocks and one with a query, WITHOUT the
// loop attribute, to also test that looping is the default.
$loop_content = '<!-- wp:estrategia-web/carousel {"label":"Carrusel en bucle","showDots":true,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $slides
	. '<!-- /wp:estrategia-web/carousel -->'
	. '<!-- wp:estrategia-web/carousel {"label":"Carrusel en bucle con consulta","showDots":true,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $query_block( 9 )
	. '<!-- /wp:estrategia-web/carousel -->'
	// Infinite (0.6.0): in a two-row grid (the CSS is set by the test child,
	// class rejilla-prueba), six posts = three columns.
	. '<!-- wp:estrategia-web/carousel {"label":"Carrusel en dos filas","className":"rejilla-prueba"} -->'
	. $query_block( 10 )
	. '<!-- /wp:estrategia-web/carousel -->'
	// 0.7.2: three slides and 2.4 in view (Lavandería's home page): no
	// rotation can shift a whole one and the step is animated separately.
	. '<!-- wp:estrategia-web/carousel {"label":"Carrusel con una de más","showDots":true,"perViewMobile":1,"perViewTablet":2.4,"perViewDesktop":2.4} -->'
	. implode( '<!-- /wp:group -->', array_slice( explode( '<!-- /wp:group -->', $slides ), 0, 3 ) ) . '<!-- /wp:group -->'
	. '<!-- /wp:estrategia-web/carousel -->'
	// Infinite (0.6.0): with a single slide there is nothing to do.
	. '<!-- wp:estrategia-web/carousel {"label":"Carrusel de una","showDots":true} -->'
	. '<!-- wp:paragraph --><p>Única diapositiva</p><!-- /wp:paragraph -->'
	. '<!-- /wp:estrategia-web/carousel -->';

$existing_loop = get_page_by_path( 'prueba-carrusel-bucle' );
wp_insert_post(
	array(
		'ID'           => $existing_loop ? $existing_loop->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de carrusel en bucle',
		'post_name'    => 'prueba-carrusel-bucle',
		'post_content' => wp_slash( $loop_content ),
	)
);

$query_content = '<!-- wp:estrategia-web/carousel {"label":"Carrusel con consulta","showDots":true,"loop":false,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. '<!-- wp:query {"queryId":7,"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","search":"carrusel","inherit":false}} -->'
	. '<div class="wp-block-query"><!-- wp:post-template -->'
	. '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
	. '<div class="wp-block-group has-surface-background-color has-background"><!-- wp:post-title /--></div>'
	. '<!-- /wp:group -->'
	. '<!-- /wp:post-template --></div>'
	. '<!-- /wp:query -->'
	. '<!-- /wp:estrategia-web/carousel -->';

$existing_query = get_page_by_path( 'prueba-carrusel-consulta' );
wp_insert_post(
	array(
		'ID'           => $existing_query ? $existing_query->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de carrusel con consulta',
		'post_name'    => 'prueba-carrusel-consulta',
		'post_content' => wp_slash( $query_content ),
	)
);

// Map inside a Query (0.2.0): two posts with their address in a field
// (prueba_direccion, registered by the test child) and the first one with a
// featured image; the map binds the address with core/post-meta and, without
// an image of its own, uses the post's featured image.
$png        = base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
$upload     = wp_upload_bits( 'mapa-estatico-prueba.png', null, $png );
$attachment = wp_insert_attachment(
	array(
		'post_title'     => 'Mapa estático de prueba',
		'post_mime_type' => 'image/png',
		'post_status'    => 'inherit',
	),
	$upload['file']
);
for ( $i = 1; $i <= 2; $i++ ) {
	$slug    = 'entrada-mapa-' . $i;
	$post    = get_page_by_path( $slug, OBJECT, 'post' );
	$post_id = wp_insert_post(
		array(
			'ID'          => $post ? $post->ID : 0,
			'post_type'   => 'post',
			'post_status' => 'publish',
			'post_title'  => 'Entrada mapa ' . $i,
			'post_name'   => $slug,
			'meta_input'  => array( 'prueba_direccion' => 'Calle de Prueba ' . $i . ', Palma' ),
		)
	);
	if ( 1 === $i ) {
		set_post_thumbnail( $post_id, $attachment );
	} else {
		delete_post_thumbnail( $post_id );
	}
}

$map_content = '<!-- wp:query {"queryId":8,"query":{"perPage":2,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","search":"mapa","inherit":false}} -->'
	. '<div class="wp-block-query"><!-- wp:post-template -->'
	. '<!-- wp:post-title /-->'
	. '<!-- wp:estrategia-web/map {"embedUrl":"https://www.google.com/maps/embed?pb=!1m18!1m12","useFeaturedImage":true,"metadata":{"bindings":{"address":{"source":"core/post-meta","args":{"key":"prueba_direccion"}}}}} /-->'
	. '<!-- /wp:post-template --></div>'
	. '<!-- /wp:query -->';

$existing_map = get_page_by_path( 'prueba-mapa-consulta' );
wp_insert_post(
	array(
		'ID'           => $existing_map ? $existing_map->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de mapa en una consulta',
		'post_name'    => 'prueba-mapa-consulta',
		'post_content' => wp_slash( $map_content ),
	)
);

// Static map (0.5.0): two maps. The first with the OSM image generated by
// tools/static-map.mjs (it is in this folder, which Playground serves at
// /wp-content/estrategia-web-fixtures/); the second with a URL from ANOTHER
// domain, which the block must discard (zero third-party requests).
$embed          = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3075.5!2d2.6502!3d39.5696';
$static_content = '<!-- wp:estrategia-web/map {"placeName":"Sede con mapa estático","address":"Plaça de Cort 1, 07001 Palma","phone":"+34 971 22 59 00","embedUrl":"' . $embed . '","staticMapUrl":"/wp-content/estrategia-web-fixtures/mapa-estatico.webp"} /-->'
	. '<!-- wp:estrategia-web/map {"placeName":"Sede con mapa de fuera","address":"Calle de Fuera 1, Palma","embedUrl":"' . $embed . '","staticMapUrl":"https://tile.openstreetmap.org/16/33248/24911.png"} /-->';

$existing_static = get_page_by_path( 'prueba-mapa-estatico' );
wp_insert_post(
	array(
		'ID'           => $existing_static ? $existing_static->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de mapa estático',
		'post_name'    => 'prueba-mapa-estatico',
		'post_content' => wp_slash( $static_content ),
	)
);

// Map without its details box (0.6.0, showDetails:false): the location's card
// already shows the address next to it. The first with a static map, the
// second without an image; both with the address bound (for "Open in Google
// Maps").
$details_content = '<!-- wp:paragraph --><p class="ficha-sede">Plaça de Cort 1, 07001 Palma</p><!-- /wp:paragraph -->'
	. '<!-- wp:estrategia-web/map {"showDetails":false,"placeName":"Sede sin recuadro","address":"Plaça de Cort 1, 07001 Palma","embedUrl":"' . $embed . '","staticMapUrl":"/wp-content/estrategia-web-fixtures/mapa-estatico.webp"} /-->'
	. '<!-- wp:estrategia-web/map {"showDetails":false,"placeName":"Sede sin recuadro ni imagen","address":"Calle Sin Imagen 2, Palma","embedUrl":"' . $embed . '"} /-->';

$existing_details = get_page_by_path( 'prueba-mapa-sin-datos' );
wp_insert_post(
	array(
		'ID'           => $existing_details ? $existing_details->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de mapa sin datos',
		'post_name'    => 'prueba-mapa-sin-datos',
		'post_content' => wp_slash( $details_content ),
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

// Photo carousel (0.7.4): four 1920x1280 photos (with their intermediate
// sizes, so that there is a srcset) in a full-width carousel at the TOP of the
// page, 1/2/3 in view, and another one of three FAR BELOW. To see which slides
// get priority, which are deferred and that sizes lets the browser pick a
// photo the size of its slot. The photos are drawn here with GD: a gradient
// with a number, nothing to download.
require_once ABSPATH . 'wp-admin/includes/image.php';
$photo_block = static function ( int $n ): string {
	$name     = 'foto-carrusel-' . $n . '.jpg';
	$existing = get_posts( array( 'post_type' => 'attachment', 'name' => 'foto-carrusel-' . $n, 'posts_per_page' => 1, 'post_status' => 'inherit' ) );
	if ( $existing ) {
		$id = $existing[0]->ID;
	} else {
		$image = imagecreatetruecolor( 1920, 1280 );
		for ( $x = 0; $x < 1920; $x += 16 ) {
			imagefilledrectangle( $image, $x, 0, $x + 15, 1279, imagecolorallocate( $image, ( $x / 8 ) % 256, ( 40 * $n ) % 256, 160 ) );
		}
		imagestring( $image, 5, 900, 620, 'Foto ' . $n, imagecolorallocate( $image, 255, 255, 255 ) );
		ob_start();
		imagejpeg( $image, null, 70 );
		$upload = wp_upload_bits( $name, null, (string) ob_get_clean() );
		$id     = wp_insert_attachment(
			array(
				'post_title'     => 'Foto carrusel ' . $n,
				'post_name'      => 'foto-carrusel-' . $n,
				'post_mime_type' => 'image/jpeg',
				'post_status'    => 'inherit',
			),
			$upload['file']
		);
		wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );
	}
	$url = wp_get_attachment_url( $id );
	return '<!-- wp:image {"id":' . $id . ',"sizeSlug":"full","linkDestination":"none"} -->'
		. '<figure class="wp-block-image size-full"><img src="' . esc_url( $url ) . '" alt="Foto ' . $n . '" class="wp-image-' . $id . '"/></figure>'
		. '<!-- /wp:image -->';
};
$photos_content = '<!-- wp:estrategia-web/carousel {"label":"Fotos arriba","align":"full","perViewMobile":1,"perViewTablet":2,"perViewDesktop":3} -->'
	. $photo_block( 1 ) . $photo_block( 2 ) . $photo_block( 3 ) . $photo_block( 4 )
	. '<!-- /wp:estrategia-web/carousel -->'
	. '<!-- wp:spacer {"height":"3000px"} --><div style="height:3000px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->'
	. '<!-- wp:estrategia-web/carousel {"label":"Fotos abajo","perViewMobile":1,"perViewTablet":1,"perViewDesktop":1} -->'
	. $photo_block( 5 ) . $photo_block( 6 ) . $photo_block( 7 )
	. '<!-- /wp:estrategia-web/carousel -->';

$existing_photos = get_page_by_path( 'prueba-carrusel-fotos' );
wp_insert_post(
	array(
		'ID'           => $existing_photos ? $existing_photos->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de carrusel de fotos',
		'post_name'    => 'prueba-carrusel-fotos',
		'post_content' => wp_slash( $photos_content ),
	)
);

// Mobile crop (plugin 1.1.x, mobileRatio): photos 1-3, landscape (1920×1280),
// in a carousel whose box on mobile is 4/5. Checked by
// tests/carousel-mobile-crop.test.mjs. Since plugin 1.4.2 it also asks for the
// desktop preload of slide 2 (preloadSlides 2, Lavandería's case: crop on
// mobile + two slides visible on desktop): tests/carousel-preload.test.mjs.
$existing_crop = get_page_by_path( 'prueba-carrusel-movil' );
wp_insert_post(
	array(
		'ID'           => $existing_crop ? $existing_crop->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Prueba de carrusel con recorte para el móvil',
		'post_name'    => 'prueba-carrusel-movil',
		'post_content' => wp_slash(
			'<!-- wp:estrategia-web/carousel {"label":"Fotos recortadas","align":"full","perViewMobile":1,"perViewTablet":2,"perViewDesktop":3,"mobileRatio":"4/5","mobileImageSizes":"100vw","preloadSlides":2} -->'
			. $photo_block( 1 ) . $photo_block( 2 ) . $photo_block( 3 )
			. '<!-- /wp:estrategia-web/carousel -->'
		),
	)
);

flush_rewrite_rules();
echo 'estrategia-web-setup page_id=' . (int) $page_id . ' locale=' . get_locale() . ' theme=' . get_stylesheet() . "\n";
