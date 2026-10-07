// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba son las PETICIONES de red que hace la página, y solo existen al ejecutarla.
/**
 * estrategia-web/map SIN el plugin del aviso de cookies (0.7.0: el aviso se fue a
 * estrategia-web-site, y este WordPress de pruebas no lo tiene): ninguna petición a
 * Google antes del clic; tras «Ver mapa», sí. No hay aviso ni
 * window.estrategiaWebConsent, y el mapa no lo echa en falta (sin errores).
 * Lo de «aceptar mapas en el aviso lo carga sin clic» se prueba donde está el
 * aviso: armazon-wp-sitio (contrato) y la web (tests/consent-maps.test.mjs de
 * Lavandería, padre + plugin juntos).
 *
 * Se miran PETICIONES a *.google.com, no apariciones del texto «google.com»
 * en el HTML: el enlace «Abrir en Google Maps» está ahí por diseño.
 *
 * Vista fallar el 05-10-2026: con blocks/map/view.js llamando a
 * window.estrategiaWebConsent.grant() sin «?.» revienta al pulsar (pageerror) y el
 * iframe no carga.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

const isGoogle = ( url ) => /^https?:\/\/([a-z0-9-]+\.)*google\.com\//.test( url );

function recordGoogle( page ) {
	const seen = [];
	page.on( 'request', ( request ) => {
		if ( isGoogle( request.url() ) ) {
			seen.push( request.url() );
		}
	} );
	return seen;
}

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage();
		const google = recordGoogle( page );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );

		// Sin el plugin: ni aviso ni API.
		assert.equal( await page.locator( '#estrategia-web-consent' ).count(), 0, 'el padre ya no pinta el aviso de cookies' );
		assert.equal( await page.evaluate( () => typeof window.estrategiaWebConsent ), 'undefined', 'sin plugin no debería haber window.estrategiaWebConsent' );

		// Dos clics: nada antes, la carga después.
		await page.locator( '.estrategia-web-map' ).scrollIntoViewIfNeeded();
		await page.waitForLoadState( 'networkidle' );
		assert.deepEqual( google, [], `peticiones a Google antes del clic:\n${ google.join( '\n' ) }` );
		// Sin src o con src="" (about:blank): la hidratación deja "" — ver blocks/map/view.js.
		const srcBefore = await page.locator( '.estrategia-web-map__iframe' ).getAttribute( 'src' );
		assert.ok( ! srcBefore, `el iframe ya tiene src antes del clic: ${ srcBefore }` );

		const embedRequest = page.waitForRequest( ( request ) => /google\.com\/maps\/embed/.test( request.url() ) );
		await page.getByRole( 'button', { name: 'Ver mapa' } ).click();
		await embedRequest;
		assert.ok( await page.locator( '.estrategia-web-map__iframe' ).isVisible(), 'el iframe no se ve tras el clic' );
		assert.ok( await page.getByRole( 'button', { name: 'Ver mapa' } ).isHidden(), 'el botón sigue visible' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
