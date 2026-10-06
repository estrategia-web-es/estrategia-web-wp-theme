<?php
/**
 * Siembra del WordPress de pruebas (Playground). La llama el blueprint
 * (tests/fixtures/blueprint.json) con runPHP después de cargar WordPress.
 *
 * Deja: enlaces permanentes bonitos, la opción de WhatsApp del sitio, y la
 * página /prueba-modulos/ con los bloques del padre; y /prueba-carrusel-consulta/
 * con seis entradas en un carrusel con core/query; y /prueba-acordeon/ con
 * un core/accordion de respuesta larga (0.4.0); /prueba-carrusel-bucle/ y
 * /prueba-mapa-estatico/ (0.5.0); /prueba-mapa-sin-datos/ y un carrusel de una
 * sola diapositiva en /prueba-carrusel-bucle/ (0.6.0), y allí mismo uno de
 * tres diapositivas con 2,4 a la vista (0.7.2). Es idempotente: si la
 * página o la entrada ya existe, la reescribe.
 *
 * @package armazon
 */

update_option( 'permalink_structure', '/%postname%/' );
update_option( 'armazon_whatsapp_phone', '34611223344' );
update_option( 'armazon_whatsapp_message', 'Mensaje desde la opción del sitio' );

$slides = '';
for ( $i = 1; $i <= 5; $i++ ) {
	$slides .= '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
		. '<div class="wp-block-group has-surface-background-color has-background">'
		. '<!-- wp:paragraph --><p>Diapositiva ' . $i . '</p><!-- /wp:paragraph -->'
		. '</div><!-- /wp:group -->';
}

$content = '<!-- wp:heading --><h2 class="wp-block-heading">Carrusel</h2><!-- /wp:heading -->'
	. '<!-- wp:armazon/carousel {"label":"Carrusel de prueba","showDots":true,"loop":false,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $slides
	. '<!-- /wp:armazon/carousel -->'
	. '<!-- wp:heading --><h2 class="wp-block-heading">Mapa</h2><!-- /wp:heading -->'
	. '<!-- wp:armazon/map {"placeName":"Ayuntamiento de prueba","address":"Plaça de Cort 1, 07001 Palma","phone":"+34 971 22 59 00","hours":"De lunes a viernes\nDe 9:00 a 14:00","embedUrl":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3075.5!2d2.6502!3d39.5696!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMznCsDM0JzEwLjYiTiAywrAzOScwMC43IkU!5e0!3m2!1ses!2ses!4v1700000000000"} /-->'
	. '<!-- wp:armazon/whatsapp {"phone":"+34 600 11 12 22","message":"Hola, ¿tenéis hora mañana?","position":"bottom-left"} /-->';

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

// Carrusel con una Consulta dentro (0.2.0): seis entradas y una página cuyo
// carrusel lleva un core/query; cada <li> de su post-template es diapositiva.
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

// La consulta de las seis entradas, para los dos carruseles que la usan.
$query_block = static fn( int $id ): string => '<!-- wp:query {"queryId":' . $id . ',"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","search":"carrusel","inherit":false}} -->'
	. '<div class="wp-block-query"><!-- wp:post-template -->'
	. '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
	. '<div class="wp-block-group has-surface-background-color has-background"><!-- wp:post-title /--></div>'
	. '<!-- /wp:group -->'
	. '<!-- /wp:post-template --></div>'
	. '<!-- /wp:query -->';

// Carrusel en bucle (0.5.0): uno de bloques y uno con consulta, SIN el
// atributo loop, para probar también que el bucle es el valor por defecto.
$loop_content = '<!-- wp:armazon/carousel {"label":"Carrusel en bucle","showDots":true,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $slides
	. '<!-- /wp:armazon/carousel -->'
	. '<!-- wp:armazon/carousel {"label":"Carrusel en bucle con consulta","showDots":true,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $query_block( 9 )
	. '<!-- /wp:armazon/carousel -->'
	// Infinito (0.6.0): en rejilla de dos filas (la CSS la pone el hijo de
	// prueba, clase rejilla-prueba), seis entradas = tres columnas.
	. '<!-- wp:armazon/carousel {"label":"Carrusel en dos filas","className":"rejilla-prueba"} -->'
	. $query_block( 10 )
	. '<!-- /wp:armazon/carousel -->'
	// 0.7.2: tres diapositivas y 2,4 a la vista (la portada de Lavandería):
	// ninguna rotación deja desplazar una entera y el paso se anima aparte.
	. '<!-- wp:armazon/carousel {"label":"Carrusel con una de más","showDots":true,"perViewMobile":1,"perViewTablet":2.4,"perViewDesktop":2.4} -->'
	. implode( '<!-- /wp:group -->', array_slice( explode( '<!-- /wp:group -->', $slides ), 0, 3 ) ) . '<!-- /wp:group -->'
	. '<!-- /wp:armazon/carousel -->'
	// Infinito (0.6.0): con una sola diapositiva no hay nada que hacer.
	. '<!-- wp:armazon/carousel {"label":"Carrusel de una","showDots":true} -->'
	. '<!-- wp:paragraph --><p>Única diapositiva</p><!-- /wp:paragraph -->'
	. '<!-- /wp:armazon/carousel -->';

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

$query_content = '<!-- wp:armazon/carousel {"label":"Carrusel con consulta","showDots":true,"loop":false,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. '<!-- wp:query {"queryId":7,"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","search":"carrusel","inherit":false}} -->'
	. '<div class="wp-block-query"><!-- wp:post-template -->'
	. '<!-- wp:group {"backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48","left":"var:preset|spacing|24","right":"var:preset|spacing|24"}}}} -->'
	. '<div class="wp-block-group has-surface-background-color has-background"><!-- wp:post-title /--></div>'
	. '<!-- /wp:group -->'
	. '<!-- /wp:post-template --></div>'
	. '<!-- /wp:query -->'
	. '<!-- /wp:armazon/carousel -->';

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

// Mapa dentro de una Consulta (0.2.0): dos entradas con su dirección en un
// campo (prueba_direccion, registrado por el hijo de prueba) y la primera con
// imagen destacada; el mapa enlaza la dirección con core/post-meta y, sin
// imagen propia, usa la destacada de la entrada.
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
	. '<!-- wp:armazon/map {"embedUrl":"https://www.google.com/maps/embed?pb=!1m18!1m12","useFeaturedImage":true,"metadata":{"bindings":{"address":{"source":"core/post-meta","args":{"key":"prueba_direccion"}}}}} /-->'
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

// Mapa estático (0.5.0): dos mapas. El primero con la imagen de OSM que
// generó tools/static-map.mjs (está en esta carpeta, que Playground sirve en
// /wp-content/armazon-fixtures/); el segundo con una URL de OTRO dominio, que
// el bloque tiene que descartar (cero peticiones a terceros).
$embed          = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3075.5!2d2.6502!3d39.5696';
$static_content = '<!-- wp:armazon/map {"placeName":"Sede con mapa estático","address":"Plaça de Cort 1, 07001 Palma","phone":"+34 971 22 59 00","embedUrl":"' . $embed . '","staticMapUrl":"/wp-content/armazon-fixtures/mapa-estatico.webp"} /-->'
	. '<!-- wp:armazon/map {"placeName":"Sede con mapa de fuera","address":"Calle de Fuera 1, Palma","embedUrl":"' . $embed . '","staticMapUrl":"https://tile.openstreetmap.org/16/33248/24911.png"} /-->';

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

// Mapa sin su recuadro de datos (0.6.0, showDetails:false): la ficha de la
// sede ya dice la dirección al lado. El primero con mapa estático, el segundo
// sin imagen; los dos con la dirección enlazada (para «Abrir en Google Maps»).
$details_content = '<!-- wp:paragraph --><p class="ficha-sede">Plaça de Cort 1, 07001 Palma</p><!-- /wp:paragraph -->'
	. '<!-- wp:armazon/map {"showDetails":false,"placeName":"Sede sin recuadro","address":"Plaça de Cort 1, 07001 Palma","embedUrl":"' . $embed . '","staticMapUrl":"/wp-content/armazon-fixtures/mapa-estatico.webp"} /-->'
	. '<!-- wp:armazon/map {"showDetails":false,"placeName":"Sede sin recuadro ni imagen","address":"Calle Sin Imagen 2, Palma","embedUrl":"' . $embed . '"} /-->';

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

// Acordeón del núcleo (0.4.0): dos preguntas, la primera con una respuesta
// larga, para ver que la altura del panel se anima al abrir y al cerrar.
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

flush_rewrite_rules();
echo 'armazon-setup page_id=' . (int) $page_id . ' locale=' . get_locale() . ' theme=' . get_stylesheet() . "\n";
