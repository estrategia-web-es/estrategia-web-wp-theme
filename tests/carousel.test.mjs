// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: el desplazamiento (scrollLeft, scroll-snap) y el foco solo existen con la página pintada.
/**
 * estrategia-web/carousel: avanza y retrocede con las flechas, con el teclado (← →
 * Fin) y con los puntos; las flechas se desactivan en los extremos.
 * Las esperas son por HECHOS (scrollLeft cambia), nunca por tiempo.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.goto( PAGE, { waitUntil: 'networkidle' } );

		const carousel = page.locator( '.estrategia-web-carousel' );
		const track = carousel.locator( '.estrategia-web-carousel__track' );
		const prev = page.getByRole( 'button', { name: 'Diapositiva anterior' } );
		const next = page.getByRole( 'button', { name: 'Diapositiva siguiente' } );
		const scrollLeft = () => track.evaluate( ( el ) => el.scrollLeft );

		await carousel.scrollIntoViewIfNeeded();
		assert.ok( await carousel.evaluate( ( el ) => el.classList.contains( 'is-ready' ) ), 'no se hidrató (sin is-ready)' );
		assert.equal( await carousel.getAttribute( 'aria-roledescription' ), 'carrusel' );
		assert.ok( await prev.isDisabled(), 'al empezar, «anterior» debería estar desactivada' );

		// Flecha siguiente.
		await next.click();
		await page.waitForFunction( ( el ) => el.scrollLeft > 50, await track.elementHandle() );
		await page.waitForFunction( ( el ) => ! el.disabled, await prev.elementHandle() );
		const afterArrow = await scrollLeft();

		// Teclado: foco en la pista y flecha derecha.
		await track.focus();
		await page.keyboard.press( 'ArrowRight' );
		await page.waitForFunction( ( [ el, before ] ) => el.scrollLeft > before + 50, [ await track.elementHandle(), afterArrow ] );

		// Fin: llega al final y «siguiente» se desactiva.
		await page.keyboard.press( 'End' );
		await page.waitForFunction( ( el ) => el.disabled, await next.elementHandle() );

		// Flecha anterior retrocede.
		const atEnd = await scrollLeft();
		await prev.click();
		await page.waitForFunction( ( [ el, before ] ) => el.scrollLeft < before - 50, [ await track.elementHandle(), atEnd ] );

		// Puntos: el primero vuelve al inicio y queda marcado.
		await page.getByRole( 'button', { name: 'Ir a la diapositiva 1' } ).click();
		await page.waitForFunction( ( el ) => el.scrollLeft < 1, await track.elementHandle() );
		await page.waitForFunction( () => document.querySelector( '.estrategia-web-carousel__dot' ).getAttribute( 'aria-current' ) === 'true' );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
