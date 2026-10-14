// NIVEL: BANCO DE TRABAJO — no es una prueba. Levanta y para el WordPress de pruebas (Playground).
/**
 * WordPress 7.1 local con Playground: el padre, el hijo de prueba y la siembra
 * montados desde este repo. Lo usa tests/run.mjs; también se puede lanzar a
 * mano para mirar la web:
 *
 *     node tests/server.mjs          → http://127.0.0.1:9401/prueba-modulos/
 *
 * Cómo se mantiene / las trampas que costaron la tarde (01-10-2026):
 * - En Windows NO vale --mount=E:/ruta:/wordpress/...: los dos puntos de la
 *   unidad rompen el formato. Se usa --mount-dir <host> <vfs>.
 * - Desde Git Bash, MSYS convierte «/wordpress/...» en
 *   «C:/Program Files/Git/wordpress/...» y Playground monta en un sitio que
 *   no existe SIN dar error. Por eso se lanza desde Node con la lista de
 *   argumentos, no desde una línea de shell.
 * - Matar el proceso padre no mata a los hijos en Windows: stop() usa
 *   taskkill /T /F sobre el árbol entero.
 * - La siembra (blueprint + tests/fixtures/setup/setup.php) se ejecuta en
 *   cada arranque: Playground empieza de cero cada vez.
 * - 1.1.0: los bloques (carrusel, mapa, WhatsApp, selector de idioma) ya no
 *   son del tema: son módulos del PLUGIN Estrategia Web (repo
 *   armazon-wp-sitio), que se monta como plugins/estrategia-web y se activa
 *   con solo esos cuatro módulos (setup.php). Sus pruebas siguen aquí porque
 *   miden los bloques con el CSS del tema. Otra carpeta del plugin:
 *   ESTRATEGIA_WEB_PLUGIN=E:/otra/ruta node tests/run.mjs
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
		throw new Error( `No encuentro el plugin Estrategia Web en ${ PLUGIN } (ESTRATEGIA_WEB_PLUGIN)` );
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
	console.log( `\n${ BASE_URL }/prueba-modulos/  (Ctrl+C para parar)` );
	process.on( 'SIGINT', () => {
		stop( child );
		process.exit( 0 );
	} );
}
