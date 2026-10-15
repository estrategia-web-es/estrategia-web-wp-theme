// NIVEL: 3 — browser. NEEDS A BROWSER BECAUSE: what is tested is the panel's HEIGHT and the text's position, width and opacity frame by frame while it opens and closes, and that only exists with the page painted and the animation clock running.
/**
 * core/accordion opens and closes by SLIDING AND FADING, without text jumps
 * (assets/core-blocks/accordion.css, 0.4.0, 0.5.0 and 0.7.3):
 * 1. on opening, the panel height goes through values between 0 and its final
 *    height and ends up open (no hidden, aria-expanded="true");
 * 2. on closing, the same in reverse, and it ends up with hidden and 0 height;
 * 3. with "reduce motion" there are NO intermediate values: neither of height
 *    nor of opacity;
 * 4. with a child that gives margin and padding only to the open panel —what
 *    Lavandería does: `:not([hidden]) { margin: -0.5rem 24px 24px;
 *    padding-right: 2.5rem }`—, frame by frame, on OPENING and on CLOSING:
 *    - the panel's height and the whole question's only grow (open) or only
 *      shrink (close): nothing pushes what is below in jerks;
 *    - the answer's text does not change x, width or number of lines (0.5.0:
 *      on closing it reflowed into fewer lines);
 *    - the answer APPEARS BY FADING (0.7.3): its opacity starts below 0.5,
 *      goes through intermediate values and only goes up (on closing, only
 *      down); and it moves in one direction only, without going back and
 *      forth;
 * 5. keyboard and focus are still core's: Enter opens, Space closes,
 *    aria-expanded follows and focus stays on the button;
 * 6. the "+" turns 135° on opening going through intermediate angles (0.7.3)
 *    and goes back to 0 on closing.
 *
 * On /prueba-acordeon/ (tests/fixtures/setup/setup.php): the first question
 * has a long answer, so the animation has some travel.
 * Seen failing on 03-10-2026 without the stylesheet: 0 intermediate heights
 * on opening.
 * Number 4, seen failing with the 0.4.0 stylesheet: the paragraph went from
 * x=48 and 264 wide to x=24 and 352 in the first frame of closing.
 * Numbers 4 and 6, seen failing on 06-10-2026 with 0.7.2: the answer came out
 * with opacity 1 from the first frame and, already fully visible, rose 8 px
 * (the child's -0.5rem margin animating): "the text jumps", David on
 * Lavandería; the "+" turned 45°.
 *
 * How to maintain: if core changes the accordion markup (for example, to
 * <details>), this fails first; change the stylesheet's technique and leave
 * the test as it is, since it measures what the user sees.
 * The trap: it is measured with requestAnimationFrame INSIDE the page, not
 * with Playwright waits between measurements: each round trip to the browser
 * takes as long as half the animation and the intermediate values were not
 * seen.
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
	assert.equal( bad, -1, `${ label }: "${ key }" goes back and forth: ${ show( frames, key ) }` );
};

/** Case 4 on one direction: sign +1 opening, -1 closing. */
const smooth = ( result, sign, open ) => {
	const label = sign > 0 ? 'on opening' : 'on closing';
	const visible = result.frames.filter( ( f ) => f.panel > 0 );
	assert.ok( visible.length >= 3, `${ label }: there are no frames with the panel in view` );
	oneWay( result.frames, 'panel', sign, label );
	oneWay( result.frames, 'item', sign, label );
	const moved = visible.filter( ( f ) => f.x !== open.x || f.width !== open.width || f.lines !== open.lines );
	assert.deepEqual( moved.map( ( f ) => `${ f.x }/${ f.width }/${ f.lines }` ), [], `${ label }: the text (open at x/width/lines ${ open.x }/${ open.width }/${ open.lines }) repositions itself` );
	const opacities = visible.map( ( f ) => f.opacity );
	const first = sign > 0 ? opacities[ 0 ] : opacities.at( -1 );
	assert.ok( first < 0.5, `${ label }: the answer does not fade, it starts at opacity ${ first }: ${ opacities.join( ' ' ) }` );
	assert.ok( between( opacities, 0.05, 0.95 ).length >= 3, `${ label }: the opacity jumps: ${ opacities.join( ' ' ) }` );
	oneWay( visible, 'opacity', sign, label, 0.01 );
	oneWay( visible, 'top', -sign, label );
};

run( () =>
	withBrowser( async ( { newPage } ) => {
		// 1 and 2: with motion.
		const page = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		const open = await sample( page );
		const heights = open.frames.map( ( f ) => f.panel );
		const full = Math.max( ...heights );
		assert.ok( full > 150, `the open panel is ${ full } px: the long answer has not been painted` );
		assert.equal( open.hidden, false, 'after opening, the panel still has hidden' );
		assert.equal( open.expanded, 'true', 'after opening, aria-expanded is not "true"' );
		assert.ok( between( heights, 2, full - 2 ).length >= 3, `on opening the height jumps instead of sliding: ${ heights.join( ' ' ) }` );

		const close = await sample( page );
		const closing = close.frames.map( ( f ) => f.panel );
		assert.equal( close.hidden, true, 'after closing, the panel does not have hidden' );
		assert.equal( closing.at( -1 ), 0, `after closing the panel is ${ closing.at( -1 ) } px` );
		assert.ok( between( closing, 2, full - 2 ).length >= 3, `on closing the height jumps instead of sliding: ${ closing.join( ' ' ) }` );

		assert.deepEqual( page.errors, [], page.errors.join( '\n' ) );

		// 3: with "reduce motion", no animation.
		const still = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'reduce' } );
		await still.goto( URL, { waitUntil: 'networkidle' } );
		const jump = await sample( still );
		const stillFull = Math.max( ...jump.frames.map( ( f ) => f.panel ) );
		assert.deepEqual( between( jump.frames.map( ( f ) => f.panel ), 2, stillFull - 2 ), [], `with "reduce motion" the panel animates: ${ show( jump.frames, 'panel' ) }` );
		assert.deepEqual( between( jump.frames.filter( ( f ) => f.panel > 0 ).map( ( f ) => f.opacity ), 0.05, 0.95 ), [], `with "reduce motion" the text fades: ${ show( jump.frames, 'opacity' ) }` );
		assert.equal( jump.hidden, false );

		// 4: with a child that gives margin and padding to the open panel, open and close without jumps.
		const child = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await child.goto( URL, { waitUntil: 'networkidle' } );
		await child.addStyleTag( { content: CHILD_CSS } );
		const opening = await sample( child );
		const end = opening.frames.at( -1 );
		assert.equal( end.opacity, 1, `open, the answer is left at opacity ${ end.opacity }` );
		smooth( opening, 1, end );
		const shutting = await sample( child );
		smooth( shutting, -1, end );
		assert.deepEqual( child.errors, [], child.errors.join( '\n' ) );

		// 5: keyboard and focus, core's.
		const keys = await newPage( { viewport: { width: 400, height: 900 }, reducedMotion: 'no-preference' } );
		await keys.goto( URL, { waitUntil: 'networkidle' } );
		const toggle = keys.locator( '.wp-block-accordion-heading__toggle' ).first();
		await toggle.focus();
		await keys.keyboard.press( 'Enter' );
		await assert.doesNotReject( toggle.and( keys.locator( '[aria-expanded="true"]' ) ).waitFor(), 'Enter does not open' );
		assert.equal( await toggle.evaluate( ( b ) => b === document.activeElement ), true, 'on opening with Enter, focus leaves the button' );
		await keys.keyboard.press( 'Space' );
		await assert.doesNotReject( toggle.and( keys.locator( '[aria-expanded="false"]' ) ).waitFor(), 'Space does not close' );
		assert.equal( await toggle.evaluate( ( b ) => b === document.activeElement ), true, 'on closing with Space, focus leaves the button' );
		assert.deepEqual( keys.errors, [], keys.errors.join( '\n' ) );

		// 6: the "+" turns 135° going through intermediate angles, and back.
		const angles = open.frames.map( ( f ) => f.angle );
		assert.equal( angles.at( -1 ), 135, `open, the "+" is at ${ angles.at( -1 ) }°: ${ angles.join( ' ' ) }` );
		assert.ok( between( angles, 5, 130 ).length >= 3, `the "+" jumps instead of turning: ${ angles.join( ' ' ) }` );
		assert.equal( close.frames.at( -1 ).angle, 0, `closed, the "+" is at ${ close.frames.at( -1 ).angle }°` );
	} )
);
