<?php
/**
 * Registro de los bloques propios (blocks/<name>/block.json).
 *
 * Sin paso de compilación: cada bloque es block.json + render.php y, si lo
 * necesita, un módulo ES nativo (view.js) para la Interactivity API y un
 * script clásico (edit.js) que usa los globales wp.* del editor.
 *
 * Cómo se mantiene:
 * - Un bloque nuevo es una carpeta nueva en blocks/ con su block.json: se
 *   registra solo (no hay lista que actualizar).
 * - Sus dependencias de JS van en <script>.asset.php ESCRITO A MANO (en un
 *   proyecto con @wordpress/scripts lo genera el build; aquí no hay build).
 *   Si view.js importa un módulo nuevo de WordPress, se añade a su
 *   view.asset.php o el navegador no lo encuentra en el importmap.
 * - Bloques sin editor propio usan supports.autoRegister (WordPress 7.0): el
 *   editor los pinta con ServerSideRender y genera los controles de sus
 *   atributos string/number/integer/boolean. Las ETIQUETAS de esos controles
 *   salen de blocks/<name>/labels.php, porque block.json no traduce la clave
 *   «label» de un atributo (no está en block-i18n.json).
 * - La trampa: get_block_asset_url() resuelve la URL con get_theme_file_uri(),
 *   que busca PRIMERO en el hijo. Si un hijo tiene un fichero con la misma
 *   ruta (blocks/carousel/view.js), se servirá el del hijo con el block.json
 *   del padre. Un hijo no copia carpetas de blocks/ del padre: hace las suyas
 *   con otro nombre.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers every block found in blocks/.
 */
function estrategia_web_register_blocks(): void {
	foreach ( glob( get_template_directory() . '/blocks/*/block.json' ) ?: array() as $metadata_file ) {
		register_block_type( dirname( $metadata_file ) );
	}
}
add_action( 'init', 'estrategia_web_register_blocks' );

/**
 * Attributes of the parent's blocks that accept Block Bindings (0.2.0).
 *
 * Por qué: el núcleo solo deja enlazar atributos de sus propios bloques
 * (párrafo, imagen, botón…). Con este filtro (WordPress 6.9+) un dato que
 * vive en otro sitio llega a estos bloques sin copiarlo: la dirección de una
 * sede (core/post-meta, dentro de una Consulta) al mapa, o el número de
 * WhatsApp de la empresa (la fuente de un plugin) al botón flotante.
 * El padre no conoce ninguna fuente ni ningún campo: solo dice QUÉ atributos
 * se pueden enlazar. Cuáles se enlazan y a qué, lo decide el hijo o el
 * contenido.
 *
 * Cómo se mantiene: un atributo de TEXTO o URL nuevo en un bloque del padre
 * que tenga sentido rellenar desde fuera entra en esta lista. Caso frontera:
 * los números y booleanos (imageId, autoplay) no, porque las fuentes devuelven
 * texto. La trampa: los atributos enlazados se resuelven ANTES de render.php,
 * así que render.php no sabe si un valor vino del bloque o de la fuente; no
 * se escribe código que dependa de eso.
 *
 * @return array<string, string[]>
 */
function estrategia_web_bindable_attributes(): array {
	return array(
		'estrategia-web/map'      => array( 'placeName', 'address', 'phone', 'hours', 'embedUrl', 'mapsUrl', 'imageUrl', 'imageAlt', 'staticMapUrl' ),
		'estrategia-web/whatsapp' => array( 'phone', 'message', 'label' ),
	);
}

foreach ( estrategia_web_bindable_attributes() as $estrategia_web_block_name => $estrategia_web_block_attributes ) {
	add_filter(
		"block_bindings_supported_attributes_{$estrategia_web_block_name}",
		static fn( $supported ) => array_values( array_unique( array_merge( (array) $supported, $estrategia_web_block_attributes ) ) )
	);
}
unset( $estrategia_web_block_name, $estrategia_web_block_attributes );

/**
 * Adds translated labels to the auto-generated controls of autoRegister blocks.
 *
 * @param array $metadata Block metadata read from block.json.
 * @return array
 */
function estrategia_web_block_attribute_labels( array $metadata ): array {
	if ( empty( $metadata['name'] ) || ! str_starts_with( $metadata['name'], 'estrategia-web/' ) || empty( $metadata['file'] ) ) {
		return $metadata;
	}
	$labels_file = dirname( $metadata['file'] ) . '/labels.php';
	if ( ! is_readable( $labels_file ) ) {
		return $metadata;
	}
	$labels = require $labels_file;
	foreach ( (array) $labels as $attribute => $label ) {
		if ( isset( $metadata['attributes'][ $attribute ] ) ) {
			$metadata['attributes'][ $attribute ]['label'] = $label;
		}
	}
	return $metadata;
}
add_filter( 'block_type_metadata', 'estrategia_web_block_attribute_labels' );

/**
 * Passes the theme translations to wp.i18n for the editor scripts (edit.js).
 *
 * WordPress expects JSON files per script (estrategia-web-es_ES-<md5>.json), which
 * need a build step to generate. Instead, the same PHP translations that the
 * server uses (languages/<locale>.l10n.php) are handed to wp.i18n.setLocaleData
 * inline. One source of truth, no build.
 */
function estrategia_web_editor_script_translations(): void {
	$translations = get_translations_for_domain( 'estrategia-web' );
	$locale_data  = array(
		'' => array(
			'domain' => 'estrategia-web',
			'lang'   => determine_locale(),
		),
	);
	foreach ( $translations->entries as $entry ) {
		if ( empty( $entry->translations ) ) {
			continue;
		}
		$key                 = $entry->context ? $entry->context . "\u{0004}" . $entry->singular : $entry->singular;
		$locale_data[ $key ] = $entry->translations;
	}
	$script = sprintf( 'wp.i18n.setLocaleData( %s, "estrategia-web" );', wp_json_encode( $locale_data ) );

	foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $block_type ) {
		if ( ! str_starts_with( $name, 'estrategia-web/' ) ) {
			continue;
		}
		foreach ( $block_type->editor_script_handles as $handle ) {
			wp_add_inline_script( $handle, $script, 'before' );
		}
	}
}
add_action( 'enqueue_block_editor_assets', 'estrategia_web_editor_script_translations' );
