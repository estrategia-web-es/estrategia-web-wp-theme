<?php
/**
 * Test child of the parent theme. It no longer declares consent categories:
 * the cookie notice moved to the plugin in 0.7.0 and this test WordPress has
 * the Estrategia Web plugin with the "consent" module turned OFF (that is how
 * it tests that the map works without it; see tests/fixtures/setup/setup.php).
 *
 * @package estrategia-web-hijo-prueba
 */

// A post field to test estrategia-web/map bound to core/post-meta inside a
// Query (tests/map-query.test.mjs). A custom type with its fields belongs in a
// plugin, never in the parent: here it is only the seed.
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

// A carousel in a two-row GRID, like Lavandería's client strip
// (tests/carousel-infinite.test.mjs): the infinite mode rotates by columns
// and no card changes row. The child sets it, as there.
add_action(
	'wp_head',
	static function () {
		echo '<style>.rejilla-prueba .estrategia-web-carousel__track{display:grid;grid-template-columns:repeat(3,70%);}</style>';
		// 23 cards in 12 columns (tests/carousel-any-count.test.mjs): the
		// bottom row has 11, like Lavandería's strip with its 23 clients.
		echo '<style>.rejilla-impar .estrategia-web-carousel__track{display:grid;grid-template-columns:repeat(12,170px);gap:12px}</style>';
	}
);

// A STICKY 80 px header, like Lavandería's, only on /prueba-anclas/
// (tests/anchors.test.mjs): an anchor's target must not end up under it.
// The height is declared by the token a child sets in its theme.json
// (settings.custom.layout.cabecera); here, by hand. Only on that page: on the
// others it would cover what other tests click.
add_action(
	'wp_head',
	static function () {
		if ( is_page( 'prueba-anclas' ) ) {
			echo '<style>:root{--wp--custom--layout--cabecera:80px}.wp-site-blocks>header{position:fixed;inset:0 0 auto;height:80px;z-index:10;background:#fff;box-sizing:border-box}</style>';
		}
	}
);
