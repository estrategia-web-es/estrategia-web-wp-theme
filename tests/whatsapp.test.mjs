// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: se comprueba el nombre accesible y que el botón está fijo y visible en pantalla, que es estilo calculado.
/**
 * armazon/whatsapp: el enlace wa.me es correcto con atributos (número con
 * espacios y «+», mensaje con acentos) y con la opción del sitio (el del pie),
 * se abre en pestaña nueva, tiene nombre accesible y queda fijo en su esquina.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );

		const buttons = page.getByRole( 'link', { name: /Escríbenos por WhatsApp/ } );
		assert.equal( await buttons.count(), 2, 'se esperaban dos: el de la página y el del pie' );

		const hrefs = await buttons.evaluateAll( ( links ) => links.map( ( a ) => a.getAttribute( 'href' ) ) );
		assert.ok(
			hrefs.includes( 'https://wa.me/34600111222?text=' + encodeURIComponent( 'Hola, ¿tenéis hora mañana?' ) ),
			`falta el enlace con atributos: ${ hrefs.join( ' ' ) }`
		);
		assert.ok(
			hrefs.includes( 'https://wa.me/34611223344?text=' + encodeURIComponent( 'Mensaje desde la opción del sitio' ) ),
			`falta el enlace de la opción del sitio: ${ hrefs.join( ' ' ) }`
		);

		for ( const link of await buttons.all() ) {
			assert.equal( await link.getAttribute( 'target' ), '_blank' );
			assert.match( await link.getAttribute( 'rel' ), /noopener/ );
			assert.equal( await link.evaluate( ( el ) => getComputedStyle( el ).position ), 'fixed' );
			const box = await link.boundingBox();
			assert.ok( box && box.width >= 44 && box.height >= 44, 'diana táctil menor de 44 px' );
		}

		// Posición: el de la página va a la izquierda, el del pie a la derecha.
		const left = await page.locator( '.armazon-whatsapp.is-position-bottom-left' ).boundingBox();
		const right = await page.locator( '.armazon-whatsapp.is-position-bottom-right' ).boundingBox();
		assert.ok( left.x < 100 && right.x > 1000, `posiciones inesperadas: ${ left.x } / ${ right.x }` );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
