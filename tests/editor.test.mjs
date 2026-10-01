// NIVEL: 3 — navegador. NECESITA NAVEGADOR PORQUE: el registro de bloques en el editor (edit.js clásico, autoRegister) solo existe ejecutando el editor de WordPress.
/**
 * Los cuatro bloques existen en el editor, con títulos en castellano; se
 * insertan sin errores; el carrusel acepta bloques internos; y los controles
 * automáticos de autoRegister llevan las etiquetas traducidas de labels.php.
 * Ojo: el --login de Playground NO sirve a un navegador nuevo; se entra por
 * wp-login.php.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1400, height: 1000 } } );
		// Usuario por defecto de Playground: solo existe en este WordPress efímero
		// de pruebas, que muere al acabar (fila 21: no es una credencial real).
		await page.goto( `${ BASE_URL }/wp-login.php` );
		await page.fill( '#user_login', 'admin' );
		await page.fill( '#user_pass', 'password' );
		await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
		await page.goto( `${ BASE_URL }/wp-admin/post-new.php?post_type=page`, { waitUntil: 'domcontentloaded' } );
		await page.waitForFunction( () => window.wp?.blocks?.getBlockType?.( 'armazon/whatsapp' ), null, { timeout: 60000 } );

		const types = await page.evaluate( () =>
			[ 'armazon/carousel', 'armazon/map', 'armazon/consent', 'armazon/whatsapp' ].map( ( name ) => {
				const type = window.wp.blocks.getBlockType( name );
				return type && { name, title: type.title, label: type.attributes.phone?.label };
			} )
		);
		assert.ok( types.every( Boolean ), `faltan bloques en el editor: ${ JSON.stringify( types ) }` );
		assert.deepEqual(
			types.map( ( t ) => t.title ),
			[ 'Carrusel', 'Mapa (en dos clics)', 'Enlace de configuración de cookies', 'Botón de WhatsApp' ]
		);
		assert.equal( types[ 3 ].label, 'Teléfono en formato internacional (vacío: la opción del sitio)', 'etiqueta de autoRegister sin traducir' );

		// Insertar los cuatro; el carrusel con su plantilla de bloques internos.
		const inserted = await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			const carousel = createBlock( 'armazon/carousel', {}, [ createBlock( 'core/paragraph', { content: 'Uno' } ), createBlock( 'core/paragraph', { content: 'Dos' } ) ] );
			window.wp.data.dispatch( 'core/block-editor' ).insertBlocks( [
				carousel,
				createBlock( 'armazon/map', { address: 'Calle Falsa 1' } ),
				createBlock( 'armazon/consent' ),
				createBlock( 'armazon/whatsapp', { phone: '34600111222' } ),
			] );
			return window.wp.data.select( 'core/block-editor' ).getBlocks().map( ( b ) => [ b.name, b.isValid, b.innerBlocks.length ] );
		} );
		assert.deepEqual( inserted.slice( -4 ), [
			[ 'armazon/carousel', true, 2 ],
			[ 'armazon/map', true, 0 ],
			[ 'armazon/consent', true, 0 ],
			[ 'armazon/whatsapp', true, 0 ],
		] );

		// La vista previa del servidor (ServerSideRender) del mapa llega.
		const editorFrame = page.frameLocator( 'iframe[name="editor-canvas"]' );
		await editorFrame.getByText( 'Calle Falsa 1' ).first().waitFor( { timeout: 30000 } );

		const errors = page.errors.filter( ( e ) => ! /favicon/.test( e ) );
		assert.deepEqual( errors, [], errors.join( '\n' ) );
	} )
);
