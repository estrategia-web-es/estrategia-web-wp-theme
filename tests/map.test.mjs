// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba son las PETICIONES de red que hace la página, y solo existen al ejecutarla.
/**
 * armazon/map: ninguna petición a Google antes del clic; tras «Ver mapa», sí.
 * Y con el consentimiento: aceptar «mapas» lo carga sin clic, también en la
 * siguiente página (la elección ya guardada).
 *
 * Se miran PETICIONES a *.google.com, no apariciones del texto «google.com»
 * en el HTML: el enlace «Abrir en Google Maps» está ahí por diseño.
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
		// 1. Dos clics: nada antes, la carga después.
		const page = await newPage();
		const google = recordGoogle( page );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();
		await page.locator( '.armazon-map' ).scrollIntoViewIfNeeded();
		await page.waitForLoadState( 'networkidle' );
		assert.deepEqual( google, [], `peticiones a Google antes del clic:\n${ google.join( '\n' ) }` );
		// Sin src o con src="" (about:blank): la hidratación deja "" — ver blocks/map/view.js.
		const srcBefore = await page.locator( '.armazon-map__iframe' ).getAttribute( 'src' );
		assert.ok( ! srcBefore, `el iframe ya tiene src antes del clic: ${ srcBefore }` );

		const embedRequest = page.waitForRequest( ( request ) => /google\.com\/maps\/embed/.test( request.url() ) );
		await page.getByRole( 'button', { name: 'Ver mapa' } ).click();
		await embedRequest;
		assert.ok( await page.locator( '.armazon-map__iframe' ).isVisible(), 'el iframe no se ve tras el clic' );
		assert.ok( await page.getByRole( 'button', { name: 'Ver mapa' } ).isHidden(), 'el botón sigue visible' );

		// 2. Consentimiento: aceptar «mapas» en el aviso lo carga sin clic.
		const consented = await newPage();
		await consented.goto( PAGE, { waitUntil: 'networkidle' } );
		const viaEvent = consented.waitForRequest( ( request ) => /google\.com\/maps\/embed/.test( request.url() ) );
		await consented.getByRole( 'button', { name: 'Configurar', exact: true } ).click();
		await consented.getByRole( 'checkbox', { name: /Mapas y contenido de terceros/ } ).check();
		await consented.getByRole( 'button', { name: 'Guardar la selección' } ).click();
		// El iframe es loading="lazy": primero el hecho (src puesto), luego verlo.
		await consented.waitForFunction( () => /maps\/embed/.test( document.querySelector( '.armazon-map__iframe' ).getAttribute( 'src' ) || '' ) );
		await consented.locator( '.armazon-map' ).scrollIntoViewIfNeeded();
		await viaEvent;

		// 3. Y en la siguiente visita, ya con la elección guardada, carga directo.
		// Contexto nuevo con solo la cookie: en el mismo contexto el embed sale de
		// la caché del navegador y no hay evento «request» que esperar.
		const second = await newPage();
		await second.context().addCookies( await consented.context().cookies() );
		const direct = second.waitForRequest( ( request ) => /google\.com\/maps\/embed/.test( request.url() ) );
		await second.goto( PAGE );
		await second.waitForFunction( () => /maps\/embed/.test( document.querySelector( '.armazon-map__iframe' ).getAttribute( 'src' ) || '' ) );
		await second.locator( '.armazon-map' ).scrollIntoViewIfNeeded();
		await direct;
		assert.ok( await second.locator( '.armazon-consent' ).isHidden(), 'el aviso vuelve a salir con la elección guardada' );
	} )
);
