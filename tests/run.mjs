// NIVEL: WORKBENCH — not a test. Test runner by levels (row 7 of the Armazón).
/**
 *     node tests/run.mjs            starts Playground, runs everything, stops it
 *     node tests/run.mjs accordion  only the tests whose name contains "accordion"
 *     ESTRATEGIA_WEB_BASE_URL=http://127.0.0.1:9401 node tests/run.mjs
 *                                   uses a WordPress that is already running (node tests/server.mjs)
 *
 * How it works and how to maintain it:
 * - It discovers tests/*.test.mjs; there is NO list. The first line of each test
 *   states its level with "// NIVEL: n — ...". A test without a level is not run
 *   and STOPS everything: a test that does not run looks like it covers something.
 * - Order 1 → 2 → 3, and it stops at the first one that fails.
 * - Each test is a separate process that receives BASE_URL and exits with 0 or 1.
 * - The trap: Playground takes ~1 minute to start (it downloads WordPress and the
 *   translation the first time). To iterate, start it once with
 *   tests/server.mjs and pass ESTRATEGIA_WEB_BASE_URL.
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
			console.error( `✗ ${ file }: the first line does not declare "// NIVEL: n — ...". Nothing is run.` );
			process.exit( 1 );
		}
		return { file, level: Number( match[ 1 ] ) };
	} )
	.sort( ( a, b ) => a.level - b.level || a.file.localeCompare( b.file ) );

let server = null;
let baseUrl = process.env.ESTRATEGIA_WEB_BASE_URL;
let failed = false;
try {
	if ( ! baseUrl && tests.some( ( t ) => t.level >= 2 ) ) {
		console.log( 'Starting WordPress (Playground)…' );
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
