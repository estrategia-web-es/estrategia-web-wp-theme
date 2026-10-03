// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es qué texto queda A LA VISTA (innerText, con lo oculto fuera) y qué caja se pinta antes y después de «Ver mapa», que solo existe con la página hidratada.
/**
 * armazon/map sin recuadro de datos (0.6.0, atributo showDetails:false), para
 * cuando la ficha de la sede ya dice la dirección al lado del mapa:
 * 1. la dirección se lee UNA vez en la página (la de la ficha), no dos;
 * 2. con mapa estático, el marco enseña solo la imagen, y debajo «Ver mapa»
 *    y «Abrir en Google Maps»;
 * 3. sin imagen, antes del clic no hay una caja vacía: solo los botones; y
 *    «Ver mapa» pinta el mapa con su alto.
 *
 * Página sembrada en tests/fixtures/setup/setup.php (/prueba-mapa-sin-datos/).
 * Google se corta con page.route: la prueba no sale a Internet.
 * Vista fallar el 03-10-2026 con la 0.5.0: la dirección salía dos veces (el
 * atributo no existía y el recuadro se pintaba siempre).
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		for ( const width of [ 1200, 402 ] ) {
			const page = await newPage( { viewport: { width, height: 900 } } );
			await page.route( /google\.com/, ( route ) => route.fulfill( { status: 200, contentType: 'text/html', body: '<p>mapa</p>' } ) );
			await page.goto( `${ BASE_URL }/prueba-mapa-sin-datos/`, { waitUntil: 'networkidle' } );
			await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();

			// 1. La dirección, una sola vez a la vista.
			const text = await page.locator( 'body' ).innerText();
			const times = text.split( 'Plaça de Cort 1' ).length - 1;
			assert.equal( times, 1, `a ${ width } px la dirección sale ${ times } veces` );
			assert.ok( ! text.includes( 'Sede sin recuadro' ), `a ${ width } px el nombre de la sede sale dentro del mapa` );

			// 2. Con mapa estático: solo la imagen, y los dos botones.
			const first = page.locator( '.armazon-map' ).nth( 0 );
			assert.equal( await first.locator( '.armazon-map__card' ).count(), 0, 'con showDetails:false no se pinta el recuadro' );
			const image = first.locator( 'img.armazon-map__static' );
			await image.scrollIntoViewIfNeeded();
			await page.waitForFunction( ( el ) => el.complete && el.naturalWidth > 0, await image.elementHandle() );
			const frame = await first.locator( '.armazon-map__frame' ).boundingBox();
			const img = await image.boundingBox();
			assert.ok( Math.abs( img.height - frame.height ) < 2 && img.height > 100, `a ${ width } px la imagen no llena el marco (${ img.height } de ${ frame.height })` );
			assert.ok( await first.getByRole( 'button', { name: 'Ver mapa' } ).isVisible() );
			assert.ok( await first.getByRole( 'link', { name: /Abrir en Google Maps/ } ).isVisible() );

			// 3. Sin imagen: nada de caja vacía antes del clic; el mapa, después.
			const second = page.locator( '.armazon-map' ).nth( 1 );
			assert.equal( await second.locator( '.armazon-map__card' ).count(), 0 );
			assert.ok( await second.locator( '.armazon-map__frame' ).isHidden(), `a ${ width } px sin imagen queda una caja vacía antes del clic` );
			assert.ok( await second.getByRole( 'link', { name: /Abrir en Google Maps/ } ).isVisible() );
			await second.getByRole( 'button', { name: 'Ver mapa' } ).click();
			const iframe = second.locator( '.armazon-map__iframe' );
			await page.waitForFunction( ( el ) => ! el.hidden && /google\.com/.test( el.src ) && el.getBoundingClientRect().height > 100, await iframe.elementHandle() );
			assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
		}
	} )
);
