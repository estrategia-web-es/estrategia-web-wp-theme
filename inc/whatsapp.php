<?php
/**
 * Opciones del sitio para armazon/whatsapp: el número y el mensaje viven en
 * un solo sitio y no en cada página. Documentación en
 * blocks/whatsapp/render.php.
 *
 * Se cambian sin pantalla propia (no se hace una página de ajustes para dos
 * campos):
 *     wp option update armazon_whatsapp_phone 34600111222
 *     wp option update armazon_whatsapp_message "Hola, os escribo desde la web"
 * o por REST en /wp/v2/settings (por eso show_in_rest).
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the WhatsApp site options.
 */
function armazon_whatsapp_register_settings(): void {
	register_setting(
		'general',
		'armazon_whatsapp_phone',
		array(
			'type'              => 'string',
			'description'       => __( 'WhatsApp phone number in international format, digits only.', 'armazon' ),
			'sanitize_callback' => static fn( $value ) => preg_replace( '/\D+/', '', (string) $value ),
			'show_in_rest'      => true,
			'default'           => '',
		)
	);
	register_setting(
		'general',
		'armazon_whatsapp_message',
		array(
			'type'              => 'string',
			'description'       => __( 'Predefined WhatsApp message.', 'armazon' ),
			'sanitize_callback' => 'sanitize_text_field',
			'show_in_rest'      => true,
			'default'           => '',
		)
	);
}
add_action( 'init', 'armazon_whatsapp_register_settings' );
