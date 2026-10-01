// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: los errores de consola y de los módulos ES (importmap, Interactivity) solo existen al ejecutar la página.
/**
 * Las páginas del tema cargan sin errores de consola, en castellano, con el
 * tema hijo activo (o sea: el padre funciona como padre).
 */
import { withBrowser, run, assert, PAGE, BASE_URL } from './browser.mjs';

const NOT_FOUND = `${ BASE_URL }/?name=zzqx-404-armazon`;

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 404 con ?name=: en Playground una ruta bonita que no existe devuelve la
		// portada con 200 (enrutado suyo, no de WordPress; medido 01-10-2026).
		for ( const url of [ PAGE, `${ BASE_URL }/`, NOT_FOUND, `${ BASE_URL }/?s=prueba` ] ) {
			const page = await newPage();
			const response = await page.goto( url, { waitUntil: 'networkidle' } );
			assert.ok( response.status() < 500, `${ url } devolvió ${ response.status() }` );
			// El 404 del propio documento lo anota Chrome como error: es el esperado.
			const errors = page.errors.filter( ( e ) => ! ( url === NOT_FOUND && e.endsWith( `404 (Not Found) @ ${ url }` ) ) );
			assert.deepEqual( errors, [], `${ url } tiene errores:\n${ errors.join( '\n' ) }` );
			assert.equal( await page.getAttribute( 'html', 'lang' ), 'es', `${ url } no está en castellano` );
			await page.context().close();
		}

		const page = await newPage();
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		// Textos de los bloques traducidos (languages/es_ES.l10n.php).
		for ( const text of [ 'Ver mapa', 'Aceptar todas', 'Rechazar todas' ] ) {
			assert.ok( await page.getByRole( 'button', { name: text, exact: true } ).isVisible(), `falta el botón «${ text }»` );
		}
		assert.ok(
			await page.getByRole( 'link', { name: 'Abrir en Google Maps (se abre en una pestaña nueva)' } ).isVisible(),
			'falta el enlace «Abrir en Google Maps» con su aviso de pestaña nueva'
		);
		assert.ok( await page.getByRole( 'button', { name: 'Diapositiva siguiente' } ).isVisible(), 'flecha sin traducir' );

		const notFound = await newPage();
		const notFoundResponse = await notFound.goto( NOT_FOUND );
		assert.equal( notFoundResponse.status(), 404 );
		assert.ok( await notFound.getByRole( 'heading', { name: 'Página no encontrada' } ).isVisible(), '404 sin traducir' );

		// Portada en modo «últimas entradas» (el de Playground): lista entradas,
		// no el contenido de la primera (ver armazon_front_page_only_when_static).
		const home = await newPage();
		await home.goto( `${ BASE_URL }/` );
		assert.ok( ( await home.locator( '.wp-block-post-template .wp-block-post-title a' ).count() ) > 0, 'la portada no lista entradas' );
	} )
);
