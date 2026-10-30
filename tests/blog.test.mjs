// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: what is checked is what the templates render (patterns, core blocks and the related-posts query filter), and that only exists when WordPress renders the page.
/**
 * The blog templates (1.2.0): patterns/posts-grid.php and
 * patterns/single-post.php, with inc/related-posts.php.
 *
 * - The category listing (archive.html) shows each post as a card with its
 *   linked title, its category and a reading time.
 * - A single post has the byline (author name and reading time) and its
 *   «related posts» list has the other post of the same category, never the
 *   post itself nor the one from another category.
 * - No console errors on either.
 *
 * The posts are created by tests/fixtures/setup/setup.php (prueba-blog-a, -b
 * in «prueba-uno», -c in «prueba-dos»).
 *
 * How to maintain: if the class names of the patterns change, change them
 * here (they are the contract with the child themes, see each pattern's
 * header). The trap: Playground answers 200 with the home page for a pretty
 * URL that does not exist, so the posts are reached with ?p=… and the
 * category with ?cat=… would hide a broken rewrite: the pretty URL is used,
 * and the test checks the page really is the post (its title).
 */
import { withBrowser, run, assert, BASE_URL } from './browser.mjs';

run( () =>
	withBrowser( async ( { newPage } ) => {
		const list = await newPage();
		await list.goto( `${ BASE_URL }/category/prueba-uno/`, { waitUntil: 'networkidle' } );
		const cards = await list.$$eval( '.estrategia-web-posts .estrategia-web-posts__card', ( els ) =>
			els.map( ( el ) => ( {
				title: el.querySelector( '.wp-block-post-title a' )?.textContent.trim(),
				terms: el.querySelector( '.wp-block-post-terms' )?.textContent.trim(),
				time: el.querySelector( '.wp-block-post-time-to-read' )?.textContent.trim(),
			} ) )
		);
		assert.deepEqual( cards.map( ( c ) => c.title ).sort(), [ 'Entrada de prueba A', 'Entrada de prueba B' ], 'the category listing shows its two posts as cards' );
		for ( const c of cards ) {
			assert.match( c.terms || '', /Categoría uno/, `${ c.title }: the card shows its category` );
			assert.match( c.time || '', /\d/, `${ c.title }: the card shows a reading time` );
		}
		assert.deepEqual( list.errors, [], `the listing has errors:\n${ list.errors.join( '\n' ) }` );

		const single = await newPage();
		await single.goto( `${ BASE_URL }/prueba-blog-a/`, { waitUntil: 'networkidle' } );
		assert.equal( ( await single.textContent( 'h1' ) ).trim(), 'Entrada de prueba A', 'the pretty URL serves the post' );
		const byline = await single.textContent( '.estrategia-web-single__byline' );
		assert.match( byline, /admin/i, 'the byline has the author' );
		assert.match( byline, /\d/, 'the byline has the reading time' );
		const related = await single.$$eval( '.estrategia-web-related .wp-block-post-title', ( els ) => els.map( ( el ) => el.textContent.trim() ) );
		assert.deepEqual( related, [ 'Entrada de prueba B' ], 'related: the other post of the same category, not itself nor the other category' );
		assert.deepEqual( single.errors, [], `the post has errors:\n${ single.errors.join( '\n' ) }` );
	} )
);
