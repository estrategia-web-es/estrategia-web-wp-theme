// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: el aviso se decide en el navegador (cookie, módulo ES) y el peso visual es estilo calculado.
/**
 * armazon/consent:
 * - con categorías declaradas el aviso sale; sin ninguna, NO (ni el enlace);
 * - Aceptar y Rechazar tienen el mismo peso visual (AEPD);
 * - la elección persiste (cookie) y se expone en window.armazonConsent;
 * - aceptar activa los <script type="text/plain" data-armazon-consent>;
 * - «Configurar cookies» del pie reabre el aviso.
 */
import { withBrowser, run, assert, PAGE } from './browser.mjs';

const notice = ( page ) => page.locator( '#armazon-consent' );

run( () =>
	withBrowser( async ( { newPage } ) => {
		// Sin categorías: ni aviso ni enlace.
		const none = await newPage();
		await none.goto( `${ PAGE }?no-categories=1`, { waitUntil: 'networkidle' } );
		assert.equal( await notice( none ).count(), 0, 'sin categorías no debería existir el aviso' );
		assert.equal( await none.locator( '.armazon-consent-link' ).count(), 0, 'sin categorías no debería existir el enlace' );

		// Con categorías: sale.
		const page = await newPage();
		await page.goto( PAGE, { waitUntil: 'networkidle' } );
		await notice( page ).waitFor( { state: 'visible' } );

		// Mismo peso visual para aceptar y rechazar.
		const look = ( name ) =>
			page.getByRole( 'button', { name } ).evaluate( ( el ) => {
				const s = getComputedStyle( el );
				return [ s.backgroundColor, s.color, s.fontSize, s.fontWeight, s.paddingTop, s.paddingLeft, s.borderTopWidth, el.offsetHeight ].join( '|' );
			} );
		assert.equal( await look( 'Aceptar todas' ), await look( 'Rechazar todas' ), 'aceptar y rechazar no pesan igual' );

		// Rechazar: se cierra, se guarda, persiste al recargar.
		await page.getByRole( 'button', { name: 'Rechazar todas' } ).click();
		await notice( page ).waitFor( { state: 'hidden' } );
		const cookie = ( await page.context().cookies() ).find( ( c ) => c.name === 'armazon_consent' );
		assert.ok( cookie, 'no se guardó la cookie armazon_consent' );
		assert.match( decodeURIComponent( cookie.value ), /^[0-9a-f]{8}\.\.\d+$/, `formato de cookie inesperado: ${ cookie.value }` );
		await page.reload( { waitUntil: 'networkidle' } );
		await page.waitForFunction( () => window.armazonConsent );
		assert.ok( await notice( page ).isHidden(), 'el aviso vuelve a salir tras rechazar' );
		assert.deepEqual( await page.evaluate( () => window.armazonConsent.get() ), [] );
		assert.equal( await page.evaluate( () => window.armazonTestStatistics ), undefined, 'se ejecutó un script de estadísticas rechazado' );

		// Reabrir desde el enlace del pie.
		await page.getByRole( 'button', { name: 'Configurar cookies' } ).last().click();
		await notice( page ).waitFor( { state: 'visible' } );
		// Al reabrir, el foco entra en el aviso (si no, Escape no le llega).
		await page.waitForFunction( () => document.activeElement?.id === 'armazon-consent-title' );
		await page.keyboard.press( 'Escape' );
		await notice( page ).waitFor( { state: 'hidden' } );

		// Aceptar todas en otra visita: activa el script diferido y lo expone.
		const accept = await newPage();
		await accept.goto( PAGE, { waitUntil: 'networkidle' } );
		await accept.getByRole( 'button', { name: 'Aceptar todas' } ).click();
		await accept.waitForFunction( () => window.armazonTestStatistics === true );
		assert.equal( await accept.evaluate( () => window.armazonConsent.has( 'statistics' ) ), true );
		await accept.reload( { waitUntil: 'networkidle' } );
		await accept.waitForFunction( () => window.armazonTestStatistics === true );
		assert.ok( await notice( accept ).isHidden(), 'el aviso vuelve a salir tras aceptar' );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );
	} )
);
