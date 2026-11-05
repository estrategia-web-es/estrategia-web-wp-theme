// NIVEL: WORKBENCH — not a test: Playwright for the tests and the tools, on any machine.
//
// It used to come from E:/Repositories/portal-hs, a folder only David's PC
// has. Now it lives in tests/.cache/ (gitignored), installed once with the
// version below, and the repo still has no package.json.
//
// What the first run does, and it needs Internet: npm installs the package and
// Playwright downloads its Chromium to its shared cache
// (~/AppData/Local/ms-playwright on Windows), about 180 MB. The next runs do
// nothing: the «.ready» file says it is done.
//
// How to maintain it:
// - Who and when: whoever needs a newer Playwright changes VERSIONS here AND
//   in the plugin's tests/deps.mjs (armazon-wp-sitio), and runs the tests once.
//   A new version is a new folder, so it installs itself on every machine at
//   its next run; the old folder can be deleted by hand.
// - The criterion: only what a test or a tool imports and the theme does not
//   ship. The Playground CLI is here, pinned like the plugin's (CLI_VERSION in
//   its tests/run.mjs): `@latest` went on to ask for Node 24.18 by itself.
// - Edge case: tests/run.mjs calls ensureTestDeps() before the first test. A
//   tool (static-map, wporg) installs on its first load(), which is fine
//   because it is alone.
// - The trap that hangs: Playwright 1.59.1 on Node 26 downloads Chromium and then
//   stays unpacking it FOREVER, with no error (measured 05-11-2026: 1 h 26 min
//   stopped; the same on Node 24, 18 s). And `winget install OpenJS.NodeJS.LTS`
//   gives Node 26. So the install refuses a Node above MAX_NODE at once. When
//   VERSIONS moves to a Playwright that works there, raise MAX_NODE.
// - The other trap: `npm --prefix <folder>` goes through a shell on Windows and a
//   space in the path («C:/Users/Juan Pérez/…») splits the argument. That is
//   why npm runs with cwd and --prefix «.».
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const VERSIONS = { playwright: '1.59.1', '@wp-playground/cli': '3.1.61' };
const MAX_NODE = 24;

const DIR = path.join( import.meta.dirname, '.cache', `deps-playwright-${ VERSIONS.playwright }-cli-${ VERSIONS[ '@wp-playground/cli' ] }` );
const READY = path.join( DIR, '.ready' );

export function ensureTestDeps() {
	if ( fs.existsSync( READY ) ) {
		return;
	}
	if ( parseInt( process.versions.node, 10 ) > MAX_NODE ) {
		throw new Error( `Node ${ process.versions.node }: Playwright ${ VERSIONS.playwright } hangs installing Chromium above Node ${ MAX_NODE }. Use Node 22 (winget install OpenJS.NodeJS.22). Header of tests/deps.mjs.` );
	}
	const specs = Object.entries( VERSIONS ).map( ( [ name, version ] ) => `${ name }@${ version }` );
	console.log( `· installing ${ specs.join( ' and ' ) } into tests/.cache, and Chromium (once)` );
	fs.mkdirSync( DIR, { recursive: true } );
	const npm = spawnSync( 'npm', [ 'install', '--prefix', '.', '--no-save', '--no-audit', '--no-fund', ...specs ], { cwd: DIR, shell: true, stdio: 'inherit' } );
	if ( npm.status !== 0 ) {
		throw new Error( `could not install ${ specs.join( ' ' ) }` );
	}
	const browser = spawnSync( process.execPath, [ path.join( DIR, 'node_modules', 'playwright', 'cli.js' ), 'install', 'chromium' ], { stdio: 'inherit' } );
	if ( browser.status !== 0 ) {
		throw new Error( "could not download Playwright's Chromium" );
	}
	fs.writeFileSync( READY, '' );
}

export function playgroundCli() {
	ensureTestDeps();
	return path.join( DIR, 'node_modules', '@wp-playground', 'cli', 'wp-playground.js' );
}

export function load( name ) {
	ensureTestDeps();
	return createRequire( path.join( DIR, 'package.json' ) )( name );
}
