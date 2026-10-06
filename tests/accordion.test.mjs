// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es la ALTURA del panel y la posición, el ancho y la opacidad del texto fotograma a fotograma mientras se abre y se cierra, y eso solo existe con la página pintada y el reloj de animación corriendo.
/**
 * core/accordion abre y cierra DESLIZANDO Y FUNDIENDO, sin saltos de texto
 * (assets/core-blocks/accordion.css, 0.4.0, 0.5.0 y 0.7.3):
 * 1. al abrir, la altura del panel pasa por valores intermedios entre 0 y su
 *    alto final y termina abierto (sin hidden, aria-expanded="true");
 * 2. al cerrar, igual al revés, y termina con hidden y 0 de alto;
 * 3. con «reducir movimiento» NO hay valores intermedios: ni de alto ni de
 *    opacidad;
 * 4. con un hijo que da margen y relleno solo al panel abierto —lo que hace
 *    Lavandería: `:not([hidden]) { margin: -0.5rem 24px 24px;
 *    padding-right: 2.5rem }`—, fotograma a fotograma, al ABRIR y al CERRAR:
 *    - el alto del panel y el de la pregunta entera solo crecen (abrir) o
 *      solo menguan (cerrar): nada empuja lo de abajo a tirones;
 *    - el texto de la respuesta no cambia de x, de ancho ni de número de
 *      líneas (0.5.0: al cerrar se reajustaba en menos líneas);
 *    - la respuesta APARECE FUNDIENDO (0.7.3): su opacidad empieza por
 *      debajo de 0,5, pasa por valores intermedios y solo sube (al cerrar,
 *      solo baja); y se mueve en un solo sentido, sin ir y volver;
 * 5. teclado y foco siguen siendo los del núcleo: Intro abre, Espacio
 *    cierra, aria-expanded lo sigue y el foco se queda en el botón;
 * 6. el «+» gira 135° al abrir pasando por ángulos intermedios (0.7.3) y
 *    vuelve a 0 al cerrar.
 *
 * Sobre /prueba-acordeon/ (tests/fixtures/setup/setup.php): la primera
 * pregunta tiene una respuesta larga, para que la animación tenga recorrido.
 * Vista fallar el 03-10-2026 sin la hoja: 0 alturas intermedias al abrir.
 * El 4, visto fallar con la hoja de la 0.4.0: el párrafo pasaba de x=48 y
 * 264 de ancho a x=24 y 352 en el primer fotograma del cierre.
 * El 4 y el 6, vistos fallar el 06-10-2026 con la 0.7.2: la respuesta salía
 * con opacidad 1 desde el primer fotograma y, ya entera a la vista, subía
 * 8 px (el margen -0.5rem del hijo animándose): «da un salto el texto»,
 * David en Lavandería; el «+» giraba 45°.
 *
 * Cómo se mantiene: si el núcleo cambia el marcado del acordeón (por ejemplo,
 * a <details>), esto falla primero; se cambia la técnica de la hoja y se deja
 * la prueba como está, que mide lo que ve el usuario.
 * La trampa: se mide con requestAnimationFrame DENTRO de la página, no con
 * esperas de Playwright entre medidas: cada ida y vuelta al navegador tarda
 * lo que dura media animación y las intermedias no se veían.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-acordeon/`;
const CHILD_CSS = '.wp-block-accordion-panel:not([hidden]) { margin: -0.5rem 24px 24px; padding-right: 2.5rem; }';

/**
 * Clicks the first toggle and records, on every frame for 700 ms: panel and
 * item height, and the first paragraph's x, width, lines, top (relative to
 * the button) and opacity (its own times the panel's).
 */
const sample = ( page ) =>
	page.evaluate( async () => {
		const button = document.querySelector( '.wp-block-accordion-heading__toggle' );
		const panel = document.getElementById( button.getAttribute( 'aria-controls' ) );
		const item = panel.closest( '.wp-block-accordion-item' );
		const icon = button.querySelector( '.wp-block-accordion-heading__toggle-icon' );
		const text = panel.querySelector( 'p' );
		const lineHeight = parseFloat( getComputedStyle( text ).lineHeight );
		const angle = () => {
			const m = new DOMMatrix( getComputedStyle( icon ).transform );
			return Math.round( ( ( Math.atan2( m.b, m.a ) * 180 ) / Math.PI + 360 ) % 360 );
		};
		const frames = [];
		button.click();
		const start = performance.now();
		await new Promise( ( resolve ) => {
			const tick = () => {
				const r = text.getBoundingClientRect();
				frames.push( {
					panel: Math.round( panel.getBoundingClientRect().height ),
					item: Math.round( item.getBoundingClientRect().height ),
					x: Math.round( r.left ),
					width: Math.round( r.width ),
					lines: Math.round( r.height / lineHeight ),
					top: Math.round( r.top - button.getBoundingClientRect().bottom ),
					opacity: Math.round( Number( getComputedStyle( text ).opacity ) * Number( getComputedStyle( panel ).opacity ) * 100 ) / 100,
					angle: angle(),
				} );
				if ( performance.now() - start < 700 ) {
					requestAnimationFrame( tick );
				} else {
					resolve();
				}
			};
			requestAnimationFrame( tick );
		} );
		return { frames, hidden: panel.hasAttribute( 'hidden' ), expanded: button.getAttribute( 'aria-expanded' ) };
	} );

const between = ( values, min, max ) => [ ...new Set( values.filter( ( v ) => v > min && v < max ) ) ];
const show = ( frames, key ) => frames.map( ( f ) => f[ key ] ).join( ' ' );

/** Asserts that values[key] only goes one way (up: +1, down: -1), with some slack (1 px by default). */
const oneWay = ( frames, key, sign, label, slack = 1 ) => {
	const bad = frames.findIndex( ( f, i ) => i > 0 && sign * ( f[ key ] - frames[ i - 1 ][ key ] ) < -slack );
	assert.equal( bad, -1, `${ label }: «${ key }» va y vuelve: ${ show( frames, key ) }` );
};

/** Case 4 on one direction: sign +1 opening, -1 closing. */
const smooth = ( result, sign, open ) => {
	const label = sign > 0 ? 'al abrir' : 'al cerrar';
	const visible = result.frames.filter( ( f ) => f.panel > 0 );
	assert.ok( visible.length >= 3, `${ label }: no hay fotogramas con el panel a la vista` );
	oneWay( result.frames, 'panel', sign, label );
	oneWay( result.frames, 'item', sign, label );
	const moved = visible.filter( ( f ) => f.x !== open.x || f.width !== open.width || f.lines !== open.lines );
	assert.deepEqual( moved.map( ( f ) => `${ f.x }/${ f.width }/${ f.lines }` ), [], `${ label }: el texto (abierto en x/ancho/líneas ${ open.x }/${ open.width }/${ open.lines }) se recoloca` );
	const opacities = visible.map( ( f ) => f.opacity );
	const first = sign > 0 ? opacities[ 0 ] : opacities.at( -1 );
	assert.ok( first < 0.5, `${ label }: la respuesta no funde, sale ya con opacidad ${ first }: ${ opacities.join( ' ' ) }` );
	assert.ok( between( opacities, 0.05, 0.95 ).length >= 3, `${ label }: la opacidad salta: ${ opacities.join( ' ' ) }` );
	oneWay( visible, 'opacity', sign, label, 0.01 );
	oneWay( visible, 'top', -sign, label );
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 1 y 2: con movimiento.
		const page = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		const open = await sample( page );
		const heights = open.frames.map( ( f ) => f.panel );
		const full = Math.max( ...heights );
		assert.ok( full > 150, `el panel abierto mide ${ full } px: la respuesta larga no se ha pintado` );
		assert.equal( open.hidden, false, 'después de abrir, el panel sigue con hidden' );
		assert.equal( open.expanded, 'true', 'después de abrir, aria-expanded no es "true"' );
		assert.ok( between( heights, 2, full - 2 ).length >= 3, `al abrir la altura salta en vez de deslizar: ${ heights.join( ' ' ) }` );

		const close = await sample( page );
		const closing = close.frames.map( ( f ) => f.panel );
		assert.equal( close.hidden, true, 'después de cerrar, el panel no lleva hidden' );
		assert.equal( closing.at( -1 ), 0, `después de cerrar el panel mide ${ closing.at( -1 ) } px` );
		assert.ok( between( closing, 2, full - 2 ).length >= 3, `al cerrar la altura salta en vez de deslizar: ${ closing.join( ' ' ) }` );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 3: con «reducir movimiento», sin animación.
		const still = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'reduce' } );
		await still.goto( URL, { waitUntil: 'networkidle' } );
		const jump = await sample( still );
		const stillFull = Math.max( ...jump.frames.map( ( f ) => f.panel ) );
		assert.deepEqual( between( jump.frames.map( ( f ) => f.panel ), 2, stillFull - 2 ), [], `con «reducir movimiento» el panel se anima: ${ show( jump.frames, 'panel' ) }` );
		assert.deepEqual( between( jump.frames.filter( ( f ) => f.panel > 0 ).map( ( f ) => f.opacity ), 0.05, 0.95 ), [], `con «reducir movimiento» el texto funde: ${ show( jump.frames, 'opacity' ) }` );
		assert.equal( jump.hidden, false );

		// 4: con un hijo que da margen y relleno al panel abierto, abrir y cerrar sin saltos.
		const child = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await child.goto( URL, { waitUntil: 'networkidle' } );
		await child.addStyleTag( { content: CHILD_CSS } );
		const opening = await sample( child );
		const end = opening.frames.at( -1 );
		assert.equal( end.opacity, 1, `abierta, la respuesta queda con opacidad ${ end.opacity }` );
		smooth( opening, 1, end );
		const shutting = await sample( child );
		smooth( shutting, -1, end );
		assert.deepEqual( child.errors, [], child.errors.join( '\n' ) );

		// 5: teclado y foco, los del núcleo.
		const keys = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await keys.goto( URL, { waitUntil: 'networkidle' } );
		const toggle = keys.locator( '.wp-block-accordion-heading__toggle' ).first();
		await toggle.focus();
		await keys.keyboard.press( 'Enter' );
		await assert.doesNotReject( toggle.and( keys.locator( '[aria-expanded="true"]' ) ).waitFor(), 'Intro no abre' );
		assert.equal( await toggle.evaluate( ( b ) => b === document.activeElement ), true, 'al abrir con Intro, el foco se va del botón' );
		await keys.keyboard.press( 'Space' );
		await assert.doesNotReject( toggle.and( keys.locator( '[aria-expanded="false"]' ) ).waitFor(), 'Espacio no cierra' );
		assert.equal( await toggle.evaluate( ( b ) => b === document.activeElement ), true, 'al cerrar con Espacio, el foco se va del botón' );
		assert.deepEqual( keys.errors, [], keys.errors.join( '\n' ) );

		// 6: el «+» gira 135° pasando por intermedios, y vuelve.
		const angles = open.frames.map( ( f ) => f.angle );
		assert.equal( angles.at( -1 ), 135, `abierto, el «+» está a ${ angles.at( -1 ) }°: ${ angles.join( ' ' ) }` );
		assert.ok( between( angles, 5, 130 ).length >= 3, `el «+» salta en vez de girar: ${ angles.join( ' ' ) }` );
		assert.equal( close.frames.at( -1 ).angle, 0, `cerrado, el «+» está a ${ close.frames.at( -1 ).angle }°` );
	} )
);
