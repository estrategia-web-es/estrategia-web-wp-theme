// NIVEL: WORKBENCH — not a test. Starts and stops the test WordPress (Playground).
/**
 * Local WordPress 7.1 with Playground: the parent theme, the test child theme
 * and the seed, mounted from this repo. Used by tests/run.mjs; it can also be
 * launched by hand to look at the site:
 *
 *     node tests/server.mjs          → http://127.0.0.1:9401/prueba-modulos/
 *
 * How to maintain it / the traps that cost an afternoon (01-10-2026):
 * - On Windows --mount=E:/path:/wordpress/... does NOT work: the drive colon
 *   breaks the format. --mount-dir <host> <vfs> is used instead.
 * - From Git Bash, MSYS turns "/wordpress/..." into
 *   "C:/Program Files/Git/wordpress/..." and Playground mounts at a place that
 *   does not exist WITHOUT any error. That is why it is launched from Node with
 *   an argument list, not from a shell line.
 * - Killing the parent process does not kill its children on Windows: stop()
 *   uses taskkill /T /F on the whole tree.
 * - The seed (blueprint + tests/fixtures/setup/setup.php) runs on every start:
 *   Playground starts from scratch each time.
 * - 1.1.0: the blocks (carousel, map, WhatsApp, language switcher) no longer
 *   belong to the theme: they are modules of the Estrategia Web PLUGIN (repo
 *   armazon-wp-sitio), which is mounted as plugins/estrategia-web and activated
 *   with only those four modules (setup.php). Their tests stay here because
 *   they measure the blocks with the theme's CSS. Another plugin folder:
 *   ESTRATEGIA_WEB_PLUGIN=E:/other/path node tests/run.mjs
 * - Another port (to run several Playgrounds side by side):
 *   ESTRATEGIA_WEB_PORT=9423 node tests/run.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const PLUGIN = process.env.ESTRATEGIA_WEB_PLUGIN || 'E:/Repositories/armazon-wp-sitio';
export const PORT = Number( process.env.ESTRATEGIA_WEB_PORT || 9401 );
export const BASE_URL = `http://127.0.0.1:${ PORT }`;

export function start( { log = false } = {} ) {
	if ( ! fs.existsSync( path.join( PLUGIN, 'estrategia-web.php' ) ) ) {
		throw new Error( `Cannot find the Estrategia Web plugin in ${ PLUGIN } (ESTRATEGIA_WEB_PLUGIN)` );
	}
	const args = [
		'-y',
		'@wp-playground/cli@latest',
		'server',
		'--wp=7.1',
		'--php=8.3',
		`--port=${ PORT }`,
		'--mount-dir', repo, '/wordpress/wp-content/themes/estrategia-web',
		'--mount-dir', path.join( repo, 'tests/fixtures/estrategia-web-hijo-prueba' ), '/wordpress/wp-content/themes/estrategia-web-hijo-prueba',
		'--mount-dir', path.join( repo, 'tests/fixtures/setup' ), '/wordpress/wp-content/estrategia-web-fixtures',
		'--mount-dir', PLUGIN, '/wordpress/wp-content/plugins/estrategia-web',
		`--blueprint=${ path.join( repo, 'tests/fixtures/blueprint.json' ) }`,
		'--login',
	];
	const child = spawn( process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
		cwd: repo,
		shell: process.platform === 'win32',
		env: { ...process.env, MSYS_NO_PATHCONV: '1' },
	} );
	let output = '';
	return new Promise( ( resolve, reject ) => {
		const onData = ( chunk ) => {
			output += chunk;
			if ( log ) {
				process.stdout.write( chunk );
			}
			if ( /Ready!/.test( output ) ) {
				resolve( { child, output: () => output } );
			}
		};
		child.stdout.on( 'data', onData );
		child.stderr.on( 'data', onData );
		child.on( 'exit', ( code ) => reject( new Error( `Playground exited (${ code }) before Ready:\n${ output }` ) ) );
	} );
}

export function stop( child ) {
	if ( ! child || child.exitCode !== null ) {
		return;
	}
	if ( process.platform === 'win32' ) {
		spawnSync( 'taskkill', [ '/pid', String( child.pid ), '/T', '/F' ], { stdio: 'ignore' } );
	} else {
		child.kill();
	}
}

if ( process.argv[ 1 ] && fileURLToPath( import.meta.url ) === path.resolve( process.argv[ 1 ] ) ) {
	const { child } = await start( { log: true } );
	console.log( `\n${ BASE_URL }/prueba-modulos/  (Ctrl+C to stop)` );
	process.on( 'SIGINT', () => {
		stop( child );
		process.exit( 0 );
	} );
}
