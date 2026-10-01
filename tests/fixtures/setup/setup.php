<?php
/**
 * Siembra del WordPress de pruebas (Playground). La llama el blueprint
 * (tests/fixtures/blueprint.json) con runPHP después de cargar WordPress.
 *
 * Deja: enlaces permanentes bonitos, la opción de WhatsApp del sitio, y la
 * página /prueba-modulos/ con los cuatro bloques. Es idempotente: si la
 * página ya existe, la reescribe.
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
	. '<!-- wp:armazon/carousel {"label":"Carrusel de prueba","showDots":true,"perViewMobile":1,"perViewTablet":2,"perViewDesktop":2} -->'
	. $slides
	. '<!-- /wp:armazon/carousel -->'
	. '<!-- wp:heading --><h2 class="wp-block-heading">Mapa</h2><!-- /wp:heading -->'
	. '<!-- wp:armazon/map {"address":"Plaça de Cort 1, 07001 Palma","embedUrl":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3075.5!2d2.6502!3d39.5696!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMznCsDM0JzEwLjYiTiAywrAzOScwMC43IkU!5e0!3m2!1ses!2ses!4v1700000000000"} /-->'
	. '<!-- wp:armazon/consent /-->'
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

flush_rewrite_rules();
echo 'armazon-setup page_id=' . (int) $page_id . ' locale=' . get_locale() . ' theme=' . get_stylesheet() . "\n";
