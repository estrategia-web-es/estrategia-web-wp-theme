<?php
/**
 * armazon/map — mapa «en dos clics».
 *
 * Qué es: una imagen estática (de la mediateca) con la dirección, un botón
 * «Ver mapa» que SOLO ENTONCES pone el iframe de Google Maps, y un enlace
 * «Abrir en Google Maps». Antes del clic no se pide nada a Google: el iframe
 * está en el HTML sin src (about:blank) y view.js le pone la URL.
 *
 * Decisiones:
 * - El clic del visitante es el consentimiento para ESA carga, por eso el mapa
 *   no necesita aviso de cookies. Debajo del botón se dice qué pasa al pulsar.
 * - Si el sitio declara la categoría «maps» en el consentimiento
 *   (inc/consent.php) y el visitante la aceptó, el mapa carga directo, también
 *   si la acepta después con la página abierta (evento armazon:consent).
 * - La URL de embed se valida: https, host www.google.com o maps.google.com y
 *   ruta /maps/embed. Se acepta pegar el <iframe> entero que da Google
 *   (Compartir › Insertar un mapa): se saca el src.
 * - Sin imagen elegida sale un recuadro neutro con la dirección.
 * - Editor: edit.js (script clásico) por el selector de imagen de la
 *   mediateca, que autoRegister no ofrece; la vista previa es ServerSideRender.
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Cuándo: si Google cambia el formato de la URL
 *   de embed (se ajusta armazon_map_embed_url) o al añadir un proveedor.
 * - Caso frontera: otro proveedor (OpenStreetMap) es un AJUSTE si es otra URL
 *   de iframe con la misma mecánica: se amplía la validación aquí. Un mapa con
 *   marcadores propios y JS del proveedor es OTRA COSA: bloque del hijo.
 * - La trampa que costó la tarde (01-10-2026): el iframe NO lleva
 *   loading="lazy". Con lazy, si el src se pone al hidratar (consentimiento
 *   ya aceptado) mientras el iframe aún está oculto, Chrome no lo carga nunca:
 *   src puesto, frame en about:blank, recuadro en blanco. Sin src no se carga
 *   nada de todos modos, así que lazy no ahorraba nada.
 * - Otra: el enlace «Abrir en Google Maps» es un <a> normal y no hace
 *   ninguna petición hasta que se pulsa; las pruebas miran PETICIONES, no
 *   apariciones de «google.com» en el HTML, que las hay por diseño.
 *
 * @package armazon
 *
 * @var array $attributes Block attributes.
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'armazon_map_embed_url' ) ) {
	/**
	 * Returns a safe Google Maps embed URL, or '' if the value is not one.
	 * Accepts the bare URL or the whole <iframe> code Google gives.
	 *
	 * @param string $value Attribute value.
	 */
	function armazon_map_embed_url( string $value ): string {
		$value = trim( html_entity_decode( $value ) );
		if ( preg_match( '/src\s*=\s*["\']([^"\']+)["\']/i', $value, $match ) ) {
			$value = $match[1];
		}
		$parts = wp_parse_url( $value );
		if ( empty( $parts['scheme'] ) || 'https' !== $parts['scheme'] || empty( $parts['host'] ) ) {
			return '';
		}
		if ( ! in_array( $parts['host'], array( 'www.google.com', 'maps.google.com' ), true ) ) {
			return '';
		}
		if ( empty( $parts['path'] ) || ! str_starts_with( $parts['path'], '/maps/embed' ) ) {
			return '';
		}
		return esc_url_raw( $value );
	}
}

$armazon_address   = trim( (string) $attributes['address'] );
$armazon_embed     = armazon_map_embed_url( (string) $attributes['embedUrl'] );
$armazon_maps_url  = trim( (string) $attributes['mapsUrl'] );
if ( '' === $armazon_maps_url && '' !== $armazon_address ) {
	$armazon_maps_url = 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( $armazon_address );
}

if ( '' === $armazon_embed && '' === $armazon_maps_url ) {
	if ( wp_is_serving_rest_request() ) {
		printf(
			'<p %s>%s</p>',
			get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput
			esc_html__( 'Map: add the address and the Google Maps embed URL in the block settings.', 'armazon' )
		);
	}
	return;
}

$armazon_image = '';
if ( $attributes['imageId'] ) {
	$armazon_image = wp_get_attachment_image(
		(int) $attributes['imageId'],
		'large',
		false,
		array(
			'class'               => 'armazon-map__image',
			'alt'                 => $attributes['imageAlt'],
			'loading'             => 'lazy',
			'data-wp-bind--hidden' => 'context.loaded',
		)
	);
}
if ( '' === $armazon_image && '' !== $attributes['imageUrl'] ) {
	$armazon_image = sprintf(
		'<img class="armazon-map__image" src="%s" alt="%s" loading="lazy" data-wp-bind--hidden="context.loaded">',
		esc_url( $attributes['imageUrl'] ),
		esc_attr( $attributes['imageAlt'] )
	);
}

$armazon_title = '' !== $armazon_address
	/* translators: %s: postal address. */
	? sprintf( __( 'Map: %s', 'armazon' ), $armazon_address )
	: __( 'Map', 'armazon' );
?>
<figure
	<?php echo get_block_wrapper_attributes( array( 'class' => 'armazon-map' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	data-wp-interactive="armazon/map"
	<?php echo wp_interactivity_data_wp_context( array( 'loaded' => false, 'embedUrl' => $armazon_embed ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	data-wp-init="callbacks.init"
	data-wp-class--is-loaded="context.loaded"
>
	<div class="armazon-map__frame">
		<?php if ( '' !== $armazon_image ) : ?>
			<?php echo $armazon_image; // phpcs:ignore WordPress.Security.EscapeOutput -- built with escaping above. ?>
		<?php else : ?>
			<div class="armazon-map__placeholder" aria-hidden="true" data-wp-bind--hidden="context.loaded"></div>
		<?php endif; ?>
		<?php if ( '' !== $armazon_embed ) : ?>
		<iframe
			class="armazon-map__iframe"
			title="<?php echo esc_attr( $armazon_title ); ?>"
			hidden
			data-wp-bind--hidden="!context.loaded"
			data-wp-bind--src="state.src"
			referrerpolicy="strict-origin-when-cross-origin"
			allowfullscreen
		></iframe>
		<?php endif; ?>
	</div>
	<figcaption class="armazon-map__caption">
		<?php if ( '' !== $armazon_address ) : ?>
		<address class="armazon-map__address"><?php echo esc_html( $armazon_address ); ?></address>
		<?php endif; ?>
		<?php if ( '' !== $armazon_embed ) : ?>
		<div class="armazon-map__actions" data-wp-bind--hidden="context.loaded">
			<button type="button" class="wp-element-button armazon-map__load" data-wp-on--click="actions.load"><?php esc_html_e( 'Show map', 'armazon' ); ?></button>
			<p class="armazon-map__notice"><?php esc_html_e( 'The map is served by Google. Loading it sends your IP address to Google, which may set its own cookies.', 'armazon' ); ?></p>
		</div>
		<?php endif; ?>
		<?php if ( '' !== $armazon_maps_url ) : ?>
		<a class="armazon-map__link" href="<?php echo esc_url( $armazon_maps_url ); ?>" target="_blank" rel="noopener noreferrer">
			<?php esc_html_e( 'Open in Google Maps', 'armazon' ); ?><span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'armazon' ); ?></span>
		</a>
		<?php endif; ?>
	</figcaption>
</figure>
