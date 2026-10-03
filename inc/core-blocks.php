<?php
/**
 * Comportamiento común de bloques DEL NÚCLEO (0.4.0): lo que todas las webs
 * quieren igual en un bloque de WordPress y el núcleo no trae.
 *
 * Una hoja por bloque en assets/core-blocks/<bloque>.css, cargada con
 * wp_enqueue_block_style: solo llega a la página si el bloque está en ella, y
 * también al editor. Hoy: accordion.css (abrir y cerrar con la altura
 * animada; ver su cabecera).
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Una hoja nueva = un fichero en
 *   assets/core-blocks/ con el nombre del bloque sin «core/»; se carga sola.
 * - Caso frontera: lo que es ASPECTO de una web (colores, el icono del «+»)
 *   va en el hijo, como estilo del bloque; aquí solo comportamiento y
 *   tokens (settings.custom del theme.json del padre).
 * - La trampa: el hijo carga sus hojas DESPUÉS y puede pisar una transición
 *   sin querer (un «transition: none» o un «transition: transform …» suelto
 *   en el icono); si una web no anima, mirar primero las hojas del hijo.
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues assets/core-blocks/<name>.css for core/<name>.
 */
function armazon_core_block_styles(): void {
	foreach ( glob( get_template_directory() . '/assets/core-blocks/*.css' ) ?: array() as $file ) {
		$name = basename( $file, '.css' );
		wp_enqueue_block_style(
			'core/' . $name,
			array(
				'handle' => 'armazon-core-' . $name,
				'src'    => get_template_directory_uri() . '/assets/core-blocks/' . $name . '.css',
				'path'   => $file,
				'ver'    => armazon_version(),
			)
		);
	}
}
add_action( 'init', 'armazon_core_block_styles' );
