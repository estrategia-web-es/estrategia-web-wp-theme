// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: se comprueba el nombre accesible y que el botón está fijo y visible en pantalla, que es estilo calculado.
/**
 * armazon/whatsapp: el enlace wa.me es correcto con atributos (número con
 * espacios y «+», mensaje con acentos) y con la opción del sitio (el del pie),
 * se abre en pestaña nueva, tiene nombre accesible y queda fijo en su esquina.
 * Desde 0.7.1, la distancia a la esquina suma el margen seguro del móvil
 * (env(safe-area-inset-*)): se mira en la hoja, porque en un navegador de
 * escritorio env() vale 0 y el estilo calculado no lo distingue.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );

		const buttons = page.getByRole( 'link', { name: /Escríbenos por WhatsApp/ } );
		assert.equal( await buttons.count(), 2, 'se esperaban dos: el de la página y el del pie' );

		const hrefs = await buttons.evaluateAll( ( links ) => links.map( ( a ) => a.getAttribute( 'href' ) ) );
		assert.ok(
			hrefs.includes( 'https://wa.me/34600111222?text=' + encodeURIComponent( 'Hola, ¿tenéis hora mañana?' ) ),
			`falta el enlace con atributos: ${ hrefs.join( ' ' ) }`
		);
		assert.ok(
			hrefs.includes( 'https://wa.me/34611223344?text=' + encodeURIComponent( 'Mensaje desde la opción del sitio' ) ),
			`falta el enlace de la opción del sitio: ${ hrefs.join( ' ' ) }`
		);

		for ( const link of await buttons.all() ) {
			assert.equal( await link.getAttribute( 'target' ), '_blank' );
			assert.match( await link.getAttribute( 'rel' ), /noopener/ );
			assert.equal( await link.evaluate( ( el ) => getComputedStyle( el ).position ), 'fixed' );
			const box = await link.boundingBox();
			assert.ok( box && box.width >= 44 && box.height >= 44, 'diana táctil menor de 44 px' );
		}

		// Posición: el de la página va a la izquierda, el del pie a la derecha.
		const left = await page.locator( '.armazon-whatsapp.is-position-bottom-left' ).boundingBox();
		const right = await page.locator( '.armazon-whatsapp.is-position-bottom-right' ).boundingBox();
		assert.ok( left.x < 100 && right.x > 1000, `posiciones inesperadas: ${ left.x } / ${ right.x }` );

		// Margen seguro (0.7.1): abajo y en el lado de su esquina, cada uno el suyo.
		const insets = await page.evaluate( () => {
			const found = {};
			const walk = ( rules ) => {
				for ( const rule of rules ) {
					if ( rule.cssRules ) {
						walk( rule.cssRules );
					}
					if ( ! rule.selectorText || ! rule.selectorText.includes( '.armazon-whatsapp' ) ) {
						continue;
					}
					for ( const prop of [ 'inset-block-end', 'inset-inline-start', 'inset-inline-end' ] ) {
						const value = rule.style.getPropertyValue( prop );
						if ( value ) {
							found[ `${ rule.selectorText } ${ prop }` ] = value;
						}
					}
				}
			};
			for ( const sheet of document.styleSheets ) {
				try {
					walk( sheet.cssRules );
				} catch {}
			}
			return found;
		} );
		const insetOf = ( selector, prop ) => insets[ `${ selector } ${ prop }` ] || '';
		assert.match( insetOf( '.armazon-whatsapp', 'inset-block-end' ), /safe-area-inset-bottom/, JSON.stringify( insets ) );
		assert.match( insetOf( '.armazon-whatsapp.is-position-bottom-left', 'inset-inline-start' ), /safe-area-inset-left/, JSON.stringify( insets ) );
		assert.match( insetOf( '.armazon-whatsapp.is-position-bottom-right', 'inset-inline-end' ), /safe-area-inset-right/, JSON.stringify( insets ) );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
