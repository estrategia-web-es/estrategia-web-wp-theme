<?php
/**
 * armazon/consent — botón para reabrir el aviso de cookies (para el pie).
 *
 * El aviso, las categorías y la API (PHP y JS) están en inc/consent.php; su
 * cabecera es la documentación del módulo entero. Este bloque solo pinta un
 * botón que llama a actions.open del store «armazon/consent».
 *
 * Decisiones:
 * - Es un <button>, no un <a href="#">: abre algo en la página, no navega.
 * - Si el sitio no declara categorías opcionales no pinta nada (no hay aviso
 *   que reabrir). En el editor sí enseña una nota, para que no parezca roto.
 *
 * Cómo se mantiene: si cambia el nombre de la acción en view.js, cambia aquí.
 * La trampa: este bloque y el aviso comparten store; si el aviso no está en la
 * página (sin categorías), el botón no tendría a quién abrir, por eso no sale.
 *
 * @package armazon
 *
 * @var array $attributes Block attributes.
 */

defined( 'ABSPATH' ) || exit;

if ( ! armazon_consent_categories() ) {
	if ( wp_is_serving_rest_request() ) {
		printf(
			'<p %s>%s</p>',
			get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput
			esc_html__( 'Cookie settings: this site declares no optional cookie categories, so there is no notice to reopen and this link is not shown.', 'armazon' )
		);
	}
	return;
}

$armazon_label = '' !== trim( (string) $attributes['label'] ) ? $attributes['label'] : __( 'Cookie settings', 'armazon' );
?>
<p <?php echo get_block_wrapper_attributes( array( 'class' => 'armazon-consent-link' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>>
	<button
		type="button"
		class="armazon-consent-link__button"
		aria-controls="armazon-consent"
		data-wp-interactive="armazon/consent"
		data-wp-on--click="actions.open"
	><?php echo esc_html( $armazon_label ); ?></button>
</p>
