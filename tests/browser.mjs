// NIVEL: WORKBENCH — not a test. Utilities shared by the browser tests.
/**
 * Playwright without its own node_modules: it takes portal-hs's copy and the
 * browsers from the shared cache (~/AppData/Local/ms-playwright).
 * If portal-hs moves, the path is changed here and only here.
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const { chromium } = createRequire( 'E:/Repositories/portal-hs/package.json' )( 'playwright' );

export const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:9401';
export const PAGE = `${ BASE_URL }/prueba-modulos/`;
export { assert };

/**
 * Runs fn( { browser, newPage } ) and closes the browser whatever happens.
 * newPage() returns a page in a fresh context (no cookies) that records
 * console errors and page errors in page.errors.
 */
export async function withBrowser( fn ) {
	const browser = await chromium.launch();
	try {
		await fn( {
			browser,
			async newPage( options = {} ) {
				const context = await browser.newContext( options );
				const page = await context.newPage();
				page.errors = [];
				page.on( 'console', ( message ) => {
					if ( message.type() === 'error' ) {
						page.errors.push( `console: ${ message.text() } @ ${ message.location().url }` );
					}
				} );
				page.on( 'pageerror', ( error ) => page.errors.push( `pageerror: ${ error.message }` ) );
				return page;
			},
		} );
	} finally {
		await browser.close();
	}
}

/** Runs a test body and turns any failure into exit code 1 with the message. */
export async function run( body ) {
	try {
		await body();
		process.exit( 0 );
	} catch ( error ) {
		console.error( error.stack || error );
		process.exit( 1 );
	}
}
