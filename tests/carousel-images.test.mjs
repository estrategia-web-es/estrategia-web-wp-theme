// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: qué foto del srcset se descarga lo decide el navegador con el sizes y el ancho pintado; sin pintar no hay currentSrc.
/**
 * estrategia-web/carousel con fotos (0.7.4), en /prueba-carrusel-fotos/:
 * - el carrusel de ARRIBA (1/2/3 a la vista, cuatro fotos): las tres primeras
 *   diapositivas, las que se pueden ver al cargar, llevan fetchpriority="high"
 *   y ninguna loading="lazy"; la cuarta, que no se ve, va diferida
 *   (loading="lazy", sin prioridad, con sizes="auto, …").
 * - el de ABAJO (3000 px más abajo): ninguna foto con prioridad, todas
 *   diferidas. La prioridad no se regala a un carrusel que no está a la vista.
 * - a 1512 y a 402 de ancho, la foto descargada de cada diapositiva visible
 *   es como mínimo de su ancho pintado y no más del doble: el sizes dice el
 *   ancho de la diapositiva, no el de la ventana.
 * - la marca interna data-estrategia-web-carousel no llega a la página.
 * Contra la 0.7.3 falla: solo la primera llevaba prioridad, la cuarta no
 * iba diferida y a 1512 bajaba la de 1536 para un hueco de ~500.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

const URL = `${ BASE_URL }/prueba-carrusel-fotos/`;

/** Ancho real del fichero descargado: -768x512.jpg → 768; el original → 1920. */
const fileWidth = ( src ) => {
	const match = src.match( /-(\d+)x\d+\.\w+$/ );
	return match ? Number( match[ 1 ] ) : 1920;
};

const inspect = ( page ) =>
	page.evaluate( () =>
		[ ...document.querySelectorAll( '.estrategia-web-carousel' ) ].map( ( carousel ) => ( {
			label: carousel.getAttribute( 'aria-label' ),
			images: [ ...carousel.querySelectorAll( '.estrategia-web-carousel__track img' ) ].map( ( img ) => ( {
				alt: img.alt,
				loading: img.getAttribute( 'loading' ),
				priority: img.getAttribute( 'fetchpriority' ),
				sizes: img.getAttribute( 'sizes' ),
				marker: img.hasAttribute( 'data-estrategia-web-carousel' ),
				src: img.currentSrc,
				width: img.getBoundingClientRect().width,
				visible: ( () => {
					const r = img.getBoundingClientRect();
					const t = carousel.querySelector( '.estrategia-web-carousel__track' ).getBoundingClientRect();
					return r.right > t.left + 1 && r.left < t.right - 1 && r.top < innerHeight;
				} )(),
			} ) ),
		} ) )
	);

run( () =>
	withBrowser( async ( { newPage } ) => {
		for ( const width of [ 1512, 402 ] ) {
			const page = await newPage( { viewport: { width, height: 900 } } );
			await page.goto( URL, { waitUntil: 'load' } );
			await page.waitForFunction( () =>
				[ ...document.querySelectorAll( '.estrategia-web-carousel' ) ][ 0 ]
					.querySelectorAll( 'img' )
					.length && [ ...document.querySelectorAll( '.estrategia-web-carousel' )[ 0 ].querySelectorAll( 'img' ) ].slice( 0, 3 ).every( ( i ) => i.complete && i.currentSrc )
			);
			const [ top, bottom ] = await inspect( page );
			assert.equal( top.label, 'Fotos arriba' );
			assert.equal( top.images.length, 4 );

			top.images.forEach( ( img, i ) => {
				assert.equal( img.marker, false, `${ img.alt }: la marca data-estrategia-web-carousel llegó a la página` );
				if ( i < 3 ) {
					// 0.7.9: «high» SOLO la primera; las otras visibles cargan ya, sin prioridad.
					// (La prueba se quedó en 0.7.4 y estaba en rojo desde el 06-10-2026;
					// se puso al día el 14-10-2026, comprobado contra la 1.0.0 sin tocar.)
					assert.equal( img.priority, 0 === i ? 'high' : null, `${ img.alt } (diapositiva ${ i + 1 }, visible al cargar): fetchpriority="${ img.priority }"` );
					assert.equal( img.loading, null, `${ img.alt } (visible al cargar) va con loading="${ img.loading }"` );
				} else {
					assert.equal( img.loading, 'lazy', `${ img.alt } (no se ve al cargar) no va diferida` );
					assert.equal( img.priority, null, `${ img.alt } (no se ve al cargar) lleva fetchpriority="${ img.priority }"` );
					assert.match( img.sizes || '', /^auto, /, `${ img.alt } diferida sin sizes="auto, …": ${ img.sizes }` );
				}
			} );

			const visible = top.images.filter( ( img ) => img.visible );
			assert.ok( visible.length >= 1, `a ${ width } no se ve ninguna foto` );
			for ( const img of visible ) {
				const got = fileWidth( img.src );
				assert.ok( got >= img.width, `${ width }: ${ img.alt } descarga ${ got } px para un hueco de ${ Math.round( img.width ) } (borrosa)` );
				assert.ok( got <= img.width * 2, `${ width }: ${ img.alt } descarga ${ got } px para un hueco de ${ Math.round( img.width ) } (más del doble; sizes=${ img.sizes })` );
			}
			console.log( `# ${ width }: ${ visible.map( ( i ) => `${ i.alt } ${ Math.round( i.width ) }→${ fileWidth( i.src ) }` ).join( ', ' ) }` );

			assert.equal( bottom.label, 'Fotos abajo' );
			for ( const img of bottom.images ) {
				assert.equal( img.priority === 'high', false, `${ img.alt } (carrusel de abajo) lleva prioridad alta` );
				assert.equal( img.loading, 'lazy', `${ img.alt } (carrusel de abajo) no va diferida` );
				assert.equal( img.marker, false );
			}
			assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
		}
	} )
);
