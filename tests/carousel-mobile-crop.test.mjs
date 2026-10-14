// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: qué fichero baja (el recorte vertical o la foto horizontal) lo decide el navegador con el media del <source> y el ancho de la ventana; sin pintar no hay currentSrc.
/**
 * Recorte para el móvil del carrusel (plugin Estrategia Web 1.1.x, atributo
 * mobileRatio; modules/carousel/includes/carousel-mobile-crop.php), en
 * /prueba-carrusel-movil/ (fotos de 1920×1280 en un carrusel con
 * mobileRatio «4/5»):
 * - cada <img> va dentro de un <picture> con un <source media="(max-width: 781px)">;
 * - a 402 px (2x) la foto que baja es el RECORTE: proporción 4/5, del
 *   ancho que pide la caja (≥ 804 px) y no la horizontal de 1536;
 * - a 1512 px baja la horizontal de siempre;
 * - la primera conserva fetchpriority="high" (la prioridad es del <img>,
 *   valga la fuente que valga) y la página no da errores;
 * - idempotente: la segunda visita sirve los mismos ficheros (no los rehace
 *   con otro nombre).
 * Vista en rojo (14-10-2026) antes de escribir carousel-mobile-crop.php: no
 * había <picture> y a 402 bajaba la de 1536.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-carrusel-movil/`;

const inspect = ( page ) =>
	page.evaluate( () =>
		[ ...document.querySelectorAll( '.estrategia-web-carousel__track img' ) ].map( ( img ) => ( {
			inPicture: 'PICTURE' === img.parentElement.tagName,
			media: img.parentElement.querySelector( 'source' )?.getAttribute( 'media' ),
			srcset: img.parentElement.querySelector( 'source' )?.getAttribute( 'srcset' ),
			priority: img.getAttribute( 'fetchpriority' ),
			src: img.currentSrc,
			natural: [ img.naturalWidth, img.naturalHeight ],
			box: img.getBoundingClientRect().width,
		} ) )
	);

const loaded = ( page ) =>
	page.waitForFunction( () => {
		const first = document.querySelector( '.estrategia-web-carousel__track img' );
		return first && first.complete && first.naturalWidth > 0;
	} );

run( () =>
	withBrowser( async ( { newPage } ) => {
		const phone = await newPage( { viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 } );
		await phone.goto( URL, { waitUntil: 'load' } );
		await loaded( phone );
		const mobile = await inspect( phone );
		assert.equal( mobile.length, 3 );
		mobile.forEach( ( img, i ) => {
			assert.ok( img.inPicture, `diapositiva ${ i + 1 } sin <picture>` );
			assert.equal( img.media, '(max-width: 781px)' );
		} );
		const first = mobile[ 0 ];
		assert.equal( first.priority, 'high', 'la primera perdió fetchpriority="high"' );
		// Del NOMBRE del fichero (…-960x1200.webp): naturalWidth viene corregido
		// por la densidad del srcset (960w con sizes 100vw a 402 → 402).
		const [ w, h ] = ( first.src.match( /-(\d+)x(\d+)\.\w+$/ ) || [ 0, 0, 1 ] ).slice( 1 ).map( Number );
		assert.ok( Math.abs( w / h - 0.8 ) < 0.01, `a 402 baja una foto de ${ w }×${ h }, no el recorte 4/5 (${ first.src })` );
		assert.ok( w >= first.box * 2 - 1 && w <= 1200, `el recorte (${ w }) no casa con la caja (${ first.box } px a 2x)` );
		assert.deepEqual( phone.errors, [], phone.errors.join( '\n' ) );

		const again = await newPage( { viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 } );
		await again.goto( URL, { waitUntil: 'load' } );
		assert.deepEqual( ( await inspect( again ) ).map( ( i ) => i.srcset ), mobile.map( ( i ) => i.srcset ), 'la segunda visita sirve otros ficheros' );

		const desk = await newPage( { viewport: { width: 1512, height: 900 } } );
		await desk.goto( URL, { waitUntil: 'load' } );
		await loaded( desk );
		const [ wide ] = await inspect( desk );
		assert.ok( ! /-m\d+x\d+-/.test( wide.src ) && wide.natural[ 0 ] / wide.natural[ 1 ] > 1.4, `en escritorio baja ${ wide.natural.join( '×' ) }, no la horizontal (${ wide.src })` );
		assert.deepEqual( desk.errors, [], desk.errors.join( '\n' ) );
	} )
);
