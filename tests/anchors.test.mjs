// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es el desplazamiento de la ventana fotograma a fotograma y dónde queda el destino respecto a una cabecera fija pintada encima; sin página pintada no hay ni scroll ni cabecera.
/**
 * Un enlace a #algo de la misma página DESLIZA, y el destino queda a la
 * vista bajo la cabecera fija (style.css del padre, 0.7.3):
 * 1. al pulsar un enlace interno, scrollY pasa por al menos 3 posiciones
 *    intermedias y nunca retrocede; el destino acaba justo bajo la cabecera
 *    (ni tapado ni a más de 24 px);
 * 2. al ENTRAR con #destino en la URL, el destino acaba igual: a la vista,
 *    justo bajo la cabecera;
 * 3. con «reducir movimiento», el clic salta sin posiciones intermedias y
 *    el destino queda igual de bien colocado.
 *
 * Sobre /prueba-anclas/ (tests/fixtures/setup/setup.php): un enlace arriba y
 * un h2#destino 2400 px más abajo. La cabecera fija de 80 px y el token
 * --wp--custom--layout--cabecera los pone el hijo de prueba SOLO en esa
 * página (tests/fixtures/armazon-hijo-prueba/functions.php), como haría un
 * hijo con cabecera fija (Lavandería).
 * Vista fallar el 06-10-2026 con la 0.7.2: el clic saltaba de 0 al final en
 * un fotograma, y el destino quedaba a 0 px, debajo de la cabecera de 80.
 *
 * Cómo se mantiene: si el padre llega a tener cabecera fija propia, esta
 * prueba no cambia (mide lo que se ve). La trampa: el scroll suave se mide
 * con requestAnimationFrame DENTRO de la página, como en accordion.test.mjs;
 * entre dos llamadas de Playwright la animación ya ha terminado.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-anclas/`;
const HEADER = 80;

/** Where the target and the fixed header are, in viewport pixels. */
const where = ( page ) =>
	page.evaluate( () => ( {
		target: Math.round( document.getElementById( 'destino' ).getBoundingClientRect().top ),
		header: Math.round( document.querySelector( '.wp-site-blocks > header' ).getBoundingClientRect().bottom ),
		y: Math.round( scrollY ),
	} ) );

/** Clicks the in-page link and records scrollY on every frame until it stops for 300 ms. */
const clickAndSample = ( page ) =>
	page.evaluate( async () => {
		const ys = [ Math.round( scrollY ) ];
		document.querySelector( 'a[href="#destino"]' ).click();
		let still = performance.now();
		await new Promise( ( resolve ) => {
			const tick = () => {
				const y = Math.round( scrollY );
				if ( y !== ys.at( -1 ) ) {
					still = performance.now();
				}
				ys.push( y );
				if ( performance.now() - still < 300 ) {
					requestAnimationFrame( tick );
				} else {
					resolve();
				}
			};
			requestAnimationFrame( tick );
		} );
		return ys;
	} );

const placed = ( pos, label ) => {
	assert.ok( pos.header >= HEADER - 1, `${ label }: la cabecera fija no está (mide ${ pos.header } px): la siembra no la ha puesto` );
	assert.ok( pos.target >= pos.header - 1, `${ label }: el destino queda TAPADO por la cabecera (destino a ${ pos.target } px, cabecera hasta ${ pos.header })` );
	assert.ok( pos.target <= pos.header + 24, `${ label }: el destino queda lejos de la cabecera (a ${ pos.target } px, cabecera hasta ${ pos.header })` );
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 1: clic en un enlace interno, con movimiento.
		const page = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'no-preference' } );
		await page.goto( URL, { waitUntil: 'load' } );
		const ys = await clickAndSample( page );
		const end = ys.at( -1 );
		const middle = [ ...new Set( ys.filter( ( y ) => y > ys[ 0 ] + 2 && y < end - 2 ) ) ];
		assert.ok( middle.length >= 3, `el clic salta en vez de deslizar: ${ [ ...new Set( ys ) ].join( ' ' ) }` );
		const back = ys.findIndex( ( y, i ) => i > 0 && y < ys[ i - 1 ] );
		assert.equal( back, -1, `el desplazamiento retrocede: ${ [ ...new Set( ys ) ].join( ' ' ) }` );
		placed( await where( page ), 'clic' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 2: entrar con el ancla en la URL.
		const entry = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'no-preference' } );
		await entry.goto( `${ URL }#destino`, { waitUntil: 'load' } );
		await entry.waitForFunction( () => document.getElementById( 'destino' ).getBoundingClientRect().top < 200 );
		// Hecho que se espera: scrollY sin cambiar durante 300 ms de fotogramas.
		await entry.evaluate( () => new Promise( ( resolve ) => {
			let y = scrollY;
			let still = performance.now();
			const tick = () => {
				if ( scrollY !== y ) {
					y = scrollY;
					still = performance.now();
				}
				if ( performance.now() - still < 300 ) {
					requestAnimationFrame( tick );
				} else {
					resolve();
				}
			};
			requestAnimationFrame( tick );
		} ) );
		placed( await where( entry ), 'al entrar con #destino' );
		assert.deepEqual( entry.errors, [], entry.errors.join( '\n' ) );

		// 3: con «reducir movimiento», salta.
		const still = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' } );
		await still.goto( URL, { waitUntil: 'load' } );
		const jump = await clickAndSample( still );
		const jumpEnd = jump.at( -1 );
		assert.deepEqual( [ ...new Set( jump.filter( ( y ) => y > jump[ 0 ] + 2 && y < jumpEnd - 2 ) ) ], [], `con «reducir movimiento» el salto se anima: ${ [ ...new Set( jump ) ].join( ' ' ) }` );
		placed( await where( still ), 'con reducir movimiento' );
	} )
);
