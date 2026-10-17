<?php
/**
 * Test child of the parent theme. It no longer declares consent categories:
 * the cookie notice moved to the plugin in 0.7.0 and this test WordPress has
 * the Estrategia Web plugin with the "consent" module turned OFF (see
 * tests/fixtures/setup/setup.php).
 *
 * 17-10-2026: the post field prueba_direccion and the CSS of the two carousel
 * grids (rejilla-prueba, rejilla-impar) left with the carousel and map tests
 * for the plugin (armazon-wp-sitio, modules/<block>/tests/wp/). What stays
 * here is what the theme's own tests need.
 *
 * @package estrategia-web-hijo-prueba
 */

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
