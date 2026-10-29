// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: a cross-document transition only exists when really navigating (the pagereveal event and its viewTransition), and view-transition-name is a computed style.
/**
 * Transitions between pages (0.7.5, assets/view-transitions.css):
 * - when navigating from /prueba-modulos/ to the home page through a link,
 *   the new page starts WITH a transition (pagereveal carries viewTransition);
 * - the @view-transition { navigation: auto } rule is in the stylesheets;
 * - the header (the template's header) is named estrategia-web-header and the
 *   footer's WhatsApp button estrategia-web-whatsapp (this page has another
 *   one in the content: the case that repeated the name), and no
 *   view-transition-name repeats on the page (a repeated name aborts the
 *   whole transition);
 * - with prefers-reduced-motion: reduce, the same navigation goes WITHOUT a
 *   transition.
 * Against 0.7.4 it fails: there was neither a transition nor names.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

/** Records, in every document of the context, whether it was revealed with a view transition. */
const recordReveal = ( context ) =>
	context.addInitScript( () => {
		window.addEventListener( 'pagereveal', ( event ) => {
			sessionStorage.setItem( 'estrategia-web-vt', event.viewTransition ? 'yes' : 'no' );
		} );
	} );

const navigateHome = async ( page ) => {
	await page.evaluate( () => sessionStorage.removeItem( 'estrategia-web-vt' ) );
	await Promise.all( [ page.waitForURL( ( url ) => url.pathname === '/' ), page.locator( '.wp-site-blocks > header .wp-block-site-title a' ).click() ] );
	await page.waitForFunction( () => sessionStorage.getItem( 'estrategia-web-vt' ) !== null );
	return page.evaluate( () => sessionStorage.getItem( 'estrategia-web-vt' ) );
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await recordReveal( page.context() );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );

		const rule = await page.evaluate( () => {
			const found = [];
			const walk = ( rules, media ) => {
				for ( const r of rules ) {
					if ( r.constructor.name === 'CSSViewTransitionRule' ) {
						found.push( { navigation: r.navigation, media } );
					} else if ( r.cssRules ) {
						walk( r.cssRules, r.conditionText || media );
					}
				}
			};
			for ( const sheet of document.styleSheets ) {
				try {
					walk( sheet.cssRules, '' );
				} catch {}
			}
			return found;
		} );
		assert.ok( rule.some( ( r ) => r.navigation === 'auto' ), `there is no @view-transition { navigation: auto }: ${ JSON.stringify( rule ) }` );

		const names = await page.evaluate( () => {
			const all = {};
			for ( const el of document.querySelectorAll( '*' ) ) {
				const name = getComputedStyle( el ).viewTransitionName;
				if ( name && name !== 'none' ) {
					all[ name ] = ( all[ name ] || 0 ) + 1;
				}
			}
			const of = ( selector ) => {
				const el = document.querySelector( selector );
				return el ? getComputedStyle( el ).viewTransitionName : 'MISSING';
			};
			const h = document.querySelector( '.wp-site-blocks > header' );
			return { all, header: of( '.wp-site-blocks > header' ), headerZ: h ? getComputedStyle( h ).zIndex : 'MISSING', whatsapp: of( 'footer.wp-block-template-part .estrategia-web-whatsapp' ) };
		} );
		assert.equal( names.header, 'estrategia-web-header', 'the header does not have view-transition-name: estrategia-web-header' );
		// The name makes the header a stacking context: without a z-index the
		// <main> paints over the mobile menu overlay (29-10-2026).
		assert.notEqual( names.headerZ, 'auto', 'the named header has no z-index: the mobile menu opens UNDER the page' );
		assert.equal( names.whatsapp, 'estrategia-web-whatsapp', 'WhatsApp does not have view-transition-name: estrategia-web-whatsapp' );
		for ( const [ name, count ] of Object.entries( names.all ) ) {
			assert.equal( count, 1, `view-transition-name "${ name }" repeated ${ count } times: the transition is aborted` );
		}

		assert.equal( await navigateHome( page ), 'yes', 'navigating to the home page had no transition' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		const calm = await newPage( { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' } );
		await recordReveal( calm.context() );
		await calm.goto( PAGE, { waitUntil: 'networkidle' } );
		assert.equal( await navigateHome( calm ), 'no', 'with prefers-reduced-motion there was a transition' );
	} )
);
