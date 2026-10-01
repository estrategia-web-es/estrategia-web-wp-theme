/**
 * armazon/consent — comportamiento del aviso de cookies (Interactivity API).
 *
 * La documentación del módulo (categorías, API, WP Consent API, trampas) está
 * en la cabecera de inc/consent.php. Aquí, lo que solo afecta a este fichero:
 *
 * - La elección se guarda en la cookie técnica «armazon_consent» con el
 *   formato "<revisión>.<cat~cat>.<unix>". El mismo formato lo lee PHP
 *   (armazon_consent_choice): si se cambia aquí, se cambia allí.
 * - API pública, para el hijo y para otros bloques (armazon/map la usa):
 *     window.armazonConsent.has( 'maps' )  → boolean
 *     window.armazonConsent.get()          → string[] | null (null = sin elegir)
 *     window.armazonConsent.open()         → reabre el aviso
 *     document.addEventListener( 'armazon:consent', ( e ) => e.detail.accepted )
 *   El evento se lanza al arrancar (si ya había elección) y en cada cambio.
 * - La trampa: los módulos ES se ejecutan en diferido y en orden de llegada;
 *   otro módulo puede arrancar ANTES que este. Quien consulte el consentimiento
 *   tiene que mirar window.armazonConsent si existe Y escuchar el evento, nunca
 *   solo una de las dos cosas.
 */
import { store, getContext, getElement, withSyncEvent } from '@wordpress/interactivity';

let choice = null;
let opener = null;

const readCookie = ( name ) => {
	const match = document.cookie.split( '; ' ).find( ( row ) => row.startsWith( `${ name }=` ) );
	return match ? decodeURIComponent( match.slice( name.length + 1 ) ) : null;
};

const parseChoice = ( raw, revision, categories ) => {
	if ( ! raw ) {
		return null;
	}
	const parts = raw.split( '.' );
	if ( parts.length !== 3 || parts[ 0 ] !== revision ) {
		return null;
	}
	const accepted = parts[ 1 ] ? parts[ 1 ].split( '~' ) : [];
	return categories.filter( ( category ) => accepted.includes( category ) );
};

/** Turns <script type="text/plain" data-armazon-consent="x"> into real scripts. */
const activateScripts = ( accepted ) => {
	document.querySelectorAll( 'script[type="text/plain"][data-armazon-consent]:not([data-armazon-activated])' ).forEach( ( placeholder ) => {
		if ( ! accepted.includes( placeholder.dataset.armazonConsent ) ) {
			return;
		}
		const script = document.createElement( 'script' );
		for ( const { name, value } of placeholder.attributes ) {
			if ( ! [ 'type', 'data-armazon-consent', 'data-armazon-type' ].includes( name ) ) {
				script.setAttribute( name, value );
			}
		}
		script.type = placeholder.dataset.armazonType || 'text/javascript';
		script.text = placeholder.text;
		placeholder.dataset.armazonActivated = '';
		placeholder.after( script );
	} );
};

/** Optional WP Consent API (plugin). Mapping documented in inc/consent.php. */
const tellWpConsentApi = ( accepted ) => {
	if ( typeof window.wp_set_consent !== 'function' ) {
		return;
	}
	window.wp_consent_type = 'optin';
	const value = ( category ) => ( accepted.includes( category ) ? 'allow' : 'deny' );
	window.wp_set_consent( 'statistics', value( 'statistics' ) );
	window.wp_set_consent( 'statistics-anonymous', value( 'statistics' ) );
	window.wp_set_consent( 'marketing', value( 'marketing' ) );
};

const apply = ( accepted ) => {
	activateScripts( accepted );
	tellWpConsentApi( accepted );
	document.dispatchEvent( new CustomEvent( 'armazon:consent', { detail: { accepted: [ ...accepted ] } } ) );
};

const { state, actions } = store( 'armazon/consent', {
	state: {
		draft: [],
		focusRequested: false,
		get isChecked() {
			return state.draft.includes( getContext().category );
		},
	},
	actions: {
		save( accepted ) {
			const previous = choice;
			choice = state.categories.filter( ( category ) => accepted.includes( category ) );
			const value = `${ state.revision }.${ choice.join( '~' ) }.${ Math.floor( Date.now() / 1000 ) }`;
			const secure = window.location.protocol === 'https:' ? '; Secure' : '';
			document.cookie = `${ state.cookieName }=${ encodeURIComponent( value ) }; Max-Age=${ state.maxAge }; Path=/; SameSite=Lax${ secure }`;
			state.isOpen = false;
			state.showSettings = false;

			// Something already ran for a category that is now rejected: only a reload unloads it.
			const withdrawn = ( previous || [] ).filter( ( category ) => ! choice.includes( category ) );
			const ranWithdrawn = withdrawn.some( ( category ) =>
				document.querySelector( `script[data-armazon-consent="${ category }"][data-armazon-activated]` )
			);
			if ( ranWithdrawn ) {
				window.location.reload();
				return;
			}
			apply( choice );
			if ( opener && document.contains( opener ) ) {
				opener.focus();
			}
			opener = null;
		},
		acceptAll() {
			actions.save( state.categories );
		},
		rejectAll() {
			actions.save( [] );
		},
		toggleSettings() {
			state.showSettings = ! state.showSettings;
		},
		toggleCategory( event ) {
			const { category } = getContext();
			state.draft = event.target.checked
				? [ ...new Set( [ ...state.draft, category ] ) ]
				: state.draft.filter( ( item ) => item !== category );
		},
		saveSettings: withSyncEvent( ( event ) => {
			event.preventDefault();
			actions.save( state.draft );
		} ),
		open() {
			opener = document.activeElement;
			state.draft = choice ? [ ...choice ] : [];
			state.showSettings = true;
			state.isOpen = true;
			// Focus moves in callbacks.focusOnOpen, AFTER the notice is visible:
			// focusing it from here (even in a requestAnimationFrame) hits a still
			// hidden element and the focus is silently lost. Measured 01-10-2026.
			state.focusRequested = true;
		},
		onKeydown( event ) {
			// Escape only closes a REOPENED notice: the first time a choice is required.
			if ( event.key === 'Escape' && choice !== null ) {
				state.isOpen = false;
				opener?.focus();
				opener = null;
			}
		},
	},
	callbacks: {
		focusOnOpen() {
			if ( state.isOpen && state.focusRequested ) {
				state.focusRequested = false;
				getElement().ref.querySelector( '#armazon-consent-title' )?.focus();
			}
		},
		init() {
			choice = parseChoice( readCookie( state.cookieName ), state.revision, state.categories );
			window.armazonConsent = {
				categories: [ ...state.categories ],
				has: ( category ) => category === 'necessary' || ( choice || [] ).includes( category ),
				get: () => ( choice ? [ ...choice ] : null ),
				open: () => actions.open(),
			};
			if ( choice === null ) {
				state.draft = [];
				state.isOpen = true;
				return;
			}
			apply( choice );
		},
	},
} );
