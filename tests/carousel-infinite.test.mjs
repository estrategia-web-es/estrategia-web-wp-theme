// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es lo que SE VE fotograma a fotograma mientras la pista se desplaza (qué diapositiva asoma por el borde y hacia dónde va), con scroll-snap, teclado y gestos táctiles reales; nada de eso existe sin pintar la página.
/**
 * estrategia-web/carousel infinito (0.6.0, atributo loop, por defecto true):
 * 1. «siguiente» da la vuelta entera SIN retroceder nunca: en ningún
 *    fotograma la pista va hacia atrás, y tras la última asoma la primera a
 *    continuación (a su derecha);
 * 2. «anterior» igual en sentido contrario, y ← del teclado en la primera
 *    lleva a la última yendo hacia la izquierda;
 * 3. el punto activo es siempre el de la diapositiva del borde izquierdo, y
 *    pulsar un punto lleva a la suya;
 * 4. no hay clones: tantas diapositivas en el DOM como entradas o bloques, y
 *    ningún id repetido;
 * 5. en móvil, arrastrar con el dedo hacia la derecha en la primera enseña la
 *    última (gesto táctil real, con scroll-snap);
 * 6. con «reducir movimiento» la vuelta se hace igual (sin animación);
 * 7. con UNA diapositiva no hay controles ni se toca nada;
 * 8. en una rejilla de dos filas (CSS del hijo) se da la vuelta por
 *    columnas y ninguna ficha cambia de fila.
 * Lo mismo con un core/query dentro (las diapositivas son las entradas).
 *
 * Sobre /prueba-carrusel-bucle/ (tests/fixtures/setup/setup.php).
 * Vista fallar el 03-10-2026 con la 0.5.0: al pulsar «siguiente» en la última
 * posición la pista retrocede recorriendo todas hacia atrás.
 * Las esperas son por HECHOS (qué diapositiva está en el borde), nunca por tiempo.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-carrusel-bucle/`;

/**
 * In-page probes. pos(track) is the continuous position of the track: the
 * DOM index of the slide at the left edge plus the fraction already scrolled
 * past it. DOM order is the logical order (the carousel never reorders the
 * DOM), so it says which slide is SEEN, whatever technique is used.
 */
const probes = () => {
	const slides = ( track ) =>
		[ ...track.children ].flatMap( ( c ) =>
			c.classList.contains( 'wp-block-query' ) ? [ ...c.querySelectorAll( ':scope > .wp-block-post-template > li' ) ] : [ c ]
		);
	window.__slides = slides;
	window.__pos = ( track ) => {
		const edge = track.getBoundingClientRect().left;
		const gap = parseFloat( getComputedStyle( track ).columnGap ) || 0;
		let best = null;
		window.__slides( track ).forEach( ( slide, i ) => {
			const r = slide.getBoundingClientRect();
			// The slide that covers the edge, or (in a gap) the next one.
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

/** Every frame moves in direction dir (or stays): returns the worst step back. */
const worstBackStep = ( samples, n, dir ) => {
	let worst = 0;
	for ( let i = 1; i < samples.length; i++ ) {
		worst = Math.min( worst, dir * ring( samples[ i - 1 ], samples[ i ], n ) );
	}
	return worst;
};

const settledAt = ( page, handle, index, n, what ) =>
	page
		.waitForFunction(
			( [ el, i, count ] ) => {
				// Llegado Y quieto: la misma posición tres fotogramas seguidos.
				const p = window.__pos( el );
				const d = Math.abs( ( ( ( p - i ) % count ) + count + count / 2 ) % count - count / 2 );
				const still = window.__last === el.scrollLeft;
				window.__last = el.scrollLeft;
				window.__still = d < 0.02 && still ? ( window.__still || 0 ) + 1 : 0;
				return window.__still >= 3;
			},
			[ handle, index, n ],
			{ timeout: 5000 }
		)
		.catch( async () => {
			throw new Error( `${ what }: no llega a la diapositiva ${ index + 1 } (está en ${ ( await page.evaluate( ( el ) => window.__pos( el ), handle ) ).toFixed( 2 ) })` );
		} );

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1200, height: 900 } } );
		await page.addInitScript( probes );
		await page.goto( URL, { waitUntil: 'networkidle' } );

		for ( const [ name, n ] of [ [ 'Carrusel en bucle', 5 ], [ 'Carrusel en bucle con consulta', 6 ] ] ) {
			const carousel = page.getByRole( 'region', { name, exact: true } );
			const track = carousel.locator( '.estrategia-web-carousel__track' );
			const prev = carousel.getByRole( 'button', { name: 'Diapositiva anterior' } );
			const next = carousel.getByRole( 'button', { name: 'Diapositiva siguiente' } );
			const dots = carousel.locator( '.estrategia-web-carousel__dot' );
			const handle = await track.elementHandle();
			await carousel.scrollIntoViewIfNeeded();
			await page.waitForFunction( ( el ) => el.closest( '.estrategia-web-carousel' ).classList.contains( 'is-ready' ), handle );
			await settledAt( page, handle, 0, n, `${ name }, al cargar` );

			// 4. Sin clones.
			const census = await page.evaluate( ( el ) => {
				const ids = [ ...el.querySelectorAll( '[id]' ) ].map( ( x ) => x.id );
				return { slides: window.__slides( el ).length, duplicated: ids.filter( ( id, i ) => ids.indexOf( id ) !== i ) };
			}, handle );
			assert.equal( census.slides, n, `${ name }: hay ${ census.slides } diapositivas en el DOM y debería haber ${ n } (¿clones?)` );
			assert.deepEqual( census.duplicated, [], `${ name }: ids repetidos` );

			// 1. «Siguiente» n veces: vuelta entera hacia delante, sin retroceder.
			await page.evaluate( ( el ) => window.__record( el ), handle );
			for ( let k = 1; k <= n; k++ ) {
				await next.click();
				await settledAt( page, handle, k % n, n, `${ name }, «siguiente» n.º ${ k }` );
				assert.equal( await dots.nth( k % n ).getAttribute( 'aria-current' ), 'true', `${ name }: el punto activo no es el ${ ( k % n ) + 1 }` );
				if ( k === n - 1 ) {
					// En la última, la primera asoma a continuación, a su derecha.
					const [ last, first ] = await page.evaluate(
						( [ el, count ] ) => [ window.__slides( el )[ count - 1 ], window.__slides( el )[ 0 ] ].map( ( s ) => s.getBoundingClientRect().toJSON() ),
						[ handle, n ]
					);
					assert.ok( first.left > last.right - 1 && first.left - last.right < 64, `${ name }: tras la última no viene la primera (última acaba en ${ last.right }, primera empieza en ${ first.left })` );
				}
			}
			let samples = await page.evaluate( () => window.__stop() );
			assert.ok( worstBackStep( samples, n, 1 ) > -0.05, `${ name }: con «siguiente» la pista retrocede ${ ( -worstBackStep( samples, n, 1 ) ).toFixed( 2 ) } diapositivas en algún fotograma` );

			// 2. «Anterior» n veces: la vuelta al revés.
			await page.evaluate( ( el ) => window.__record( el ), handle );
			for ( let k = 1; k <= n; k++ ) {
				await prev.click();
				await settledAt( page, handle, ( n - k ) % n, n, `${ name }, «anterior» n.º ${ k }` );
			}
			samples = await page.evaluate( () => window.__stop() );
			assert.ok( worstBackStep( samples, n, -1 ) > -0.05, `${ name }: con «anterior» la pista va hacia delante en algún fotograma` );

			// 2b. Teclado: ← en la primera lleva a la última, hacia la izquierda.
			await track.focus();
			await page.evaluate( ( el ) => window.__record( el ), handle );
			await page.keyboard.press( 'ArrowLeft' );
			await settledAt( page, handle, n - 1, n, `${ name }, ← en la primera` );
			samples = await page.evaluate( () => window.__stop() );
			assert.ok( worstBackStep( samples, n, -1 ) > -0.05, `${ name }: ← en la primera recorre la pista hacia delante` );
			await page.keyboard.press( 'ArrowRight' );
			await settledAt( page, handle, 0, n, `${ name }, → en la última` );

			// 3. Un punto lleva a su diapositiva y queda activo.
			await dots.nth( 3 ).click();
			await settledAt( page, handle, 3, n, `${ name }, punto 4` );
			assert.equal( await dots.nth( 3 ).getAttribute( 'aria-current' ), 'true', `${ name }: el punto 4 no queda activo` );
			await dots.nth( 0 ).click();
			await settledAt( page, handle, 0, n, `${ name }, punto 1` );
		}

		// 8. Rejilla de dos filas (la franja de clientes de Lavandería): la
		// unidad es la COLUMNA y ninguna ficha cambia de fila al dar la vuelta.
		// Visto fallar el 03-10-2026 con la primera versión del infinito, que
		// rotaba ficha a ficha: las de la fila de arriba bajaban a la de abajo.
		const grid = page.getByRole( 'region', { name: 'Carrusel en dos filas', exact: true } );
		await grid.scrollIntoViewIfNeeded();
		const gridTrack = grid.locator( '.estrategia-web-carousel__track' );
		const gridHandle = await gridTrack.elementHandle();
		await page.waitForFunction( ( el ) => el.closest( '.estrategia-web-carousel' ).classList.contains( 'is-ready' ), gridHandle );
		const rowsOf = () =>
			page.evaluate( ( el ) => {
				const items = ( window.__allSlides || window.__slides )( el );
				const top = Math.min( ...items.map( ( x ) => x.getBoundingClientRect().top ) );
				return items.map( ( x ) => ( x.getBoundingClientRect().top < top + 2 ? 0 : 1 ) ).join( '' );
			}, gridHandle );
		assert.equal( await rowsOf(), '000111', 'la rejilla de prueba no sale en dos filas de tres' );
		// Arriba están las tres primeras: la posición se mide sobre ellas (n = 3).
		await page.evaluate( () => {
			const all = window.__slides;
			window.__allSlides = all;
			window.__slides = ( el ) => ( el.closest( '.rejilla-prueba' ) ? all( el ).slice( 0, 3 ) : all( el ) );
		} );
		const gridNext = grid.getByRole( 'button', { name: 'Diapositiva siguiente' } );
		const gridPrev = grid.getByRole( 'button', { name: 'Diapositiva anterior' } );
		for ( const [ button, expected ] of [ [ gridNext, 1 ], [ gridNext, 2 ], [ gridNext, 0 ], [ gridPrev, 2 ], [ gridPrev, 1 ] ] ) {
			await button.click();
			await settledAt( page, gridHandle, expected, 3, `rejilla, hacia la columna ${ expected + 1 }` );
			assert.equal( await rowsOf(), '000111', `rejilla: alguna ficha ha cambiado de fila (columna ${ expected + 1 })` );
		}

		// 7. Una sola diapositiva: sin controles y sin tocar el orden.
		const single = page.getByRole( 'region', { name: 'Carrusel de una', exact: true } );
		await single.scrollIntoViewIfNeeded();
		assert.ok( await single.evaluate( ( el ) => el.classList.contains( 'is-static' ) ), 'con una diapositiva el carrusel no queda quieto' );
		assert.equal( await single.locator( '.estrategia-web-carousel__track > [style*="order"]' ).count(), 0, 'con una diapositiva no hay nada que reordenar' );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 5. Móvil con el dedo: en la primera, arrastrar hacia la derecha enseña la última.
		const phone = await newPage( { viewport: { width: 402, height: 860 }, isMobile: true, hasTouch: true } );
		await phone.addInitScript( probes );
		await phone.goto( URL, { waitUntil: 'networkidle' } );
		for ( const [ name, n ] of [ [ 'Carrusel en bucle', 5 ], [ 'Carrusel en bucle con consulta', 6 ] ] ) {
			const track = phone.getByRole( 'region', { name, exact: true } ).locator( '.estrategia-web-carousel__track' );
			await track.scrollIntoViewIfNeeded();
			const handle = await track.elementHandle();
			await phone.waitForFunction( ( el ) => el.closest( '.estrategia-web-carousel' ).classList.contains( 'is-ready' ), handle );
			await settledAt( phone, handle, 0, n, `${ name } en móvil, al cargar` );
			const box = await track.boundingBox();
			// Dedo de verdad: touchStart, movimientos a un fotograma cada uno y
			// touchEnd. La trampa (medida el 03-10-2026): Input.synthesizeScrollGesture
			// con «touch» no mueve nada en Chromium sin ventana, y los touchMove
			// seguidos sin esperar un fotograma desplazan pero no terminan el gesto
			// (ni snap ni scrollend). Y el dedo se PARA antes de levantarse (seis
			// fotogramas quieto): si se levanta en marcha, Chromium sin ventana
			// lanza una inercia (fling) que no termina nunca, uno de cada dos
			// gestos se queda a medias y parece un fallo del carrusel.
			const cdp = await phone.context().newCDPSession( phone );
			const y0 = Math.round( box.y + box.height / 2 );
			const swipe = async ( dx ) => {
				const x0 = Math.round( dx > 0 ? box.x + 30 : box.x + box.width - 30 );
				await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: x0, y: y0 } ] } );
				for ( let i = 1; i <= 18; i++ ) {
					await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: x0 + ( dx * Math.min( i, 12 ) ) / 12, y: y0 } ] } );
					await phone.evaluate( () => new Promise( ( resolve ) => requestAnimationFrame( resolve ) ) );
				}
				await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
			};
			await swipe( 260 );
			await settledAt( phone, handle, n - 1, n, `${ name } en móvil, dedo a la derecha en la primera` );
			// Y otra vez: sigue habiendo diapositivas a la izquierda.
			await swipe( 260 );
			await settledAt( phone, handle, n - 2, n, `${ name } en móvil, segundo arrastre` );
			// Y hacia delante, pasando de la última a la primera.
			for ( const expected of [ n - 1, 0, 1 ] ) {
				await swipe( -260 );
				await settledAt( phone, handle, expected, n, `${ name } en móvil, dedo a la izquierda hacia la ${ expected + 1 }` );
			}
		}
		assert.deepEqual( phone.errors, [], phone.errors.join( '\n' ) );

		// 6. «Reducir movimiento»: la vuelta se da igual, sin animación.
		const calm = await newPage( { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' } );
		await calm.addInitScript( probes );
		await calm.goto( URL, { waitUntil: 'networkidle' } );
		const carousel = calm.getByRole( 'region', { name: 'Carrusel en bucle', exact: true } );
		await carousel.scrollIntoViewIfNeeded();
		const handle = await carousel.locator( '.estrategia-web-carousel__track' ).elementHandle();
		await calm.waitForFunction( ( el ) => el.closest( '.estrategia-web-carousel' ).classList.contains( 'is-ready' ), handle );
		await carousel.locator( '.estrategia-web-carousel__dot' ).nth( 4 ).click();
		await settledAt( calm, handle, 4, 5, 'con «reducir movimiento», punto 5' );
		await carousel.getByRole( 'button', { name: 'Diapositiva siguiente' } ).click();
		await settledAt( calm, handle, 0, 5, 'con «reducir movimiento», «siguiente» en la última' );
		assert.deepEqual( calm.errors, [], calm.errors.join( '\n' ) );
	} )
);
