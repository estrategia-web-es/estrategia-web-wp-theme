<?php
/**
 * Runs Theme Check inside the Playground of tools/wporg.mjs and writes its
 * messages to /out/result.json. Not part of the theme (tools/ is export-ignore).
 *
 * It calls run_themechecks_against_theme() directly: Theme Check only loads
 * its checks on its admin screen, so checkbase.php is required here.
 *
 * How to maintain: if a Theme Check update renames that function, result.json
 * comes back with «exception»; the new one is in theme-check/checkbase.php.
 */

require_once '/wordpress/wp-load.php';
require_once WP_PLUGIN_DIR . '/theme-check/checkbase.php';

global $themechecks;
try {
	run_themechecks_against_theme( wp_get_theme( 'estrategia-web' ), 'estrategia-web' );
	$estrategia_web_out = array();
	foreach ( $themechecks as $estrategia_web_check ) {
		foreach ( (array) $estrategia_web_check->getError() as $estrategia_web_msg ) {
			$estrategia_web_out[] = array(
				'check' => get_class( $estrategia_web_check ),
				'msg'   => trim( html_entity_decode( wp_strip_all_tags( $estrategia_web_msg ) ) ),
			);
		}
	}
} catch ( Throwable $e ) {
	$estrategia_web_out = array( 'exception' => $e->getMessage(), 'at' => $e->getFile() . ':' . $e->getLine() );
}
file_put_contents( '/out/result.json', json_encode( $estrategia_web_out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
