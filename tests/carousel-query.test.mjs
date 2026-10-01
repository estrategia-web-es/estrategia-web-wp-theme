// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: que cada entrada de la Consulta sea una diapositiva es medida de cajas (anchos, scrollLeft), que solo existe pintado.
/**
 * armazon/carousel con un core/query dentro (0.2.0): cada <li> del
 * post-template es una diapositiva — se ven dos por fila, hay un punto por
 * entrada, la flecha avanza UNA entrada y «Fin» llega a la última.
 * Página sembrada en tests/fixtures/setup/setup.php (/prueba-carrusel-consulta/).
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.goto( `${ BASE_URL }/prueba-carrusel-consulta/`, { waitUntil: 'networkidle' } );
		await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();

		const carousel = page.locator( '.armazon-carousel' );
		const track = carousel.locator( '.armazon-carousel__track' );
		const slides = track.locator( '.wp-block-post-template > li' );
		await carousel.scrollIntoViewIfNeeded();

		assert.equal( await slides.count(), 6, 'la consulta debería traer seis entradas' );
		assert.ok( await carousel.evaluate( ( el ) => el.classList.contains( 'is-ready' ) ), 'no se hidrató (sin is-ready)' );

		// Dos por fila: cada entrada mide menos de la mitad de la pista y están EN FILA.
		const trackWidth = await track.evaluate( ( el ) => el.clientWidth );
		const boxes = await slides.evaluateAll( ( els ) => els.map( ( el ) => el.getBoundingClientRect() ) );
		assert.ok( boxes[ 0 ].width <= trackWidth / 2 + 1, `la entrada mide ${ boxes[ 0 ].width }px en una pista de ${ trackWidth }px` );
		assert.ok( Math.abs( boxes[ 1 ].top - boxes[ 0 ].top ) < 2, 'las entradas no están en fila (se apilan)' );
		assert.ok( boxes[ 1 ].left > boxes[ 0 ].left, 'la segunda entrada no está a la derecha de la primera' );

		// Un punto por entrada, no uno por bloque interno (que sería uno: la consulta).
		assert.equal( await page.locator( '.armazon-carousel__dot' ).count(), 6, 'debería haber un punto por entrada' );

		// La flecha avanza exactamente una entrada.
		const offsets = await slides.evaluateAll( ( els ) => els.map( ( el ) => el.offsetLeft - els[ 0 ].offsetLeft ) );
		await page.getByRole( 'button', { name: 'Diapositiva siguiente' } ).click();
		await page.waitForFunction( ( [ el, target ] ) => Math.abs( el.scrollLeft - target ) < 2, [ await track.elementHandle(), offsets[ 1 ] ] );

		// Fin: llega al final y «siguiente» se desactiva; el último punto queda marcado.
		await track.focus();
		await page.keyboard.press( 'End' );
		const next = page.getByRole( 'button', { name: 'Diapositiva siguiente' } );
		await page.waitForFunction( ( el ) => el.disabled, await next.elementHandle() );
		await page.waitForFunction( () => document.querySelectorAll( '.armazon-carousel__dot' )[ 5 ].getAttribute( 'aria-current' ) === 'true' );

		// Un punto concreto lleva a su entrada.
		await page.getByRole( 'button', { name: 'Ir a la diapositiva 2' } ).click();
		await page.waitForFunction( ( [ el, target ] ) => Math.abs( el.scrollLeft - target ) < 2, [ await track.elementHandle(), offsets[ 1 ] ] );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
