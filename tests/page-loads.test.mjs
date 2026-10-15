// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: console errors and ES module errors (importmap, Interactivity) only exist when the page runs.
/**
 * The theme's pages load without console errors, in Spanish (the test site's
 * locale is es_ES), with the child theme active (that is: the parent works as
 * a parent).
 */
import { withBrowser, run, assert, PAGE, BASE_URL } from './browser.mjs';

const NOT_FOUND = `${ BASE_URL }/?name=zzqx-404-armazon`;

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 404 with ?name=: in Playground a pretty path that does not exist returns
		// the home page with 200 (its own routing, not WordPress's; measured 01-10-2026).
		for ( const url of [ PAGE, `${ BASE_URL }/`, NOT_FOUND, `${ BASE_URL }/?s=prueba` ] ) {
			const page = await newPage();
			const response = await page.goto( url, { waitUntil: 'networkidle' } );
			assert.ok( response.status() < 500, `${ url } returned ${ response.status() }` );
			// Chrome logs the document's own 404 as an error: it is the expected one.
			const errors = page.errors.filter( ( e ) => ! ( url === NOT_FOUND && e.endsWith( `404 (Not Found) @ ${ url }` ) ) );
			assert.deepEqual( errors, [], `${ url } has errors:\n${ errors.join( '\n' ) }` );
			assert.equal( await page.getAttribute( 'html', 'lang' ), 'es', `${ url } is not in Spanish` );
			await page.context().close();
		}

		const page = await newPage();
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		// The blocks' texts, translated (languages/es_ES.l10n.php).
		// (The cookie notice no longer belongs to the parent: it is in estrategia-web-site since 0.7.0.)
		for ( const text of [ 'Ver mapa' ] ) {
			assert.ok( await page.getByRole( 'button', { name: text, exact: true } ).isVisible(), `the "${ text }" button is missing` );
		}
		assert.ok(
			// Since plugin 1.1.x the name carries the location (or the address):
			// "Abrir en Google Maps: <location> (se abre en una pestaña nueva)".
			await page.getByRole( 'link', { name: /^Abrir en Google Maps: .+ \(se abre en una pestaña nueva\)$/ } ).first().isVisible(),
			'the "Abrir en Google Maps" link with its location and its new-tab notice is missing'
		);
		assert.ok( await page.getByRole( 'button', { name: 'Diapositiva siguiente' } ).isVisible(), 'arrow untranslated' );

		const notFound = await newPage();
		const notFoundResponse = await notFound.goto( NOT_FOUND );
		assert.equal( notFoundResponse.status(), 404 );
		assert.ok( await notFound.getByRole( 'heading', { name: 'Página no encontrada' } ).isVisible(), '404 untranslated' );

		// Home page in "latest posts" mode (Playground's): it lists posts, not
		// the content of the first one (see estrategia_web_front_page_only_when_static).
		const home = await newPage();
		await home.goto( `${ BASE_URL }/` );
		assert.ok( ( await home.locator( '.wp-block-post-template .wp-block-post-title a' ).count() ) > 0, 'the home page does not list posts' );
	} )
);
