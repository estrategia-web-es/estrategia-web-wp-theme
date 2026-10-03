// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: lo que se prueba es el ALTO que calcula el motor de maquetación para el mapa dentro de un contenedor flex, y eso solo existe con la página pintada.
/**
 * armazon/map dentro de un Grupo vertical (flex en columna) NO SE ENCOGE.
 *
 * El fallo, 03-10-2026: el hijo de Lavandería redondea el mapa con
 * overflow:hidden y lo mete en un Grupo vertical; un hijo flex con overflow
 * distinto de visible tiene tamaño mínimo 0, y el mapa se quedó en 2 px con
 * todo lo de dentro cortado (la página salió un 14 % más corta). El arreglo es
 * `flex: none` en .armazon-map (blocks/map/style.css).
 *
 * La prueba reproduce exactamente ese caso sobre /prueba-modulos/: envuelve el
 * mapa en un contenedor flex en columna con alto limitado (como el que
 * producía el colapso) y le pone overflow:hidden, y comprueba que la figura
 * sigue midiendo lo que su marco.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage();
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		const medida = await page.evaluate( () => {
			const map = document.querySelector( '.armazon-map' );
			const wrap = document.createElement( 'div' );
			// Un Grupo vertical de WordPress: flex en columna. El alto limitado
			// fuerza a repartir, que es cuando un hijo encogible se aplasta.
			wrap.style.cssText = 'display:flex;flex-direction:column;height:200px';
			map.before( wrap );
			wrap.append( map );
			map.style.overflow = 'hidden';
			const frame = map.querySelector( '.armazon-map__frame' );
			return { figura: map.getBoundingClientRect().height, marco: frame.getBoundingClientRect().height };
		} );
		assert.ok( medida.marco > 100, `el marco del mapa no tiene alto (${ medida.marco } px): la prueba no mide nada` );
		assert.ok(
			medida.figura >= medida.marco,
			`el mapa se encoge dentro de un flex: la figura mide ${ medida.figura } px y su marco ${ medida.marco } px`
		);
		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
