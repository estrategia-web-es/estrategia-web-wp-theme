// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: dar la vuelta es desplazar la pista (scrollLeft) y leer si un botón está desactivado tras hidratar, que solo existe con la página pintada.
/**
 * armazon/carousel en bucle (0.5.0, atributo loop, por defecto true):
 * 1. al cargar, las DOS flechas están activas (antes «anterior» salía gris);
 * 2. «anterior» en la primera enseña la última;
 * 3. «siguiente» en la última vuelve a la primera;
 * 4. igual con ← → del teclado, y lo mismo con un core/query dentro, donde
 *    las diapositivas son las entradas.
 *
 * Sobre /prueba-carrusel-bucle/ (tests/fixtures/setup/setup.php): dos
 * carruseles SIN el atributo loop, así que prueba además el valor por defecto.
 * Vista fallar el 03-10-2026 con la 0.4.0: «anterior» desactivada al cargar.
 * Las esperas son por HECHOS (scrollLeft), nunca por tiempo.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

/*
 * Se mira lo que SE VE, no scrollLeft (cambiado en 0.6.0): desde el infinito
 * la pista rota sus diapositivas y «la última» ya no es el final físico de la
 * pista. Que el bucle además no rebobine lo vigila carousel-infinite.test.mjs.
 * Las dos funciones se ejecutan DENTRO de la página (waitForFunction las
 * serializa): no pueden llamar a nada de este fichero.
 */
/** The last slide is entirely in view. */
const lastInView = ( el ) => {
	const all = [ ...el.children ].flatMap( ( c ) => ( c.classList.contains( 'wp-block-query' ) ? [ ...c.querySelectorAll( ':scope > .wp-block-post-template > li' ) ] : [ c ] ) );
	const r = all[ all.length - 1 ].getBoundingClientRect();
	const t = el.getBoundingClientRect();
	return r.left >= t.left - 1 && r.right <= t.right + 1;
};
/** The first slide sits at the left edge. */
const firstAtStart = ( el ) => {
	const first = el.children[ 0 ].classList.contains( 'wp-block-query' ) ? el.querySelector( 'li' ) : el.children[ 0 ];
	return Math.abs( first.getBoundingClientRect().left - el.getBoundingClientRect().left ) < 1;
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.goto( `${ BASE_URL }/prueba-carrusel-bucle/`, { waitUntil: 'networkidle' } );
		await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();

		for ( const name of [ 'Carrusel en bucle', 'Carrusel en bucle con consulta' ] ) {
			const carousel = page.getByRole( 'region', { name, exact: true } );
			const track = carousel.locator( '.armazon-carousel__track' );
			const prev = carousel.getByRole( 'button', { name: 'Diapositiva anterior' } );
			const next = carousel.getByRole( 'button', { name: 'Diapositiva siguiente' } );
			const handle = await track.elementHandle();
			await carousel.scrollIntoViewIfNeeded();
			assert.ok( await carousel.evaluate( ( el ) => el.classList.contains( 'is-ready' ) ), `${ name }: no se hidrató` );

			// 1. Las dos flechas activas al cargar.
			assert.equal( await prev.isDisabled(), false, `${ name }: «anterior» sale desactivada al cargar` );
			assert.equal( await next.isDisabled(), false, `${ name }: «siguiente» sale desactivada al cargar` );

			// 2. «Anterior» desde la primera va al final.
			await prev.click();
			await page.waitForFunction( lastInView, handle );

			// 3. «Siguiente» desde la última vuelve al principio, y la flecha sigue activa.
			assert.equal( await next.isDisabled(), false, `${ name }: «siguiente» se desactiva en la última` );
			await next.click();
			await page.waitForFunction( firstAtStart, handle );

			// 4. Teclado: ← en la primera va al final; → en la última vuelve.
			await track.focus();
			await page.keyboard.press( 'ArrowLeft' );
			await page.waitForFunction( lastInView, handle );
			await page.keyboard.press( 'ArrowRight' );
			await page.waitForFunction( firstAtStart, handle );
		}

		// Con consulta: cada entrada sigue siendo una diapositiva (seis puntos).
		const dots = page.getByRole( 'region', { name: 'Carrusel en bucle con consulta', exact: true } ).locator( '.armazon-carousel__dot' );
		assert.equal( await dots.count(), 6, 'con consulta debería haber un punto por entrada' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
