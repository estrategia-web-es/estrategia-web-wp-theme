// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es el ALTO que calcula el motor de maquetación para el mapa dentro de un contenedor flex, y eso solo existe con la página pintada.
/**
 * estrategia-web/map dentro de un Grupo vertical (flex en columna) NO SE ENCOGE.
 *
 * El fallo, 03-10-2026: el hijo de Lavandería redondea el mapa con
 * overflow:hidden y lo mete en un Grupo vertical; un hijo flex con overflow
 * distinto de visible tiene tamaño mínimo 0, y el mapa se quedó en 2 px con
 * todo lo de dentro cortado (la página salió un 14 % más corta). El arreglo es
 * `flex: none` en .estrategia-web-map (blocks/map/style.css).
 *
 * La prueba reproduce exactamente ese caso sobre /prueba-modulos/: envuelve el
 * mapa en lo mismo que pinta un Grupo vertical de WordPress —flex en columna,
 * align-items:flex-start, ALTO AUTOMÁTICO— y le pone overflow:hidden, y
 * comprueba que la figura sigue midiendo lo que su marco.
 *
 * La TRAMPA, que costó una versión: la primera prueba (0.3.1) le ponía al
 * contenedor un alto fijo de 200 px. Así el fallo era otro (encogerse) y la
 * prueba pasaba con un arreglo que en la web real no arreglaba nada. Una prueba
 * tiene que reproducir el caso real, no uno parecido.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage();
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		const medida = await page.evaluate( () => {
			const map = document.querySelector( '.estrategia-web-map' );
			const wrap = document.createElement( 'div' );
			// Lo que pinta un Grupo vertical de WordPress alineado a la izquierda.
			wrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start';
			map.before( wrap );
			wrap.append( map );
			map.style.overflow = 'hidden';
			// Lo que hace el estilo «map-card» del hijo: el pie (dirección y
			// botones) va ENCIMA del mapa, fuera del flujo. Sin esto la figura
			// tiene contenido en flujo con ancho propio y el fallo no aparece.
			const caption = map.querySelector( '.estrategia-web-map__caption' );
			if ( caption ) caption.style.position = 'absolute';
			const frame = map.querySelector( '.estrategia-web-map__frame' );
			return { figura: map.getBoundingClientRect().height, marco: frame.getBoundingClientRect().height };
		} );
		// Con el fallo, el marco se mide con ancho 0 y su alto (aspect-ratio) sale 0:
		// un mapa de menos de 100 px de alto es el fallo, no una prueba sin datos.
		assert.ok( medida.marco > 100 && medida.figura > 100, `el mapa se aplasta dentro de un Grupo vertical: figura ${ medida.figura } px, marco ${ medida.marco } px` );
		assert.ok(
			medida.figura >= medida.marco,
			`el mapa se encoge dentro de un flex: la figura mide ${ medida.figura } px y su marco ${ medida.marco } px`
		);
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
