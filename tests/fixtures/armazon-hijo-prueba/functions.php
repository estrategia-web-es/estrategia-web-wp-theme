<?php
/**
 * Hijo de prueba del padre. Ya no declara categorías de consentimiento: el
 * aviso de cookies se fue al plugin armazon-site en 0.7.0 y este WordPress de
 * pruebas no lo tiene (así se prueba que el mapa funciona sin él).
 *
 * @package armazon-hijo-prueba
 */

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

// Un carrusel en REJILLA de dos filas, como la franja de clientes de
// Lavandería (tests/carousel-infinite.test.mjs): el infinito rota por
// columnas y ninguna ficha cambia de fila. Lo pone el hijo, como allí.
add_action(
	'wp_head',
	static function () {
		echo '<style>.rejilla-prueba .armazon-carousel__track{display:grid;grid-template-columns:repeat(3,70%);}</style>';
	}
);
