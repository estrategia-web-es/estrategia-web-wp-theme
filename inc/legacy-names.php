<?php
/**
 * Los nombres de antes de 1.0.0 (cuando el tema se llamaba «Armazón»), como
 * ALIAS que pintan lo mismo que los nuevos:
 * - los bloques armazon/carousel, armazon/map, armazon/whatsapp y
 *   armazon/language-switcher → estrategia-web/…;
 * - las opciones armazon_whatsapp_phone y armazon_whatsapp_message, que se
 *   leen si las nuevas aún no existen (nada se escribe aquí).
 *
 * Un alias copia el tipo nuevo (atributos, supports, contexto) y, al pintar,
 * renombra el bloque y sus hijos (y las clases de su marcado guardado) y lo
 * pinta con render_block(): sale EXACTAMENTE lo que saldría con el nombre
 * nuevo. Oculto del insertador. Quien reescribe el contenido de verdad es el
 * migrador del plugin Estrategia Web Site (includes/class-armazon-migration.php);
 * esto es la red para el marcado que quede (una revisión restaurada, un
 * patrón importado). En el editor, un bloque viejo sale como «no admitido».
 * armazon/consent NO está aquí: es del plugin (su alias lo pone él).
 *
 * Cómo se mantiene:
 * - CUÁNDO SE QUITA: en la 2.0.0 del tema, una vez pasado el migrador en
 *   todas las webs que usaron Armazón (07-10-2026: solo Lavandería Mallorca).
 * - Un bloque NUEVO del tema no entra aquí: la lista es la de 1.0.0, fija.
 * - La trampa: el alias necesita el tipo nuevo ya registrado; por eso corre
 *   en init con prioridad 99 (los bloques se registran en init, 10).
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/** Los bloques del tema en 1.0.0: los únicos con nombre viejo. */
const ESTRATEGIA_WEB_LEGACY_BLOCKS = array( 'carousel', 'map', 'whatsapp', 'language-switcher' );

/**
 * Un bloque leído con nombres viejos, con los nuevos (él y sus hijos).
 *
 * @param array $parsed Bloque de parse_blocks().
 */
function estrategia_web_legacy_rename( array $parsed ): array {
	$name = (string) ( $parsed['blockName'] ?? '' );
	if ( str_starts_with( $name, 'armazon/' ) && in_array( substr( $name, 8 ), ESTRATEGIA_WEB_LEGACY_BLOCKS, true ) ) {
		$parsed['blockName']    = 'estrategia-web/' . substr( $name, 8 );
		$swap                   = static fn( $html ) => is_string( $html ) ? preg_replace( '#(?<![\w-])armazon-#', 'estrategia-web-', $html ) : $html;
		$parsed['innerHTML']    = $swap( $parsed['innerHTML'] ?? '' );
		$parsed['innerContent'] = array_map( $swap, $parsed['innerContent'] ?? array() );
	}
	$parsed['innerBlocks'] = array_map( 'estrategia_web_legacy_rename', $parsed['innerBlocks'] ?? array() );
	return $parsed;
}

function estrategia_web_register_legacy_blocks(): void {
	$registry = WP_Block_Type_Registry::get_instance();
	foreach ( ESTRATEGIA_WEB_LEGACY_BLOCKS as $slug ) {
		$type = $registry->get_registered( 'estrategia-web/' . $slug );
		if ( ! $type || $registry->is_registered( 'armazon/' . $slug ) ) {
			continue;
		}
		register_block_type(
			'armazon/' . $slug,
			array(
				'api_version'      => 3,
				'title'            => $type->title,
				'category'         => $type->category,
				'attributes'       => $type->attributes,
				'uses_context'     => $type->uses_context,
				'provides_context' => $type->provides_context,
				'supports'         => array_merge( (array) $type->supports, array( 'inserter' => false ) ),
				'render_callback'  => static fn( $attributes, $content, $block ) => render_block( estrategia_web_legacy_rename( $block->parsed_block ) ),
			)
		);
	}
}
add_action( 'init', 'estrategia_web_register_legacy_blocks', 99 );

foreach ( array( 'whatsapp_phone', 'whatsapp_message' ) as $estrategia_web_option ) {
	add_filter(
		'default_option_estrategia_web_' . $estrategia_web_option,
		static function ( $default ) use ( $estrategia_web_option ) {
			$legacy = get_option( 'armazon_' . $estrategia_web_option, null );
			return null === $legacy ? $default : $legacy;
		}
	);
}
unset( $estrategia_web_option );
