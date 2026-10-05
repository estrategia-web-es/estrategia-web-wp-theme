// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba son las PETICIONES de red (a quién se le pide qué) y dónde queda pintado el recuadro sobre la imagen, y eso solo existe al ejecutar la página.
/**
 * armazon/map con mapa estático (0.5.0, atributo staticMapUrl):
 * 1. sin aceptar mapas, se ve la imagen de OSM servida por el PROPIO sitio,
 *    con el recuadro de datos encima (a la izquierda), y la página no pide
 *    NADA a otro dominio;
 * 2. un staticMapUrl de otro dominio se descarta: ese mapa no lleva imagen;
 * 3. «Ver mapa» carga Google para ESE mapa. Sin el plugin del aviso de
 *    cookies (0.7.0) no concede nada: el otro mapa sigue sin cargar y no hay
 *    cookie. Con el plugin, «Ver mapa» concede «maps» y los demás cargan: eso
 *    lo prueba la web (Lavandería, tests/consent-maps.test.mjs);
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

		// 3. Sin el plugin del aviso (0.7.0): «Ver mapa» carga ESTE mapa y solo
		// este; no hay consentimiento que conceder ni cookie que guardar.
		await first.getByRole( 'button', { name: 'Ver mapa' } ).click();
		await page.waitForFunction( () => {
			const frame = document.querySelectorAll( '.armazon-map__iframe' )[ 0 ];
			return frame && ! frame.hidden && /google\.com/.test( frame.src );
		} );
		assert.ok( await image.isHidden(), 'cargado el mapa, la imagen estática sigue a la vista' );
		assert.ok( ! ( await second.locator( '.armazon-map__iframe' ).getAttribute( 'src' ) ), 'sin aviso, el clic en un mapa no debería cargar los demás' );
		assert.equal( ( await page.context().cookies() ).find( ( c ) => c.name === 'armazon_consent' ), undefined, 'sin plugin no hay cookie de consentimiento' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 4. Estrecho: el recuadro debajo del mapa.
		const narrow = await newPage( { viewport: { width: 375, height: 800 } } );
		await narrow.goto( URL, { waitUntil: 'networkidle' } );
		const narrowImage = narrow.locator( '.armazon-map' ).nth( 0 ).locator( 'img.armazon-map__static' );
		await narrowImage.scrollIntoViewIfNeeded();
		await narrow.waitForFunction( ( el ) => el.complete && el.naturalWidth > 0, await narrowImage.elementHandle() );
		const a = await narrowImage.boundingBox();
		const b = await narrow.locator( '.armazon-map' ).nth( 0 ).locator( '.armazon-map__card' ).boundingBox();
		assert.ok( a.height > 100, `en estrecho el mapa mide ${ a.height } px de alto` );
		assert.ok( b.y >= a.y + a.height - 1, `en estrecho el recuadro (y=${ b.y }) no va debajo del mapa (acaba en ${ a.y + a.height })` );
	} )
);
