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
 * - Si el sitio declara la categoría «maps» en el consentimiento (el aviso de
 *   cookies del plugin armazon-site desde la 0.7.0 del padre; antes,
 *   inc/consent.php) y el visitante la aceptó, el mapa carga directo, también
 *   si la acepta después con la página abierta (evento armazon:consent).
 *   SIN EL PLUGIN el mapa funciona igual: imagen estática o recuadro, y
 *   «Ver mapa» carga ese mapa al pulsar. Solo habla con el aviso por su
 *   contrato JS (window.armazonConsent?.…, el evento), nunca por PHP, para no
 *   depender de que esté (tests/map.test.mjs corre sin él).
 * - La URL de embed se valida: https, host www.google.com o maps.google.com y
 *   ruta /maps/embed. Se acepta pegar el <iframe> entero que da Google
 *   (Compartir › Insertar un mapa): se saca el src.
 * - Sin imagen elegida sale un recuadro neutro con la dirección.
 * - Editor: edit.js (script clásico) por el selector de imagen de la
 *   mediateca, que autoRegister no ofrece; la vista previa es ServerSideRender.
 * - SIN IMAGEN por defecto (0.3.0): antes del clic se ve un recuadro con los
 *   DATOS del sitio en texto (nombre, dirección, teléfono con tel:, horario),
 *   con los colores del tema, y debajo «Ver mapa» y «Abrir en Google Maps».
 *   Por qué: una captura de Google Maps como foto se veía mal (David,
 *   02-10-2026) y aparentaba un mapa que no se puede mover. La imagen sigue
 *   siendo posible (elegida, o la destacada con useFeaturedImage) pero es la
 *   excepción. Con «maps» aceptado en el consentimiento se pinta el iframe
 *   directamente, como antes.
 *   Caso frontera: el recuadro dice lo que el bloque sabe; los datos de una
 *   sede llegan por bindings (p. ej. la fuente armazon-site/location).
 *   La trampa: las fuentes de bindings devuelven el texto ya escapado y con
 *   <br>; render.php lo devuelve a texto plano antes de escaparlo (si no, sale
 *   «&amp;amp;» o «<br>» a la vista).
 * - MAPA ESTÁTICO (0.5.0, atributos staticMapUrl o staticMapId): una imagen
 *   de OpenStreetMap generada UNA vez con tools/static-map.mjs (marcador del
 *   color de la marca y «© OpenStreetMap» dentro) va DEBAJO del recuadro de
 *   datos, que se mantiene: en ancho, el recuadro flota a la izquierda sobre
 *   el mapa; en estrecho (< 480 px de bloque), va debajo. No es una captura de
 *   Google (su licencia no lo permite y pedirla al visitar manda la IP a
 *   Google sin consentimiento). Se sirve desde el PROPIO sitio:
 *   staticMapUrl es una ruta del tema («assets/maps/sede.webp», se busca en
 *   el hijo y luego en el padre), una ruta del sitio («/wp-content/…») o una
 *   URL del mismo dominio; cualquier otra se descarta (armazon_map_static_url).
 *   staticMapId es la misma imagen subida a la mediateca. Acepta bindings
 *   (cada sede de una Consulta, su mapa). Si hay mapa estático, la «foto»
 *   (imageId/imageUrl/useFeaturedImage) no se usa.
 *   Caso frontera: el mapa estático no se mueve ni hace zoom; quien quiera
 *   moverlo pulsa «Ver mapa», que carga Google y CONCEDE la categoría «maps»
 *   del consentimiento (window.armazonConsent.grant), así los demás mapas de
 *   la web cargan ya sin preguntar. Si la web no declara «maps», el clic solo
 *   carga ese mapa, como antes.
 *   La trampa: el marcador va en el CENTRO de la imagen y el recuadro tapa la
 *   izquierda; por eso el recuadro no pasa del 42 % del ancho. Un hijo que lo
 *   ensanche tapa el marcador.
 * - SIN DATOS (0.6.0, atributo showDetails, por defecto SÍ): con
 *   showDetails:false el bloque no pinta su recuadro de datos (ni la
 *   dirección bajo una foto). Para cuando la ficha de la sede ya los dice al
 *   lado: en Lavandería la dirección salía dos veces, en la ficha y dentro
 *   del mapa. Queda: con mapa estático o foto, SOLO la imagen, y debajo
 *   «Ver mapa» y «Abrir en Google Maps»; sin imagen, solo los botones (el
 *   marco no se pinta hasta que hay mapa: una caja vacía parecería rota).
 *   La dirección se sigue pasando: hace falta para el enlace a Google Maps,
 *   el título del iframe y el texto alternativo del mapa estático.
 *       <!-- wp:armazon/map {"showDetails":false,"metadata":{"bindings":{
 *         "address":…,"embedUrl":…,"staticMapUrl":…}}} /-->
 *   Por qué un atributo y no adivinarlo: el bloque no ve lo que hay al lado
 *   (un hermano en el mismo grupo puede ser la ficha o no). Lo sabe el patrón
 *   del hijo, que es quien lo pone.
 *   Caso frontera: un mapa suelto (página de contacto sin ficha) se queda
 *   con el valor por defecto: sin datos no diría dónde está.
 * - Dentro de una Consulta (0.2.0): sus atributos de texto aceptan Block
 *   Bindings (inc/blocks.php), así que la dirección y la URL de embed pueden
 *   salir de los campos de cada entrada (core/post-meta); y sin imagen
 *   elegida usa la imagen destacada de la entrada (usesContext postId). Así
 *   una lista de sedes que vive en la base de datos lleva cada una su mapa.
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

if ( ! function_exists( 'armazon_map_static_url' ) ) {
	/**
	 * URL of the static map image (0.5.0), only if it is served by THIS site.
	 * A relative path («assets/maps/sede.webp») is a file of the active theme
	 * (the child, then the parent). An absolute URL must be on the site's own
	 * host: a static map from a third party would be a request without consent.
	 *
	 * @param string $value Attribute value.
	 */
	function armazon_map_static_url( string $value ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		$parts = wp_parse_url( $value );
		if ( empty( $parts['host'] ) ) {
			if ( str_starts_with( $value, '/' ) ) {
				return esc_url_raw( home_url( $value ) );
			}
			$path = preg_replace( '#^\./#', '', $value );
			if ( str_contains( $path, '..' ) ) {
				return '';
			}
			foreach ( array( get_stylesheet_directory() => get_stylesheet_directory_uri(), get_template_directory() => get_template_directory_uri() ) as $dir => $uri ) {
				if ( file_exists( $dir . '/' . $path ) ) {
					return esc_url_raw( $uri . '/' . $path );
				}
			}
			return '';
		}
		$site = wp_parse_url( home_url() );
		return isset( $site['host'] ) && strtolower( $parts['host'] ) === strtolower( $site['host'] ) ? esc_url_raw( $value ) : '';
	}
}

// Los datos llegan de atributos o de Block Bindings: una fuente de texto los
// trae con <br> en vez de saltos (las de armazon-site lo hacen); se
// devuelven a saltos para escaparlos aquí una sola vez.
$armazon_text      = static fn( string $key ): string => trim( html_entity_decode( wp_strip_all_tags( preg_replace( '/<br\s*\/?>/i', "\n", (string) $attributes[ $key ] ) ), ENT_QUOTES, 'UTF-8' ) );
$armazon_place     = $armazon_text( 'placeName' );
$armazon_phone     = $armazon_text( 'phone' );
$armazon_hours     = $armazon_text( 'hours' );
$armazon_address   = $armazon_text( 'address' );
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

$armazon_static = '';
if ( $attributes['staticMapId'] ) {
	$armazon_static = (string) wp_get_attachment_image_url( (int) $attributes['staticMapId'], 'full' );
}
if ( '' === $armazon_static ) {
	$armazon_static = armazon_map_static_url( $armazon_text( 'staticMapUrl' ) );
}

$armazon_image = '';
if ( '' !== $armazon_static ) {
	$armazon_image = sprintf(
		'<img class="armazon-map__static" src="%s" alt="%s" loading="lazy" decoding="async" data-wp-bind--hidden="context.loaded">',
		esc_url( $armazon_static ),
		esc_attr(
			'' !== $armazon_address
				/* translators: %s: postal address. */
				? sprintf( __( 'Street map around %s', 'armazon' ), str_replace( "\n", ', ', $armazon_address ) )
				: __( 'Street map of the area', 'armazon' )
		)
	);
} elseif ( $attributes['imageId'] ) {
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
// Dentro de una Consulta, SOLO si se pide (useFeaturedImage, 0.3.0; en 0.2.0
// era siempre): la imagen destacada de la entrada.
if ( '' === $armazon_image && '' === $attributes['imageUrl'] && $attributes['useFeaturedImage'] && ! empty( $block->context['postId'] ) && has_post_thumbnail( (int) $block->context['postId'] ) ) {
	$armazon_image = wp_get_attachment_image(
		get_post_thumbnail_id( (int) $block->context['postId'] ),
		'large',
		false,
		array(
			'class'                => 'armazon-map__image',
			'alt'                  => $attributes['imageAlt'],
			'loading'              => 'lazy',
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

// Foto = una imagen que SUSTITUYE al recuadro (la de 0.2.0). El mapa
// estático no es foto: va DEBAJO del recuadro de datos (0.5.0).
$armazon_has_photo = '' !== $armazon_image && '' === $armazon_static;

// Sin datos (0.6.0, showDetails:false): ni recuadro ni dirección bajo la foto,
// porque la ficha de al lado ya los dice. Sin imagen, el marco no se pinta
// hasta que hay mapa: una caja vacía antes del clic parecería rota.
$armazon_details     = ! isset( $attributes['showDetails'] ) || false !== $attributes['showDetails'];
$armazon_frame_later = ! $armazon_details && '' === $armazon_image;
$armazon_no_frame    = false;
if ( $armazon_frame_later && '' === $armazon_embed ) {
	// Nada que enseñar ni antes ni después del clic: solo el enlace.
	$armazon_frame_later = false;
	$armazon_no_frame    = true;
}

$armazon_title = '' !== $armazon_address
	/* translators: %s: postal address. */
	? sprintf( __( 'Map: %s', 'armazon' ), $armazon_address )
	: __( 'Map', 'armazon' );
?>
<figure
	<?php echo get_block_wrapper_attributes( array( 'class' => 'armazon-map' . ( '' !== $armazon_static ? ' has-static-map' : '' ) . ( $armazon_details ? '' : ' is-without-details' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	data-wp-interactive="armazon/map"
	<?php echo wp_interactivity_data_wp_context( array( 'loaded' => false, 'embedUrl' => $armazon_embed ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	data-wp-init="callbacks.init"
	data-wp-class--is-loaded="context.loaded"
>
	<?php if ( ! $armazon_no_frame ) : ?>
	<div class="armazon-map__frame"<?php echo $armazon_frame_later ? ' hidden data-wp-bind--hidden="!context.loaded"' : ''; ?>>
		<?php if ( '' !== $armazon_image ) : ?>
			<?php echo $armazon_image; // phpcs:ignore WordPress.Security.EscapeOutput -- built with escaping above. ?>
		<?php endif; ?>
		<?php if ( ! $armazon_has_photo && $armazon_details ) : ?>
			<div class="armazon-map__card" data-wp-bind--hidden="context.loaded">
				<?php if ( '' !== $armazon_place ) : ?>
				<p class="armazon-map__name"><?php echo esc_html( $armazon_place ); ?></p>
				<?php endif; ?>
				<?php if ( '' !== $armazon_address ) : ?>
				<address class="armazon-map__card-address"><?php echo nl2br( esc_html( $armazon_address ), false ); ?></address>
				<?php endif; ?>
				<?php if ( '' !== $armazon_phone ) : ?>
				<p class="armazon-map__phone"><a href="<?php echo esc_url( 'tel:' . preg_replace( '/[^\d+]/', '', $armazon_phone ), array( 'tel' ) ); ?>"><?php echo esc_html( $armazon_phone ); ?></a></p>
				<?php endif; ?>
				<?php if ( '' !== $armazon_hours ) : ?>
				<p class="armazon-map__hours"><?php echo nl2br( esc_html( $armazon_hours ), false ); ?></p>
				<?php endif; ?>
			</div>
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
	<?php endif; ?>
	<figcaption class="armazon-map__caption">
		<?php if ( '' !== $armazon_address && $armazon_has_photo && $armazon_details ) : ?>
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
