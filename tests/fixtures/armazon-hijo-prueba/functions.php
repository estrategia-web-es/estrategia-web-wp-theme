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

// Un campo de entrada para probar armazon/map enlazado a core/post-meta
// dentro de una Consulta (tests/map-query.test.mjs). Un tipo propio con sus
// campos es cosa de un plugin, nunca del padre: aquí solo es la siembra.
add_action(
	'init',
	static function () {
		register_post_meta(
			'post',
			'prueba_direccion',
			array(
				'type'         => 'string',
				'single'       => true,
				'show_in_rest' => true,
			)
		);
	}
);

add_action(
	'wp_footer',
	static function () {
		echo '<script type="text/plain" data-armazon-consent="statistics">window.armazonTestStatistics = true;</script>';
	}
);
