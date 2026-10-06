// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: una transición entre documentos solo existe al navegar de verdad (el evento pagereveal y su viewTransition), y view-transition-name es estilo calculado.
/**
 * Transiciones entre páginas (0.7.5, assets/view-transitions.css):
 * - al navegar de /prueba-modulos/ a la portada por un enlace, la página
 *   nueva arranca CON transición (pagereveal trae viewTransition);
 * - la regla @view-transition { navigation: auto } está en las hojas;
 * - la cabecera (header de la plantilla) se llama armazon-header y el botón
 *   de WhatsApp del pie armazon-whatsapp (esta página tiene otro en el
 *   contenido: el caso que repetía el nombre), y ningún view-transition-name se repite
 *   en la página (un nombre repetido aborta la transición entera);
 * - con prefers-reduced-motion: reduce, la misma navegación va SIN transición.
 * Contra la 0.7.4 falla: no había transición ni nombres.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

/** Records, in every document of the context, whether it was revealed with a view transition. */
const recordReveal = ( context ) =>
	context.addInitScript( () => {
		window.addEventListener( 'pagereveal', ( event ) => {
			sessionStorage.setItem( 'armazon-vt', event.viewTransition ? 'yes' : 'no' );
		} );
	} );

const navigateHome = async ( page ) => {
	await page.evaluate( () => sessionStorage.removeItem( 'armazon-vt' ) );
	await Promise.all( [ page.waitForURL( ( url ) => url.pathname === '/' ), page.locator( '.wp-site-blocks > header .wp-block-site-title a' ).click() ] );
	await page.waitForFunction( () => sessionStorage.getItem( 'armazon-vt' ) !== null );
	return page.evaluate( () => sessionStorage.getItem( 'armazon-vt' ) );
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
		assert.ok( rule.some( ( r ) => r.navigation === 'auto' ), `no hay @view-transition { navigation: auto }: ${ JSON.stringify( rule ) }` );

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
				return el ? getComputedStyle( el ).viewTransitionName : 'NO EXISTE';
			};
			return { all, header: of( '.wp-site-blocks > header' ), whatsapp: of( 'footer.wp-block-template-part .armazon-whatsapp' ) };
		} );
		assert.equal( names.header, 'armazon-header', 'la cabecera no lleva view-transition-name: armazon-header' );
		assert.equal( names.whatsapp, 'armazon-whatsapp', 'el WhatsApp no lleva view-transition-name: armazon-whatsapp' );
		for ( const [ name, count ] of Object.entries( names.all ) ) {
			assert.equal( count, 1, `view-transition-name «${ name }» repetido ${ count } veces: la transición se aborta` );
		}

		assert.equal( await navigateHome( page ), 'yes', 'al navegar a la portada no hubo transición' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		const calm = await newPage( { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' } );
		await recordReveal( calm.context() );
		await calm.goto( PAGE, { waitUntil: 'networkidle' } );
		assert.equal( await navigateHome( calm ), 'no', 'con prefers-reduced-motion hubo transición' );
	} )
);
