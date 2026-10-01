/**
 * armazon/map — carga el iframe de Google Maps solo cuando toca.
 *
 * Toca cuando: el visitante pulsa «Ver mapa», o el consentimiento
 * (armazon/consent) tiene aceptada la categoría «maps» — ya al arrancar, o
 * cuando se acepta con la página abierta.
 * Documentación del módulo en la cabecera de render.php.
 *
 * La trampa: este módulo puede ejecutarse antes o después que el del
 * consentimiento. Por eso mira window.armazonConsent si ya existe Y escucha
 * el evento «armazon:consent». Con una sola de las dos, a veces no carga.
 *
 * Y otra, medida el 01-10-2026: el servidor pinta el iframe SIN src, pero al
 * hidratar, data-wp-bind--src con undefined deja src="" (Interactivity asigna
 * la propiedad). Es about:blank y no pide nada a nadie; la prueba
 * tests/map.test.mjs mira las peticiones, que es lo que importa.
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'armazon/map', {
	state: {
		get src() {
			const context = getContext();
			return context.loaded && context.embedUrl ? context.embedUrl : undefined;
		},
	},
	actions: {
		load() {
			const context = getContext();
			const { ref } = getElement();
			context.loaded = true;
			// The button disappears: send focus to the map so it is not lost.
			const iframe = ref.closest( '.armazon-map' ).querySelector( '.armazon-map__iframe' );
			window.requestAnimationFrame( () => iframe?.focus() );
		},
	},
	callbacks: {
		init() {
			const context = getContext();
			if ( ! context.embedUrl ) {
				return undefined;
			}
			if ( window.armazonConsent?.has( 'maps' ) ) {
				context.loaded = true;
				return undefined;
			}
			const onConsent = ( event ) => {
				if ( event.detail?.accepted?.includes( 'maps' ) ) {
					context.loaded = true;
				}
			};
			document.addEventListener( 'armazon:consent', onConsent );
			return () => document.removeEventListener( 'armazon:consent', onConsent );
		},
	},
} );
