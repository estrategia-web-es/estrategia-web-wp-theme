// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: what is tested is the window scrolling frame by frame and where the target ends up relative to a sticky header painted on top; without a painted page there is neither scroll nor header.
/**
 * A link to #something on the same page SCROLLS smoothly, and the target
 * stays in view below the sticky header (the parent's style.css, 0.7.3):
 * 1. on clicking an internal link, scrollY goes through at least 3
 *    intermediate positions and never goes back; the target ends up right
 *    below the header (neither covered nor more than 24 px away);
 * 2. when ARRIVING with #destino in the URL, the target ends up the same: in
 *    view, right below the header;
 * 3. with "reduce motion", the click jumps without intermediate positions and
 *    the target is just as well placed.
 *
 * On /prueba-anclas/ (tests/fixtures/setup/setup.php): a link at the top and
 * an h2#destino 2400 px further down. The 80 px sticky header and the token
 * --wp--custom--layout--cabecera are set by the test child ONLY on that page
 * (tests/fixtures/estrategia-web-hijo-prueba/functions.php), as a child with
 * a sticky header would (Lavandería).
 * Seen failing on 06-10-2026 with 0.7.2: the click jumped from 0 to the end
 * in one frame, and the target ended up at 0 px, under the 80 px header.
 *
 * How to maintain: if the parent ever gets its own sticky header, this test
 * does not change (it measures what is seen). The trap: smooth scrolling is
 * measured with requestAnimationFrame INSIDE the page, as in
 * accordion.test.mjs; between two Playwright calls the animation has already
 * finished.
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
	assert.ok( pos.header >= HEADER - 1, `${ label }: the sticky header is missing (it is ${ pos.header } px): the seed has not set it` );
	assert.ok( pos.target >= pos.header - 1, `${ label }: the target is COVERED by the header (target at ${ pos.target } px, header down to ${ pos.header })` );
	assert.ok( pos.target <= pos.header + 24, `${ label }: the target is far from the header (at ${ pos.target } px, header down to ${ pos.header })` );
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 1: click on an internal link, with motion.
		const page = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'no-preference' } );
		await page.goto( URL, { waitUntil: 'load' } );
		const ys = await clickAndSample( page );
		const end = ys.at( -1 );
		const middle = [ ...new Set( ys.filter( ( y ) => y > ys[ 0 ] + 2 && y < end - 2 ) ) ];
		assert.ok( middle.length >= 3, `the click jumps instead of scrolling smoothly: ${ [ ...new Set( ys ) ].join( ' ' ) }` );
		const back = ys.findIndex( ( y, i ) => i > 0 && y < ys[ i - 1 ] );
		assert.equal( back, -1, `the scroll goes back: ${ [ ...new Set( ys ) ].join( ' ' ) }` );
		placed( await where( page ), 'click' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 2: arriving with the anchor in the URL.
		const entry = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'no-preference' } );
		await entry.goto( `${ URL }#destino`, { waitUntil: 'load' } );
		await entry.waitForFunction( () => document.getElementById( 'destino' ).getBoundingClientRect().top < 200 );
		// The fact waited for: scrollY unchanged for 300 ms of frames.
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
		placed( await where( entry ), 'arriving with #destino' );
		assert.deepEqual( entry.errors, [], entry.errors.join( '\n' ) );

		// 3: with "reduce motion", it jumps.
		const still = await newPage( { viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' } );
		await still.goto( URL, { waitUntil: 'load' } );
		const jump = await clickAndSample( still );
		const jumpEnd = jump.at( -1 );
		assert.deepEqual( [ ...new Set( jump.filter( ( y ) => y > jump[ 0 ] + 2 && y < jumpEnd - 2 ) ) ], [], `with "reduce motion" the jump animates: ${ [ ...new Set( jump ) ].join( ' ' ) }` );
		placed( await where( still ), 'with reduce motion' );
	} )
);
