// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es la ALTURA del panel fotograma a fotograma mientras se abre, y eso solo existe con la página pintada y el reloj de animación corriendo.
/**
 * core/accordion abre y cierra DESLIZANDO (assets/core-blocks/accordion.css,
 * 0.4.0), no de golpe:
 * 1. al abrir, la altura del panel pasa por valores intermedios entre 0 y su
 *    alto final, y termina abierto (sin hidden, aria-expanded="true");
 * 2. al cerrar, igual al revés, y termina con hidden y 0 de alto;
 * 3. con «reducir movimiento» NO hay valores intermedios: salta;
 * 4. (0.5.0) con un hijo que da margen y relleno LATERAL solo al panel
 *    abierto —lo que hace Lavandería: `:not([hidden]) { margin: … 24px;
 *    padding-right: 2.5rem }`—, al cerrar el texto NO se mueve ni cambia de
 *    ancho mientras el panel se pliega: el cierre es el espejo de la apertura.
 *
 * Sobre /prueba-acordeon/ (tests/fixtures/setup/setup.php): la primera
 * pregunta tiene una respuesta larga, para que la animación tenga recorrido.
 * Vista fallar el 03-10-2026 sin la hoja: 0 alturas intermedias al abrir.
 * El 4, visto fallar con la hoja de la 0.4.0: el párrafo pasaba de x=48 y
 * 264 de ancho a x=24 y 352 en el primer fotograma del cierre (se reajustaba
 * en menos líneas mientras la altura bajaba). En Lavandería, a 1280: de
 * 268/704 a 244/792.
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

/** Clicks the first toggle and records the panel height on every frame for 700 ms. */
const sample = ( page ) =>
	page.evaluate( async () => {
		const button = document.querySelector( '.wp-block-accordion-heading__toggle' );
		const panel = document.getElementById( button.getAttribute( 'aria-controls' ) );
		const heights = [];
		button.click();
		const start = performance.now();
		await new Promise( ( resolve ) => {
			const tick = () => {
				heights.push( Math.round( panel.getBoundingClientRect().height ) );
				if ( performance.now() - start < 700 ) {
					requestAnimationFrame( tick );
				} else {
					resolve();
				}
			};
			requestAnimationFrame( tick );
		} );
		return { heights, hidden: panel.hasAttribute( 'hidden' ), expanded: button.getAttribute( 'aria-expanded' ) };
	} );

const between = ( heights, max ) => [ ...new Set( heights.filter( ( h ) => h > 2 && h < max - 2 ) ) ];

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 1 y 2: con movimiento.
		const page = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		const open = await sample( page );
		const full = Math.max( ...open.heights );
		assert.ok( full > 150, `el panel abierto mide ${ full } px: la respuesta larga no se ha pintado` );
		assert.equal( open.hidden, false, 'después de abrir, el panel sigue con hidden' );
		assert.equal( open.expanded, 'true', 'después de abrir, aria-expanded no es "true"' );
		const openSteps = between( open.heights, full );
		assert.ok( openSteps.length >= 3, `al abrir la altura salta en vez de deslizar: ${ open.heights.join( ' ' ) }` );

		const close = await sample( page );
		assert.equal( close.hidden, true, 'después de cerrar, el panel no lleva hidden' );
		assert.equal( close.heights.at( -1 ), 0, `después de cerrar el panel mide ${ close.heights.at( -1 ) } px` );
		const closeSteps = between( close.heights, full );
		assert.ok( closeSteps.length >= 3, `al cerrar la altura salta en vez de deslizar: ${ close.heights.join( ' ' ) }` );
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 3: con «reducir movimiento», sin animación.
		const still = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'reduce' } );
		await still.goto( URL, { waitUntil: 'networkidle' } );
		const jump = await sample( still );
		const stillFull = Math.max( ...jump.heights );
		assert.deepEqual( between( jump.heights, stillFull ), [], `con «reducir movimiento» el panel se anima: ${ jump.heights.join( ' ' ) }` );
		assert.equal( jump.hidden, false );

		// 4: el texto no se reajusta al cerrar con un hijo que da margen lateral al abierto.
		const child = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await child.goto( URL, { waitUntil: 'networkidle' } );
		await child.addStyleTag( { content: '.wp-block-accordion-panel:not([hidden]) { margin: -0.5rem 24px 24px; padding-right: 2.5rem; }' } );
		await sample( child );
		const geometry = await child.evaluate( async () => {
			const button = document.querySelector( '.wp-block-accordion-heading__toggle' );
			const panel = document.getElementById( button.getAttribute( 'aria-controls' ) );
			const text = panel.querySelector( 'p' );
			const before = text.getBoundingClientRect();
			const frames = [];
			button.click();
			const start = performance.now();
			await new Promise( ( resolve ) => {
				const tick = () => {
					const r = text.getBoundingClientRect();
					if ( panel.getBoundingClientRect().height > 0 ) {
						frames.push( `${ Math.round( r.left ) }/${ Math.round( r.width ) }` );
					}
					if ( performance.now() - start < 700 ) {
						requestAnimationFrame( tick );
					} else {
						resolve();
					}
				};
				requestAnimationFrame( tick );
			} );
			return { open: `${ Math.round( before.left ) }/${ Math.round( before.width ) }`, frames };
		} );
		assert.ok( geometry.frames.length >= 3, `no hay fotogramas de cierre: ${ geometry.frames.join( ' ' ) }` );
		const moved = geometry.frames.filter( ( f ) => f !== geometry.open );
		assert.deepEqual( moved, [], `al cerrar, el texto (abierto en x/ancho ${ geometry.open }) se mueve: ${ geometry.frames.join( ' ' ) }` );
		assert.deepEqual( child.errors, [], child.errors.join( '\n' ) );
	} )
);
