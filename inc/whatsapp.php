<?php
/**
 * Opciones del sitio para estrategia-web/whatsapp: el número y el mensaje viven en
 * un solo sitio y no en cada página. Documentación en
 * blocks/whatsapp/render.php.
 *
 * Se cambian sin pantalla propia (no se hace una página de ajustes para dos
 * campos):
 *     wp option update estrategia_web_whatsapp_phone 34600111222
 *     wp option update estrategia_web_whatsapp_message "Hola, os escribo desde la web"
 * o por REST en /wp/v2/settings (por eso show_in_rest).
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the WhatsApp site options.
 */
function estrategia_web_whatsapp_register_settings(): void {
	register_setting(
		'general',
		'estrategia_web_whatsapp_phone',
		array(
			'type'              => 'string',
			'description'       => __( 'WhatsApp phone number in international format, digits only.', 'estrategia-web' ),
			'sanitize_callback' => static fn( $value ) => preg_replace( '/\D+/', '', (string) $value ),
			'show_in_rest'      => true,
			'default'           => '',
		)
	);
	register_setting(
		'general',
		'estrategia_web_whatsapp_message',
		array(
			'type'              => 'string',
			'description'       => __( 'Predefined WhatsApp message.', 'estrategia-web' ),
			'sanitize_callback' => 'sanitize_text_field',
			'show_in_rest'      => true,
			'default'           => '',
		)
	);
}
add_action( 'init', 'estrategia_web_whatsapp_register_settings' );
