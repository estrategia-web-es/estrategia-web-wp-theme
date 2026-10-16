// NIVEL: 1 — no browser or WordPress. Every languages/<locale>.po of the theme (es_ES, ca…) has every string of the .pot translated, keeps its placeholders and is generated into its .l10n.php.
/**
 * Why: an empty string is not written to the .l10n.php (tools/i18n.mjs), so
 * the site shows it in English with no warning. This is what stops a
 * half-translated language from being committed.
 *
 * Seen in red on 16-10-2026 with languages/ca.po just created by
 * `node tools/i18n.mjs new ca` (27 empty strings).
 *
 * How to maintain: nothing to list, it reads every <locale>.po. If it goes
 * red after adding or changing a text: `node tools/i18n.mjs`, translate what
 * the tool lists as missing and run it again.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const langDir = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'languages' );
const unquote = ( s ) => JSON.parse( s.replace( /\\(?!["\\nt])/g, '\\\\' ) );

/** Map of context|msgid → msgstr (the tool writes every field on a single line). */
function read( file ) {
	const out = new Map();
	for ( const block of fs.readFileSync( path.join( langDir, file ), 'utf8' ).split( /\r?\n\r?\n/ ) ) {
		if ( /^#~/m.test( block ) ) {
			continue;
		}
		const field = ( name ) => {
			const m = block.match( new RegExp( `^${ name } (".*")$`, 'm' ) );
			return m ? unquote( m[ 1 ] ) : null;
		};
		const msgid = field( 'msgid' );
		if ( msgid ) {
			out.set( `${ field( 'msgctxt' ) || '' }|${ msgid }`, field( 'msgstr' ) || '' );
		}
	}
	return out;
}

const placeholders = ( s ) => [ ...s.matchAll( /%(?:\d+\$)?[sd]/g ) ].map( ( m ) => m[ 0 ] ).sort().join( ' ' );
const pot = read( 'estrategia-web.pot' );
const locales = fs.readdirSync( langDir ).filter( ( f ) => /^[a-z]{2,3}(_[A-Z]{2})?\.po$/.test( f ) );
assert.ok( locales.includes( 'es_ES.po' ) && locales.includes( 'ca.po' ), `es_ES and ca expected, found: ${ locales.join( ', ' ) }` );

for ( const file of locales ) {
	const po = read( file );
	const missing = [ ...pot.keys() ].filter( ( k ) => ! po.get( k ) );
	assert.deepEqual( missing, [], `${ file }: untranslated (run node tools/i18n.mjs)` );
	const broken = [ ...pot.keys() ].filter( ( k ) => placeholders( po.get( k ) ) !== placeholders( k.split( '|' ).slice( 1 ).join( '|' ) ) );
	assert.deepEqual( broken, [], `${ file }: placeholders lost` );
	const php = path.join( langDir, file.replace( /\.po$/, '.l10n.php' ) );
	assert.ok( fs.existsSync( php ), `${ path.basename( php ) } is missing: node tools/i18n.mjs` );
	const count = ( fs.readFileSync( php, 'utf8' ).match( /^\t\t'/gm ) || [] ).length;
	assert.equal( count, pot.size, `${ path.basename( php ) } is behind the .po: node tools/i18n.mjs` );
	console.log( `✓ ${ file }: ${ count }/${ pot.size }` );
}
