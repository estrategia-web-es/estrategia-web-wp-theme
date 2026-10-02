// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: los bindings se resuelven al pintar la página dentro del bucle de la Consulta, y lo que hay que ver es el HTML final de cada entrada.
/**
 * armazon/map dentro de una Consulta (0.2.0): cada mapa enseña la dirección de
 * SU entrada (atributo enlazado a core/post-meta) y, sin imagen elegida en el
 * bloque, usa la imagen destacada de la entrada; la que no tiene, el recuadro
 * neutro. Página sembrada en tests/fixtures/setup/setup.php.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage();
		await page.goto( `${ BASE_URL }/prueba-mapa-consulta/`, { waitUntil: 'networkidle' } );

		const maps = page.locator( '.armazon-map' );
		assert.equal( await maps.count(), 2, 'debería haber un mapa por entrada' );

		// Con imagen la dirección va al pie del mapa; sin imagen, en el recuadro (0.3.0).
		const addresses = await page.locator( '.armazon-map__address, .armazon-map__card-address' ).allTextContents();
		assert.deepEqual( addresses, [ 'Calle de Prueba 1, Palma', 'Calle de Prueba 2, Palma' ], 'cada mapa debería llevar la dirección de su entrada' );

		assert.equal( await maps.nth( 0 ).locator( 'img.armazon-map__image' ).count(), 1, 'la primera entrada tiene destacada: el mapa debería usarla' );
		assert.ok( ( await maps.nth( 0 ).locator( 'img' ).getAttribute( 'src' ) ).includes( 'mapa-estatico-prueba' ), 'la imagen no es la destacada' );
		assert.equal( await maps.nth( 1 ).locator( '.armazon-map__card' ).count(), 1, 'sin destacada debería salir el recuadro con los datos' );

		// El enlace «Abrir en Google Maps» sale de la dirección enlazada.
		const href = await maps.nth( 1 ).locator( '.armazon-map__link' ).getAttribute( 'href' );
		assert.ok( href.includes( encodeURIComponent( 'Calle de Prueba 2, Palma' ) ), `enlace sin la dirección: ${ href }` );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
