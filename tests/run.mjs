// NIVEL: BANCO DE TRABAJO — no es una prueba. Corredor de pruebas por niveles (fila 7 del Armazón).
/**
 *     node tests/run.mjs            levanta Playground, corre todo, lo para
 *     node tests/run.mjs carousel   solo las pruebas cuyo nombre contiene «carousel»
 *     ARMAZON_BASE_URL=http://127.0.0.1:9401 node tests/run.mjs
 *                                   usa un WordPress ya levantado (node tests/server.mjs)
 *
 * Cómo funciona y cómo se mantiene:
 * - Descubre tests/*.test.mjs; NO hay lista. La primera línea de cada prueba
 *   dice su nivel con «// NIVEL: n — ...». Una prueba sin nivel no se corre y
 *   PARA todo: una prueba que no corre parece que cubre algo.
 * - Orden 1 → 2 → 3 y se para en la primera que falle.
 * - Cada prueba es un proceso aparte que recibe BASE_URL y sale con 0 o 1.
 * - La trampa: Playground tarda ~1 minuto en arrancar (descarga WordPress y la
 *   traducción la primera vez). Para iterar, se levanta una vez con
 *   tests/server.mjs y se pasa ARMAZON_BASE_URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { start, stop, BASE_URL } from './server.mjs';

const dir = path.dirname( fileURLToPath( import.meta.url ) );
const filter = process.argv[ 2 ] || '';

const tests = fs
	.readdirSync( dir )
	.filter( ( file ) => file.endsWith( '.test.mjs' ) && file.includes( filter ) )
	.map( ( file ) => {
		const first = fs.readFileSync( path.join( dir, file ), 'utf8' ).split( '\n' )[ 0 ];
		const match = first.match( /^\/\/ NIVEL: (\d) — / );
		if ( ! match ) {
			console.error( `✗ ${ file }: la primera línea no declara «// NIVEL: n — ...». No se corre nada.` );
			process.exit( 1 );
		}
		return { file, level: Number( match[ 1 ] ) };
	} )
	.sort( ( a, b ) => a.level - b.level || a.file.localeCompare( b.file ) );

let server = null;
let baseUrl = process.env.ARMAZON_BASE_URL;
let failed = false;
try {
	if ( ! baseUrl && tests.some( ( t ) => t.level >= 2 ) ) {
		console.log( 'Levantando WordPress (Playground)…' );
		server = ( await start() ).child;
		baseUrl = BASE_URL;
	}
	for ( const test of tests ) {
		const started = Date.now();
		const result = spawnSync( process.execPath, [ path.join( dir, test.file ) ], {
			env: { ...process.env, BASE_URL: baseUrl },
			encoding: 'utf8',
		} );
		const seconds = ( ( Date.now() - started ) / 1000 ).toFixed( 1 );
		if ( result.status === 0 ) {
			console.log( `✓ [${ test.level }] ${ test.file } (${ seconds } s)` );
			continue;
		}
		console.log( `✗ [${ test.level }] ${ test.file } (${ seconds } s)\n${ result.stdout }${ result.stderr }` );
		failed = true;
		break;
	}
} finally {
	stop( server );
}
process.exit( failed ? 1 : 0 );
