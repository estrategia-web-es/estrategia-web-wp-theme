/**
 * armazon/carousel — comportamiento (Interactivity API, módulo ES nativo).
 *
 * Lo que hace: mover la pista una diapositiva con las flechas, el teclado o
 * los puntos; marcar inicio/fin para desactivar flechas (sin bucle) o dar la
 * vuelta (con bucle, 0.5.0: atributo loop); autoplay opcional.
 * La documentación del módulo está en la cabecera de render.php.
 *
 * Cómo se mantiene:
 * - Si se importa algo nuevo de WordPress, se añade a view.asset.php.
 * - La trampa: los manejadores que llaman a event.preventDefault() van con
 *   withSyncEvent(). Sin él, WordPress los ejecuta en diferido y el
 *   preventDefault llega tarde: la flecha del teclado mueve la pista Y además
 *   desplaza la página.
 */
import { store, getContext, getElement, withSyncEvent } from '@wordpress/interactivity';

const reducedMotion = () => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

const rootOf = ( element ) => element.closest( '.armazon-carousel' );
const trackOf = ( element ) => rootOf( element ).querySelector( '.armazon-carousel__track' );

/**
 * Slides of a track: its direct children, except a core/query, which
 * contributes each <li> of its post-template (see render.php, 0.2.0).
 */
const slidesOf = ( track ) =>
	Array.from( track.children ).flatMap( ( child ) =>
		child.classList.contains( 'wp-block-query' )
			? Array.from( child.querySelectorAll( ':scope > .wp-block-post-template > li' ) )
			: [ child ]
	);

/** Offsets of each slide relative to the start of the track. */
const slideOffsets = ( track ) => {
	const slides = slidesOf( track );
	return slides.map( ( slide ) => slide.offsetLeft - slides[ 0 ].offsetLeft );
};

const scrollToIndex = ( track, index ) => {
	const offsets = slideOffsets( track );
	if ( ! offsets.length ) {
		return;
	}
	const target = Math.max( 0, Math.min( index, offsets.length - 1 ) );
	track.scrollTo( { left: offsets[ target ], behavior: reducedMotion() ? 'auto' : 'smooth' } );
};

const currentIndex = ( track ) => {
	const offsets = slideOffsets( track );
	let best = 0;
	offsets.forEach( ( offset, i ) => {
		if ( Math.abs( offset - track.scrollLeft ) < Math.abs( offsets[ best ] - track.scrollLeft ) ) {
			best = i;
		}
	} );
	return best;
};

const updateEdges = ( context, track ) => {
	context.atStart = track.scrollLeft <= 1;
	context.atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
	context.current = context.atEnd ? context.count - 1 : currentIndex( track );
};

/**
 * Moves one slide. With loop (0.5.0), «next» at the end goes to the first
 * slide and «previous» at the start goes to the last one. The edges are read
 * from the track, not from the context, so it also works mid-scroll.
 */
const step = ( track, direction, loop = false ) => {
	if ( loop && direction > 0 && track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 ) {
		scrollToIndex( track, 0 );
		return;
	}
	if ( loop && direction < 0 && track.scrollLeft <= 1 ) {
		scrollToIndex( track, slidesOf( track ).length - 1 );
		return;
	}
	scrollToIndex( track, currentIndex( track ) + direction );
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
			step( trackOf( getElement().ref ), -1, getContext().loop );
		},
		next() {
			step( trackOf( getElement().ref ), 1, getContext().loop );
		},
		goTo() {
			const context = getContext();
			scrollToIndex( trackOf( getElement().ref ), context.index );
		},
		onKeydown: withSyncEvent( ( event ) => {
			const track = event.currentTarget;
			const moves = { ArrowLeft: -1, ArrowRight: 1 };
			if ( event.key in moves ) {
				event.preventDefault();
				step( track, moves[ event.key ], getContext().loop );
			} else if ( 'Home' === event.key ) {
				event.preventDefault();
				scrollToIndex( track, 0 );
			} else if ( 'End' === event.key ) {
				event.preventDefault();
				scrollToIndex( track, slidesOf( track ).length - 1 );
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
			updateEdges( context, track );
			context.ready = true;

			if ( ! context.autoplay || reducedMotion() ) {
				return undefined;
			}
			context.playing = true;
			const timer = window.setInterval( () => {
				if ( ! context.playing || context.hover || context.focused ) {
					return;
				}
				if ( context.atEnd ) {
					scrollToIndex( track, 0 );
				} else {
					step( track, 1 );
				}
			}, context.interval );
			return () => window.clearInterval( timer );
		},
		onScroll() {
			const context = getContext();
			updateEdges( context, getElement().ref );
		},
	},
} );

export { state };
