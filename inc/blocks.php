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
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers every block found in blocks/.
 */
function armazon_register_blocks(): void {
	foreach ( glob( get_template_directory() . '/blocks/*/block.json' ) ?: array() as $metadata_file ) {
		register_block_type( dirname( $metadata_file ) );
	}
}
add_action( 'init', 'armazon_register_blocks' );

/**
 * Adds translated labels to the auto-generated controls of autoRegister blocks.
 *
 * @param array $metadata Block metadata read from block.json.
 * @return array
 */
function armazon_block_attribute_labels( array $metadata ): array {
	if ( empty( $metadata['name'] ) || ! str_starts_with( $metadata['name'], 'armazon/' ) || empty( $metadata['file'] ) ) {
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
add_filter( 'block_type_metadata', 'armazon_block_attribute_labels' );

/**
 * Passes the theme translations to wp.i18n for the editor scripts (edit.js).
 *
 * WordPress expects JSON files per script (armazon-es_ES-<md5>.json), which
 * need a build step to generate. Instead, the same PHP translations that the
 * server uses (languages/<locale>.l10n.php) are handed to wp.i18n.setLocaleData
 * inline. One source of truth, no build.
 */
function armazon_editor_script_translations(): void {
	$translations = get_translations_for_domain( 'armazon' );
	$locale_data  = array(
		'' => array(
			'domain' => 'armazon',
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
	$script = sprintf( 'wp.i18n.setLocaleData( %s, "armazon" );', wp_json_encode( $locale_data ) );

	foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $block_type ) {
		if ( ! str_starts_with( $name, 'armazon/' ) ) {
			continue;
		}
		foreach ( $block_type->editor_script_handles as $handle ) {
			wp_add_inline_script( $handle, $script, 'before' );
		}
	}
}
add_action( 'enqueue_block_editor_assets', 'armazon_editor_script_translations' );
