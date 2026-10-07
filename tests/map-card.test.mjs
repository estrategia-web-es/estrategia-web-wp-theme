// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es lo que ve el visitante antes del clic (recuadro con datos, sin imagen) y que no salga ninguna petición a Google, y eso solo existe con la página pintada.
/**
 * estrategia-web/map 0.3.0, sin imagen (lo normal): en vez de una foto de mapa, un
 * recuadro con los DATOS del sitio en texto real (nombre, dirección, teléfono
 * con enlace tel:, horario con sus saltos), el botón «Ver mapa» y el enlace
 * «Abrir en Google Maps». Ninguna <img> y ninguna petición a Google hasta el
 * clic. Página sembrada: /prueba-modulos/ (tests/fixtures/setup/setup.php).
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

const isGoogle = ( url ) => /google\.|gstatic\.|googleapis\./.test( new URL( url ).hostname );

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage();
		const seen = [];
		page.on( 'request', ( request ) => isGoogle( request.url() ) && seen.push( request.url() ) );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		const map = page.locator( '.estrategia-web-map' );
		await map.scrollIntoViewIfNeeded();

		assert.equal( await map.locator( 'img' ).count(), 0, 'sin imagen elegida no debería haber <img>' );
		const card = map.locator( '.estrategia-web-map__card' );
		assert.ok( await card.isVisible(), 'falta el recuadro con los datos' );
		const text = await card.innerText();
		for ( const expected of [ 'Ayuntamiento de prueba', 'Plaça de Cort 1, 07001 Palma', '+34 971 22 59 00', 'De lunes a viernes\nDe 9:00 a 14:00' ] ) {
			assert.ok( text.includes( expected ), `el recuadro no dice «${ expected }»:\n${ text }` );
		}
		assert.equal( await card.locator( 'a[href="tel:+34971225900"]' ).count(), 1, 'el teléfono no enlaza a tel:' );
		assert.ok( await map.getByRole( 'button', { name: 'Ver mapa' } ).isVisible(), 'falta «Ver mapa»' );
		assert.ok( await map.getByRole( 'link', { name: /Abrir en Google Maps/ } ).isVisible(), 'falta «Abrir en Google Maps»' );
		assert.deepEqual( seen, [], `peticiones a Google antes del clic:\n${ seen.join( '\n' ) }` );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
