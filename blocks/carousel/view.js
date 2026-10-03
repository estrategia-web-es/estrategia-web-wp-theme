/**
 * armazon/carousel — comportamiento (Interactivity API, módulo ES nativo).
 *
 * Lo que hace: mover la pista una diapositiva con las flechas, el teclado o
 * los puntos; sin bucle, marcar inicio/fin para desactivar flechas; con
 * bucle (atributo loop, por defecto), INFINITO (0.6.0); autoplay opcional.
 * La documentación del módulo está en la cabecera de render.php.
 *
 * El infinito, en corto (detalle en render.php): no hay clones. Cada
 * diapositiva lleva un `order` que ROTA la fila sin tocar el DOM, de modo
 * que siempre hay diapositivas a los dos lados de la que se ve. Al pararse la
 * pista (scrollend) se vuelve a rotar alrededor de la que está en el borde y
 * se corrige scrollLeft en el mismo fotograma: la diapositiva no se mueve en
 * pantalla y el salto no se ve.
 *
 * Lo que rota son UNIDADES: en una fila, cada diapositiva; en una rejilla de
 * varias filas llenada por filas (la franja de clientes de dos filas de
 * Lavandería), cada COLUMNA, y cada fila rota igual. Una disposición que no
 * es ni lo uno ni lo otro no se rota: da la vuelta rebobinando, como la 0.5.0.
 *
 * Cómo se mantiene:
 * - Si se importa algo nuevo de WordPress, se añade a view.asset.php.
 * - La trampa: los manejadores que llaman a event.preventDefault() van con
 *   withSyncEvent(). Sin él, WordPress los ejecuta en diferido y el
 *   preventDefault llega tarde: la flecha del teclado mueve la pista Y además
 *   desplaza la página.
 * - Otra, del infinito: TODO desplazamiento que corrige la rotación va con
 *   behavior 'instant'. La pista tiene scroll-behavior: smooth en CSS, y un
 *   scrollLeft = x a secas se animaría: se vería la pista correr hacia atrás,
 *   que es justo el rebobinado que el infinito quita.
 * - Y otra: al corregir scrollLeft salta otro scrollend. settle() es
 *   idempotente (si la rotación ya es la buena no toca nada), y mientras va
 *   una animación propia hacia una diapositiva no se rota hasta que llega.
 * - Y la de la rejilla (medida en Lavandería el 03-10-2026): rotar `order`
 *   diapositiva a diapositiva en una rejilla de dos filas pasa fichas de una
 *   fila a otra. Por eso las filas se miden con el orden natural (rows()) y
 *   se rota por columnas.
 */
import { store, getContext, getElement, withSyncEvent } from '@wordpress/interactivity';

const reducedMotion = () => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const behavior = () => ( reducedMotion() ? 'instant' : 'smooth' );

const rootOf = ( element ) => element.closest( '.armazon-carousel' );
const trackOf = ( element ) => rootOf( element ).querySelector( '.armazon-carousel__track' );

/**
 * Slides of a track in LOGICAL order (DOM order, never changed): its direct
 * children, except a core/query, which contributes each <li> of its
 * post-template (see render.php, 0.2.0).
 */
const slidesOf = ( track ) =>
	Array.from( track.children ).flatMap( ( child ) =>
		child.classList.contains( 'wp-block-query' )
			? Array.from( child.querySelectorAll( ':scope > .wp-block-post-template > li' ) )
			: [ child ]
	);

/** Offsets of groups of elements relative to the leftmost one. */
const offsetsOf = ( groups ) => {
	const lefts = groups.map( ( group ) => Math.min( ...group.map( ( el ) => el.offsetLeft ) ) );
	const first = Math.min( ...lefts );
	return lefts.map( ( left ) => left - first );
};

const slideOffsets = ( track ) => offsetsOf( slidesOf( track ).map( ( slide ) => [ slide ] ) );

const maxScroll = ( track ) => track.scrollWidth - track.clientWidth;

/** Index of the offset nearest to the scroll position. */
const nearestIndex = ( track, offsets = slideOffsets( track ) ) => {
	let best = 0;
	offsets.forEach( ( offset, i ) => {
		if ( Math.abs( offset - track.scrollLeft ) < Math.abs( offsets[ best ] - track.scrollLeft ) ) {
			best = i;
		}
	} );
	return best;
};

/* ---------------------------------------------------------------------------
 * Without loop (as in 0.1.0 – 0.4.0): a row with a start and an end. Also the
 * fallback of the loop for layouts that cannot rotate (rewind, as in 0.5.0).
 * ------------------------------------------------------------------------- */

const scrollToIndex = ( track, index ) => {
	const offsets = slideOffsets( track );
	if ( ! offsets.length ) {
		return;
	}
	const target = Math.max( 0, Math.min( index, offsets.length - 1 ) );
	track.scrollTo( { left: offsets[ target ], behavior: behavior() } );
};

const stepLinear = ( track, direction ) => scrollToIndex( track, nearestIndex( track ) + direction );

const stepRewind = ( track, direction ) => {
	if ( direction > 0 && track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 ) {
		scrollToIndex( track, 0 );
	} else if ( direction < 0 && track.scrollLeft <= 1 ) {
		scrollToIndex( track, slidesOf( track ).length - 1 );
	} else {
		stepLinear( track, direction );
	}
};

/* ---------------------------------------------------------------------------
 * Infinite (0.6.0). Per-track state lives here, not in the context: it holds
 * numbers about the layout that no directive reads.
 * ------------------------------------------------------------------------- */

const ring = new WeakMap();
const ringOf = ( track ) => {
	if ( ! ring.has( track ) ) {
		ring.set( track, { start: 0, cols: 0, moving: false, target: 0, touching: false } );
	}
	return ring.get( track );
};

/**
 * Measures the rows with the NATURAL order (inline orders removed and put
 * back in the same task: nothing is painted in between). Sets state.cols:
 * the number of units, or 0 if the layout cannot rotate (rows of different
 * lengths, or not filled row by row). A slide starts a new row when it
 * starts below the bottom of the current one, so slides of different
 * heights aligned in one row are still one row.
 */
const measure = ( track ) => {
	const state = ringOf( track );
	const slides = slidesOf( track );
	const saved = slides.map( ( slide ) => slide.style.order );
	slides.forEach( ( slide ) => ( slide.style.order = '' ) );
	const rowOf = [];
	let rows = 0;
	let bottom = -Infinity;
	slides.forEach( ( slide ) => {
		if ( slide.offsetTop >= bottom - 1 ) {
			rows++;
			bottom = -Infinity;
		}
		bottom = Math.max( bottom, slide.offsetTop + slide.offsetHeight );
		rowOf.push( rows - 1 );
	} );
	slides.forEach( ( slide, i ) => ( slide.style.order = saved[ i ] ) );
	const cols = slides.length / rows;
	const regular = Number.isInteger( cols ) && rowOf.every( ( row, i ) => row === Math.floor( i / cols ) );
	state.cols = regular ? cols : 0;
	return state.cols;
};

/** Units: one per column (one per slide in a single row), its slides inside. */
const unitsOf = ( track ) => {
	const slides = slidesOf( track );
	const cols = ringOf( track ).cols || slides.length;
	return Array.from( { length: cols }, ( _, c ) => slides.filter( ( __, i ) => i % cols === c ) );
};

/** Rotates every row so that unit `start` is visually first. */
const arrange = ( track, start ) => {
	const state = ringOf( track );
	const slides = slidesOf( track );
	const cols = state.cols || slides.length;
	state.start = start;
	slides.forEach( ( slide, i ) => {
		const row = Math.floor( i / cols );
		slide.style.order = String( row * cols + ( ( ( i % cols ) - start + cols ) % cols ) );
	} );
};

/**
 * Where unit `a` would start if the row were rotated so that it sits at
 * visual position `lead`, and where position `lead + d` would start. Pure
 * arithmetic on the widths (they do not depend on the order), so candidates
 * are compared without touching the layout.
 */
const layoutFor = ( widths, gap, a, lead, d ) => {
	const n = widths.length;
	const start = ( a - lead + n * 2 ) % n;
	const at = ( pos ) => {
		let sum = 0;
		for ( let q = 0; q < pos; q++ ) {
			sum += widths[ ( start + q ) % n ] + gap;
		}
		return sum;
	};
	return { start, from: at( lead ), to: at( lead + d ) };
};

/**
 * Moves the visible window from unit `a` by `d` units (negative: to the
 * left). First rotates the row so that BOTH ends of the trip exist and can
 * be scrolled to, keeping `a` where it is on screen; then scrolls. Returns
 * false if no rotation allows it.
 */
const travel = ( track, a, d, animate ) => {
	const state = ringOf( track );
	const units = unitsOf( track );
	const n = units.length;
	const widths = units.map( ( unit ) => Math.max( ...unit.map( ( el ) => el.offsetWidth ) ) );
	const gap = parseFloat( window.getComputedStyle( track ).columnGap ) || 0;
	const limit = maxScroll( track ) + 1;
	const delta = track.scrollLeft - offsetsOf( units )[ a ];

	// Lead: how many units to the left of `a`. Preferred: half of the ones
	// that do not fit on screen, so there is room to both sides.
	let visible = 0;
	for ( let used = 0; visible < n; visible++ ) {
		used += widths[ ( a + visible ) % n ] + ( visible ? gap : 0 );
		if ( used > track.clientWidth + 1 ) {
			break;
		}
	}
	const ideal = Math.max( 0, Math.floor( ( n - visible ) / 2 ) );

	let best = null;
	for ( let lead = 0; lead < n; lead++ ) {
		if ( lead + d < 0 || lead + d > n - 1 ) {
			continue;
		}
		const plan = layoutFor( widths, gap, a, lead, d );
		if ( plan.from > limit || plan.to > limit ) {
			continue;
		}
		if ( ! best || Math.abs( lead - ideal ) < Math.abs( best.lead - ideal ) ) {
			best = { ...plan, lead };
		}
	}
	if ( ! best ) {
		return false;
	}
	// Rotation 0 is the DOM order itself: a row that never rotates keeps no
	// inline `order` at all.
	if ( best.start !== state.start ) {
		arrange( track, best.start );
		const keep = offsetsOf( units )[ a ] + delta;
		if ( Math.abs( keep - track.scrollLeft ) > 0.5 ) {
			track.scrollTo( { left: keep, behavior: 'instant' } );
		}
	}
	if ( d !== 0 || animate ) {
		const target = ( a + d + n * 2 ) % n;
		const to = offsetsOf( units )[ target ];
		if ( Math.abs( to - track.scrollLeft ) > 0.5 ) {
			state.moving = true;
			state.target = target;
			track.scrollTo( { left: to, behavior: behavior() } );
		}
	}
	return true;
};

/** Whether the infinite mode can rotate this track (see measure()). */
const rotates = ( track ) => ringOf( track ).cols > 1;

const nearestUnit = ( track ) => nearestIndex( track, offsetsOf( unitsOf( track ) ) );

/** Re-centres the row around the unit at the edge, invisibly. */
const settle = ( track ) => {
	const state = ringOf( track );
	if ( state.touching || ! rotates( track ) || maxScroll( track ) <= 1 ) {
		return;
	}
	if ( state.moving ) {
		// Our own animation is still on its way: wait until it arrives.
		if ( Math.abs( offsetsOf( unitsOf( track ) )[ state.target ] - track.scrollLeft ) > 1 ) {
			return;
		}
		state.moving = false;
	}
	travel( track, nearestUnit( track ), 0, false );
};

/** Goes to unit `target`, by the shortest way round (or towards `dir`). */
const goInfinite = ( track, target, dir = 0 ) => {
	const state = ringOf( track );
	if ( ! rotates( track ) ) {
		scrollToIndex( track, target );
		return;
	}
	const n = state.cols;
	const a = nearestUnit( track );
	const forward = ( target - a + n ) % n;
	let d;
	if ( dir > 0 ) {
		d = forward;
	} else if ( dir < 0 ) {
		d = forward ? forward - n : 0;
	} else {
		d = forward <= n / 2 ? forward : forward - n;
	}
	if ( ! travel( track, a, d, true ) ) {
		// No rotation fits both ends (very wide slides): go there directly.
		state.moving = false;
		arrange( track, target );
		track.scrollTo( { left: 0, behavior: 'instant' } );
	}
};

const stepInfinite = ( track, direction ) => {
	const state = ringOf( track );
	if ( ! rotates( track ) ) {
		stepRewind( track, direction );
		return;
	}
	const n = state.cols;
	const from = state.moving ? state.target : nearestUnit( track );
	goInfinite( track, ( from + direction + n ) % n, direction );
};

/* ------------------------------------------------------------------------- */

const step = ( context, track, direction ) =>
	context.loop ? stepInfinite( track, direction ) : stepLinear( track, direction );

const goTo = ( context, track, index ) => ( context.loop ? goInfinite( track, index ) : scrollToIndex( track, index ) );

const updateEdges = ( context, track ) => {
	context.atStart = track.scrollLeft <= 1;
	context.atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
	if ( context.loop && rotates( track ) ) {
		// Infinite: the active dot is the slide (unit) at the left edge.
		context.current = nearestUnit( track );
	} else {
		context.current = context.atEnd ? context.count - 1 : nearestIndex( track );
	}
};

const { state } = store( 'armazon/carousel', {
	state: {
		get isStatic() {
			const context = getContext();
			return context.ready && context.atStart && context.atEnd;
		},
		get isCurrentDot() {
			const context = getContext();
			return context.current === context.index ? 'true' : 'false';
		},
		get toggleLabel() {
			const context = getContext();
			return context.playing ? context.labelPause : context.labelPlay;
		},
	},
	actions: {
		prev() {
			step( getContext(), trackOf( getElement().ref ), -1 );
		},
		next() {
			step( getContext(), trackOf( getElement().ref ), 1 );
		},
		goTo() {
			const context = getContext();
			goTo( context, trackOf( getElement().ref ), context.index );
		},
		onKeydown: withSyncEvent( ( event ) => {
			const context = getContext();
			const track = event.currentTarget;
			const moves = { ArrowLeft: -1, ArrowRight: 1 };
			if ( event.key in moves ) {
				event.preventDefault();
				step( context, track, moves[ event.key ] );
			} else if ( 'Home' === event.key ) {
				event.preventDefault();
				goTo( context, track, 0 );
			} else if ( 'End' === event.key ) {
				event.preventDefault();
				const units = context.loop && rotates( track ) ? ringOf( track ).cols : slidesOf( track ).length;
				goTo( context, track, units - 1 );
			}
		} ),
		toggleAutoplay() {
			const context = getContext();
			context.playing = ! context.playing;
		},
		hoverIn() {
			getContext().hover = true;
		},
		hoverOut() {
			getContext().hover = false;
		},
		focusIn() {
			getContext().focused = true;
		},
		focusOut( event ) {
			const root = rootOf( getElement().ref );
			getContext().focused = root.contains( event.relatedTarget );
		},
	},
	callbacks: {
		init() {
			const context = getContext();
			const track = trackOf( getElement().ref );
			const cleanups = [];

			// Infinite only with something to scroll: one slide, or all of them
			// on screen, is a still row (is-static), and nothing is touched
			// (settle() checks it every time: a hidden carousel, in a tab, has
			// nothing to scroll until it shows up).
			if ( context.loop && slidesOf( track ).length > 1 ) {
				measure( track );
				settle( track );
				const ringState = ringOf( track );
				const onSettle = () => settle( track );
				let timer = 0;
				// Safari before 26 has no scrollend: the same after a quiet pause.
				const onScroll = () => {
					window.clearTimeout( timer );
					timer = window.setTimeout( onSettle, 120 );
				};
				const usesScrollEnd = 'onscrollend' in window;
				track.addEventListener( usesScrollEnd ? 'scrollend' : 'scroll', usesScrollEnd ? onSettle : onScroll );
				// A finger on the track, or the wheel, takes over from our animation.
				const take = () => {
					ringState.moving = false;
				};
				const touchStart = () => {
					ringState.touching = true;
					take();
				};
				const touchEnd = () => {
					ringState.touching = false;
					if ( ! usesScrollEnd ) {
						onScroll();
					}
				};
				track.addEventListener( 'touchstart', touchStart, { passive: true } );
				track.addEventListener( 'touchend', touchEnd, { passive: true } );
				track.addEventListener( 'touchcancel', touchEnd, { passive: true } );
				track.addEventListener( 'wheel', take, { passive: true } );
				// New width (rotating the phone, a breakpoint): rows and rotation
				// are measured again.
				const resize = new window.ResizeObserver( () => {
					if ( ! ringState.moving ) {
						measure( track );
						settle( track );
					}
				} );
				resize.observe( track );
				cleanups.push( () => {
					track.removeEventListener( 'scrollend', onSettle );
					track.removeEventListener( 'scroll', onScroll );
					track.removeEventListener( 'touchstart', touchStart );
					track.removeEventListener( 'touchend', touchEnd );
					track.removeEventListener( 'touchcancel', touchEnd );
					track.removeEventListener( 'wheel', take );
					resize.disconnect();
					window.clearTimeout( timer );
				} );
			}

			updateEdges( context, track );
			context.ready = true;

			if ( context.autoplay && ! reducedMotion() ) {
				context.playing = true;
				const timer = window.setInterval( () => {
					if ( ! context.playing || context.hover || context.focused ) {
						return;
					}
					if ( ! context.loop && context.atEnd ) {
						scrollToIndex( track, 0 );
					} else {
						step( context, track, 1 );
					}
				}, context.interval );
				cleanups.push( () => window.clearInterval( timer ) );
			}
			return () => cleanups.forEach( ( cleanup ) => cleanup() );
		},
		onScroll() {
			const context = getContext();
			updateEdges( context, getElement().ref );
		},
	},
} );

export { state };
