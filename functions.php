<?php
/**
 * Estrategia Web — tema padre de bloques.
 *
 * Este fichero solo carga inc/*.php. La lógica vive allí, un fichero por
 * asunto (setup, bloques del núcleo, transiciones, rendimiento). Desde la
 * 1.1.0 el tema no registra bloques: el carrusel, el mapa, el WhatsApp y el
 * selector de idioma son módulos del plugin Estrategia Web, igual que el
 * aviso de cookies (que se fue en la 0.7.0). Un bloque nuevo va allí.
 *
 * Cómo se mantiene:
 * - Un asunto nuevo es un fichero nuevo en inc/, no un bloque más aquí.
 * - Se cargan en orden alfabético. Si uno depende de otro, el nombre manda
 *   (por eso las funciones que otros usan viven en ficheros que se cargan
 *   antes o se llaman dentro de hooks, nunca al cargar el fichero).
 * - La trampa: el hijo tiene su propio functions.php y WordPress carga el del
 *   HIJO ANTES que el del padre. Un hijo que llame a una función estrategia_web_* al
 *   cargar su fichero revienta; tiene que hacerlo dentro de un hook (init,
 *   after_setup_theme...). Por eso aquí no hay funciones «pluggable»
 *   (if ! function_exists): el hijo cambia el comportamiento con filtros.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/inc/*.php' ) ?: array() as $estrategia_web_file ) {
	require_once $estrategia_web_file;
}
unset( $estrategia_web_file );
