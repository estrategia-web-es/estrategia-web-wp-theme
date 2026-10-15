// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: block registration in the editor (classic edit.js, autoRegister) only exists when running the WordPress editor.
/**
 * The three blocks (the cookie notice one moved to estrategia-web-site in
 * 0.7.0) exist in the editor, with Spanish titles (the test site's locale);
 * they insert without errors; the carousel accepts inner blocks; and the
 * automatic autoRegister controls carry the translated labels from
 * labels.php.
 * Careful: Playground's --login does NOT serve a new browser; it logs in
 * through wp-login.php.
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const page = await newPage( { viewport: { width: 1400, height: 1000 } } );
		// Playground's default user: it only exists in this ephemeral test
		// WordPress, which dies when done (row 21: not a real credential).
		await page.goto( `${ BASE_URL }/wp-login.php` );
		await page.fill( '#user_login', 'admin' );
		await page.fill( '#user_pass', 'password' );
		await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
		await page.goto( `${ BASE_URL }/wp-admin/post-new.php?post_type=page`, { waitUntil: 'domcontentloaded' } );
		await page.waitForFunction( () => window.wp?.blocks?.getBlockType?.( 'estrategia-web/whatsapp' ), null, { timeout: 60000 } );

		const types = await page.evaluate( () =>
			[ 'estrategia-web/carousel', 'estrategia-web/map', 'estrategia-web/whatsapp' ].map( ( name ) => {
				const type = window.wp.blocks.getBlockType( name );
				return type && { name, title: type.title, label: type.attributes.phone?.label };
			} )
		);
		assert.ok( types.every( Boolean ), `blocks missing in the editor: ${ JSON.stringify( types ) }` );
		assert.deepEqual(
			types.map( ( t ) => t.title ),
			[ 'Carrusel', 'Mapa (en dos clics)', 'Botón de WhatsApp' ]
		);
		assert.equal( types[ 2 ].label, 'Teléfono en formato internacional (vacío: la opción del sitio)', 'autoRegister label untranslated' );

		// Insert the three; the carousel with its inner block template.
		const inserted = await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;
			const carousel = createBlock( 'estrategia-web/carousel', {}, [ createBlock( 'core/paragraph', { content: 'Uno' } ), createBlock( 'core/paragraph', { content: 'Dos' } ) ] );
			window.wp.data.dispatch( 'core/block-editor' ).insertBlocks( [
				carousel,
				createBlock( 'estrategia-web/map', { address: 'Calle Falsa 1' } ),
				createBlock( 'estrategia-web/whatsapp', { phone: '34600111222' } ),
			] );
			return window.wp.data.select( 'core/block-editor' ).getBlocks().map( ( b ) => [ b.name, b.isValid, b.innerBlocks.length ] );
		} );
		assert.deepEqual( inserted.slice( -3 ), [
			[ 'estrategia-web/carousel', true, 2 ],
			[ 'estrategia-web/map', true, 0 ],
			[ 'estrategia-web/whatsapp', true, 0 ],
		] );

		// The map's server preview (ServerSideRender) arrives.
		const editorFrame = page.frameLocator( 'iframe[name="editor-canvas"]' );
		await editorFrame.getByText( 'Calle Falsa 1' ).first().waitFor( { timeout: 30000 } );

		const errors = page.errors.filter( ( e ) => ! /favicon/.test( e ) );
		assert.deepEqual( errors, [], errors.join( '\n' ) );
	} )
);
