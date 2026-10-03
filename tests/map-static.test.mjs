// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba son las PETICIONES de red (a quién se le pide qué) y dónde queda pintado el recuadro sobre la imagen, y eso solo existe al ejecutar la página.
/**
 * armazon/map con mapa estático (0.5.0, atributo staticMapUrl):
 * 1. sin aceptar mapas, se ve la imagen de OSM servida por el PROPIO sitio,
 *    con el recuadro de datos encima (a la izquierda), y la página no pide
 *    NADA a otro dominio;
 * 2. un staticMapUrl de otro dominio se descarta: ese mapa no lleva imagen;
 * 3. «Ver mapa» carga Google Y concede «maps»: el otro mapa de la página
 *    carga solo y la cookie de consentimiento la lleva;
 * 4. en un bloque estrecho, el recuadro va DEBAJO del mapa, no encima.
 *
 * Página sembrada en tests/fixtures/setup/setup.php (/prueba-mapa-estatico/);
 * la imagen es tests/fixtures/setup/mapa-estatico.webp, hecha con
 * tools/static-map.mjs. Google se corta con page.route: la prueba no sale a
 * Internet, mira que se PIDE.
 * Vista fallar el 03-10-2026 con la 0.4.0: sin imagen estática (el atributo
 * no existía) y «maps» sin conceder tras «Ver mapa».
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-mapa-estatico/`;
const own = new globalThis.URL( BASE_URL ).host;

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		const foreign = [];
		page.on( 'request', ( request ) => {
			const host = new globalThis.URL( request.url() ).host;
			if ( request.url().startsWith( 'http' ) && host !== own ) {
				foreign.push( request.url() );
			}
		} );
		await page.route( /google\.com/, ( route ) => route.fulfill( { status: 200, contentType: 'text/html', body: '<p>mapa</p>' } ) );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();

		const first = page.locator( '.armazon-map' ).nth( 0 );
		const second = page.locator( '.armazon-map' ).nth( 1 );

		// 1. Imagen propia, cargada, con el recuadro encima a la izquierda.
		const image = first.locator( 'img.armazon-map__static' );
		await image.scrollIntoViewIfNeeded();
		await page.waitForFunction( ( el ) => el.complete && el.naturalWidth > 0, await image.elementHandle() );
		const src = await image.getAttribute( 'src' );
		assert.equal( new globalThis.URL( src ).host, own, `la imagen no es del sitio: ${ src }` );
		assert.match( await image.getAttribute( 'alt' ), /Pla(ç|c)a de Cort/, 'el texto alternativo no dice la dirección' );
		const card = first.locator( '.armazon-map__card' );
		assert.ok( await card.isVisible(), 'con mapa estático el recuadro de datos tiene que seguir' );
		assert.match( await card.innerText(), /Sede con mapa estático/ );
		const imageBox = await image.boundingBox();
		const cardBox = await card.boundingBox();
		assert.ok( cardBox.y < imageBox.y + imageBox.height && cardBox.y >= imageBox.y, 'en ancho, el recuadro va ENCIMA del mapa' );
		assert.ok( cardBox.x + cardBox.width < imageBox.x + imageBox.width / 2, 'el recuadro tapa el centro (el marcador)' );

		// 2. La URL de otro dominio se descarta.
		assert.equal( await second.locator( 'img' ).count(), 0, 'un staticMapUrl de otro dominio no se descarta' );
		assert.deepEqual( foreign, [], `peticiones a terceros sin consentimiento: ${ foreign.join( ' ' ) }` );

		// 3. «Ver mapa» carga este y concede «maps»: el otro carga solo.
		await first.getByRole( 'button', { name: 'Ver mapa' } ).click();
		await page.waitForFunction( () => window.armazonConsent.has( 'maps' ) );
		await page.waitForFunction( () => [ ...document.querySelectorAll( '.armazon-map__iframe' ) ].every( ( f ) => ! f.hidden && /google\.com/.test( f.src ) ) );
		assert.ok( await image.isHidden(), 'cargado el mapa, la imagen estática sigue a la vista' );
		const cookie = ( await page.context().cookies() ).find( ( c ) => c.name === 'armazon_consent' );
		assert.match( decodeURIComponent( cookie.value ), /maps/, `la cookie no lleva «maps»: ${ cookie.value }` );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 4. Estrecho: el recuadro debajo del mapa.
		const narrow = await newPage( { viewport: { width: 375, height: 800 } } );
		await narrow.goto( URL, { waitUntil: 'networkidle' } );
		await narrow.getByRole( 'button', { name: 'Rechazar todas' } ).click();
		const narrowImage = narrow.locator( '.armazon-map' ).nth( 0 ).locator( 'img.armazon-map__static' );
		await narrowImage.scrollIntoViewIfNeeded();
		await narrow.waitForFunction( ( el ) => el.complete && el.naturalWidth > 0, await narrowImage.elementHandle() );
		const a = await narrowImage.boundingBox();
		const b = await narrow.locator( '.armazon-map' ).nth( 0 ).locator( '.armazon-map__card' ).boundingBox();
		assert.ok( a.height > 100, `en estrecho el mapa mide ${ a.height } px de alto` );
		assert.ok( b.y >= a.y + a.height - 1, `en estrecho el recuadro (y=${ b.y }) no va debajo del mapa (acaba en ${ a.y + a.height })` );
	} )
);
