// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es si el paso de una diapositiva a otra SE VE deslizar o saltar, fotograma a fotograma, con la pista pintada, scroll-snap y animaciones reales.
/**
 * armazon/carousel infinito: cada flecha DESLIZA (0.7.2). En cada paso, con
 * «siguiente» y con «anterior», también al dar la vuelta (de la última a la
 * primera) y pulsando seguido sin esperar:
 * 1. entre la diapositiva de salida y la de llegada hay VARIOS fotogramas
 *    intermedios (al menos 3): no se cambia de golpe;
 * 2. ningún fotograma avanza más de media diapositiva respecto al anterior
 *    (un salto) ni va hacia atrás;
 * 3. al pararse, en el borde está la diapositiva que toca, y no queda nada
 *    añadido en la página (las copias de la animación se van).
 * Con «reducir movimiento» no hay animación, pero tampoco ida y vuelta: la
 * posición cambia una vez y queda en la que toca.
 *
 * Sobre /prueba-carrusel-bucle/ (tests/fixtures/setup/setup.php):
 * - «Carrusel con una de más»: TRES diapositivas y 2,4 a la vista, como la
 *   portada de Lavandería (fotos de la nave). Ninguna rotación de la fila deja
 *   desplazar una diapositiva entera, y hasta la 0.7.1 se cambiaba el orden y
 *   se ponía scrollLeft a 0 de golpe: VISTA FALLAR el 06-10-2026 con la 0.7.1
 *   (la posición pasa de 0 a 1 en un fotograma, sin intermedios). David: «el
 *   carrusel necesita una animación, va a saltos».
 * - «Carrusel en bucle»: cinco y dos a la vista; aquí sí hay desplazamiento y
 *   la prueba guarda que siga deslizando, también pulsando seguido.
 * Las esperas son por HECHOS (qué diapositiva está en el borde), nunca por
 * tiempo; lo único con tiempo es el intervalo entre clics «seguidos».
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-carrusel-bucle/`;

/**
 * In-page probes (the same idea as carousel-infinite.test.mjs): pos(track) is
 * the DOM index of the slide at the left edge plus the fraction scrolled past
 * it, measured on screen, so it says what is SEEN whatever the technique
 * (scroll, order, transforms).
 */
const probes = () => {
	window.__slides = ( track ) =>
		[ ...track.children ].flatMap( ( c ) =>
			c.classList.contains( 'wp-block-query' ) ? [ ...c.querySelectorAll( ':scope > .wp-block-post-template > li' ) ] : [ c ]
		);
	window.__pos = ( track ) => {
		const edge = track.getBoundingClientRect().left;
		const gap = parseFloat( getComputedStyle( track ).columnGap ) || 0;
		let best = null;
		window.__slides( track ).forEach( ( slide, i ) => {
			const r = slide.getBoundingClientRect();
			if ( r.right + gap > edge + 0.5 && ( ! best || r.left < best.r.left ) ) {
				best = { i, r };
			}
		} );
		return best.i + ( edge - best.r.left ) / ( best.r.width + gap );
	};
	window.__record = ( track ) => {
		window.__samples = [];
		const tick = () => {
			window.__samples.push( window.__pos( track ) );
			window.__frame = requestAnimationFrame( tick );
		};
		tick();
	};
	window.__stop = () => {
		cancelAnimationFrame( window.__frame );
		return window.__samples;
	};
};

/** Signed distance from a to b on a ring of n, in (-n/2, n/2]. */
const ring = ( a, b, n ) => {
	let d = ( b - a ) % n;
	if ( d > n / 2 ) d -= n;
	if ( d <= -n / 2 ) d += n;
	return d;
};

/** The samples as a continuous path from 0 (the ring unrolled). */
const unroll = ( samples, n ) => {
	const path = [ 0 ];
	for ( let i = 1; i < samples.length; i++ ) {
		path.push( path[ i - 1 ] + ring( samples[ i - 1 ], samples[ i ], n ) );
	}
	return path;
};

const settledAt = ( page, handle, index, n, what ) =>
	page
		.waitForFunction(
			( [ el, i, count ] ) => {
				const p = window.__pos( el );
				const d = Math.abs( ( ( ( ( p - i ) % count ) + count + count / 2 ) % count ) - count / 2 );
				const still = window.__last === p;
				window.__last = p;
				window.__still = d < 0.02 && still ? ( window.__still || 0 ) + 1 : 0;
				return window.__still >= 3;
			},
			[ handle, index, n ],
			{ timeout: 5000 }
		)
		.catch( async () => {
			throw new Error( `${ what }: no llega a la diapositiva ${ index + 1 } (está en ${ ( await page.evaluate( ( el ) => window.__pos( el ), handle ) ).toFixed( 2 ) })` );
		} );

/**
 * Checks one recorded trip of `distance` slides (negative: to the left).
 * smooth: whether it must glide (frames in between) or be instant.
 */
const checkTrip = ( samples, n, distance, smooth, what ) => {
	const path = unroll( samples, n );
	const dir = Math.sign( distance );
	let worstJump = 0;
	let worstBack = 0;
	for ( let i = 1; i < path.length; i++ ) {
		const step = dir * ( path[ i ] - path[ i - 1 ] );
		worstJump = Math.max( worstJump, step );
		worstBack = Math.min( worstBack, step );
	}
	const end = path[ path.length - 1 ];
	assert.ok( Math.abs( end - distance ) < 0.03, `${ what }: recorre ${ end.toFixed( 2 ) } diapositivas y debería recorrer ${ distance }` );
	assert.ok( worstBack > -0.03, `${ what }: en algún fotograma va hacia atrás ${ ( -worstBack ).toFixed( 2 ) } diapositivas` );
	if ( smooth ) {
		const between = path.filter( ( p ) => dir * p > 0.02 && dir * p < Math.abs( distance ) - 0.02 ).length;
		assert.ok( between >= 3 * Math.abs( distance ), `${ what }: solo ${ between } fotogramas entre la salida y la llegada (salta en vez de deslizar)` );
		assert.ok( worstJump <= 0.5, `${ what }: un fotograma avanza ${ worstJump.toFixed( 2 ) } diapositivas de golpe (salto)` );
	} else {
		const changes = path.filter( ( p, i ) => i && Math.abs( p - path[ i - 1 ] ) > 0.01 ).length;
		assert.ok( changes <= 2, `${ what }: sin animación la posición cambia ${ changes } veces (debería cambiar una)` );
	}
};

const open = async ( page, name ) => {
	const carousel = page.getByRole( 'region', { name, exact: true } );
	await carousel.scrollIntoViewIfNeeded();
	const handle = await carousel.locator( '.armazon-carousel__track' ).elementHandle();
	await page.waitForFunction( ( el ) => el.closest( '.armazon-carousel' ).classList.contains( 'is-ready' ), handle );
	return {
		carousel,
		handle,
		next: carousel.getByRole( 'button', { name: 'Diapositiva siguiente' } ),
		prev: carousel.getByRole( 'button', { name: 'Diapositiva anterior' } ),
	};
};

/** One click per trip, each recorded on its own: a full lap forward and back. */
const lap = async ( page, name, n, smooth, label ) => {
	const { carousel, handle, next, prev } = await open( page, name );
	await settledAt( page, handle, 0, n, `${ label }, al cargar` );
	let at = 0;
	for ( const [ button, dir, times ] of [ [ next, 1, n + 1 ], [ prev, -1, n + 1 ] ] ) {
		for ( let k = 0; k < times; k++ ) {
			const from = at;
			at = ( at + dir + n ) % n;
			await page.evaluate( ( el ) => window.__record( el ), handle );
			await button.click();
			await settledAt( page, handle, at, n, `${ label }, de la ${ from + 1 } a la ${ at + 1 }` );
			const samples = await page.evaluate( () => window.__stop() );
			checkTrip( samples, n, dir, smooth, `${ label }, de la ${ from + 1 } a la ${ at + 1 }` );
			assert.equal( await carousel.locator( '.armazon-carousel__ghosts' ).count(), 0, `${ label }: quedan copias de la animación en la página` );
			assert.equal( await page.evaluate( ( el ) => window.__slides( el ).length, handle ), n, `${ label }: el número de diapositivas ha cambiado` );
		}
	}
	return { handle, next, prev, at };
};

/** Three clicks in a row without waiting: one recording, three slides. */
const burst = async ( page, name, n, label ) => {
	const { handle, next, prev } = await open( page, name );
	await settledAt( page, handle, 0, n, `${ label }, antes de pulsar seguido` );
	for ( const [ button, dir ] of [ [ next, 1 ], [ prev, -1 ] ] ) {
		const start = Math.round( await page.evaluate( ( el ) => window.__pos( el ), handle ) ) % n;
		await page.evaluate( ( el ) => window.__record( el ), handle );
		for ( let k = 0; k < 3; k++ ) {
			await button.click();
			await page.waitForTimeout( 90 );
		}
		const end = ( start + 3 * dir + n * 3 ) % n;
		await settledAt( page, handle, end, n, `${ label }, tres «${ dir > 0 ? 'siguiente' : 'anterior' }» seguidos` );
		const samples = await page.evaluate( () => window.__stop() );
		checkTrip( samples, n, 3 * dir, true, `${ label }, tres «${ dir > 0 ? 'siguiente' : 'anterior' }» seguidos` );
	}
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		for ( const [ width, suffix ] of [ [ 1200, '' ], [ 402, ' en móvil' ] ] ) {
			const page = await newPage( { viewport: { width, height: 900 } } );
			await page.addInitScript( probes );
			await page.goto( URL, { waitUntil: 'networkidle' } );
			for ( const [ name, n ] of [ [ 'Carrusel con una de más', 3 ], [ 'Carrusel en bucle', 5 ] ] ) {
				await lap( page, name, n, true, name + suffix );
				await burst( page, name, n, name + suffix );
			}
			assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
		}

		// «Reducir movimiento»: sin animación y sin ida y vuelta.
		const calm = await newPage( { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' } );
		await calm.addInitScript( probes );
		await calm.goto( URL, { waitUntil: 'networkidle' } );
		await lap( calm, 'Carrusel con una de más', 3, false, 'Con «reducir movimiento»' );
		assert.deepEqual( calm.errors, [], calm.errors.join( '\n' ) );
	} )
);
