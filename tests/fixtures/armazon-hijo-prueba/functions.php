<?php
/**
 * Hijo de prueba: declara categorías de consentimiento salvo con
 * ?no-categories en la URL (para probar que sin categorías no hay aviso), y
 * deja un script diferido por consentimiento para probar su activación.
 *
 * @package armazon-hijo-prueba
 */

add_filter(
	'armazon_consent_categories',
	static function () {
		// phpcs:ignore WordPress.Security.NonceVerification -- test fixture.
		return isset( $_GET['no-categories'] ) ? array() : array( 'statistics', 'maps' );
	}
);

add_action(
	'wp_footer',
	static function () {
		echo '<script type="text/plain" data-armazon-consent="statistics">window.armazonTestStatistics = true;</script>';
	}
);
