// NIVEL: BANCO DE TRABAJO — no es una prueba. Herramienta de traducciones del tema.
/**
 * Traducciones del tema: extrae, fusiona y genera. Sin dependencias.
 *
 *     node tools/i18n.mjs
 *
 * 1. Extrae todas las cadenas del dominio «estrategia-web» a languages/estrategia-web.pot:
 *    PHP (__, _e, _x, esc_html__, esc_html_e, esc_attr__, esc_attr_e,
 *    esc_html_x, esc_attr_x), JS (__, _x de wp.i18n), block.json (título,
 *    descripción, palabras clave), theme.json (nombres de presets y de partes),
 *    cabeceras de patterns/*.php y de style.css. Con los contextos que usa
 *    WordPress para cada una (block-i18n.json y theme-i18n.json del núcleo).
 * 2. Fusiona en cada languages/<locale>.po: conserva lo traducido, añade lo
 *    nuevo vacío y marca como obsoleto (#~) lo que ya no existe.
 * 3. Genera languages/<locale>.l10n.php, el formato PHP de WordPress 6.5+ que
 *    se carga sin .mo. Es lo que usa el servidor Y el editor (inc/blocks.php).
 *
 * Cómo se mantiene:
 * - Quién: quien añada o cambie un texto de interfaz. Cuándo: en el MISMO
 *   commit que el texto. Se traduce en el .po (con cualquier editor o Poedit)
 *   y se vuelve a pasar esta herramienta para regenerar el .l10n.php.
 * - Las cadenas se reconocen solo entre COMILLAS SIMPLES y con el dominio
 *   escrito literal ('estrategia-web'). Una cadena con comillas dobles o con el
 *   dominio en una variable no se extrae, y no avisa: es la convención de
 *   WordPress y aquí se cumple siempre.
 * - La trampa: el .l10n.php NO se edita a mano. Se pisa en cada pasada.
 * - El nombre es <locale>.po dentro del tema (es_ES.po), no estrategia-web-es_ES.po:
 *   ver inc/setup.php.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const DOMAIN = 'estrategia-web';
const langDir = path.join( root, 'languages' );

const rel = ( file ) => path.relative( root, file ).split( path.sep ).join( '/' );

function walk( dir, out = [] ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		if ( [ '.git', 'node_modules', 'tests', 'tools', 'languages' ].includes( entry.name ) ) {
			continue;
		}
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			walk( full, out );
		} else {
			out.push( full );
		}
	}
	return out;
}

/** Ordered map key: context + \u0004 + msgid. */
const entries = new Map();
function add( msgid, { context = '', ref = '', comment = '' } = {} ) {
	// Numbers (the spacing presets are named 8, 16, 24...) are not language.
	if ( ! msgid || /^\d+$/.test( msgid ) ) {
		return;
	}
	const key = context ? `${ context }\u0004${ msgid }` : msgid;
	const entry = entries.get( key ) || { msgid, context, refs: [], comments: [] };
	if ( ref && ! entry.refs.includes( ref ) ) {
		entry.refs.push( ref );
	}
	if ( comment && ! entry.comments.includes( comment ) ) {
		entry.comments.push( comment );
	}
	entries.set( key, entry );
}

const unquote = ( s ) => s.replace( /\\(['\\])/g, '$1' );
const lineOf = ( text, index ) => text.slice( 0, index ).split( '\n' ).length;
const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const SIMPLE = new RegExp( `\\b(?:__|_e|esc_html__|esc_html_e|esc_attr__|esc_attr_e)\\(\\s*${ STR }\\s*,\\s*'${ DOMAIN }'\\s*\\)`, 'g' );
const WITH_CONTEXT = new RegExp( `\\b(?:_x|esc_html_x|esc_attr_x)\\(\\s*${ STR }\\s*,\\s*${ STR }\\s*,\\s*'${ DOMAIN }'\\s*\\)`, 'g' );
const TRANSLATORS = /\/\*\s*translators:\s*(.*?)\s*\*\//;

function extractCode( file ) {
	const text = fs.readFileSync( file, 'utf8' );
	const lines = text.split( '\n' );
	const commentFor = ( line ) => {
		const here = lines[ line - 1 ].match( TRANSLATORS ) || ( lines[ line - 2 ] || '' ).match( TRANSLATORS );
		return here ? `translators: ${ here[ 1 ] }` : '';
	};
	for ( const match of text.matchAll( SIMPLE ) ) {
		const line = lineOf( text, match.index );
		add( unquote( match[ 1 ] ), { ref: `${ rel( file ) }:${ line }`, comment: commentFor( line ) } );
	}
	for ( const match of text.matchAll( WITH_CONTEXT ) ) {
		const line = lineOf( text, match.index );
		add( unquote( match[ 1 ] ), { context: unquote( match[ 2 ] ), ref: `${ rel( file ) }:${ line }`, comment: commentFor( line ) } );
	}
}

function extractBlockJson( file ) {
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( data.textdomain !== DOMAIN ) {
		return;
	}
	const ref = rel( file );
	add( data.title, { context: 'block title', ref } );
	add( data.description, { context: 'block description', ref } );
	( data.keywords || [] ).forEach( ( keyword ) => add( keyword, { context: 'block keyword', ref } ) );
}

function extractThemeJson( file ) {
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const ref = rel( file );
	const s = data.settings || {};
	( s.color?.palette || [] ).forEach( ( p ) => add( p.name, { context: 'Color name', ref } ) );
	( s.typography?.fontSizes || [] ).forEach( ( p ) => add( p.name, { context: 'Font size name', ref } ) );
	( s.typography?.fontFamilies || [] ).forEach( ( p ) => add( p.name, { context: 'Font family name', ref } ) );
	( s.spacing?.spacingSizes || [] ).forEach( ( p ) => add( p.name, { context: 'Space size name', ref } ) );
	( data.templateParts || [] ).forEach( ( p ) => add( p.title, { context: 'Template part name', ref } ) );
}

function header( text, name ) {
	const match = text.match( new RegExp( `^[\\s*#@]*${ name }:(.*)$`, 'mi' ) );
	return match ? match[ 1 ].trim() : '';
}

const files = walk( root );
for ( const file of files ) {
	const base = path.basename( file );
	if ( base === 'block.json' ) {
		extractBlockJson( file );
	} else if ( rel( file ) === 'theme.json' ) {
		extractThemeJson( file );
	} else if ( /\.(php|js)$/.test( base ) ) {
		extractCode( file );
	}
	if ( rel( file ).startsWith( 'patterns/' ) && base.endsWith( '.php' ) ) {
		add( header( fs.readFileSync( file, 'utf8' ), 'Title' ), { context: 'Pattern title', ref: rel( file ) } );
	}
}
const styleCss = fs.readFileSync( path.join( root, 'style.css' ), 'utf8' );
add( header( styleCss, 'Theme Name' ), { comment: 'Theme Name of the theme', ref: 'style.css' } );
add( header( styleCss, 'Description' ), { comment: 'Description of the theme', ref: 'style.css' } );

// ---- PO helpers -------------------------------------------------------------

const poString = ( s ) => `"${ s.replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' ).replace( /\n/g, '\\n' ) }"`;
const poUnquote = ( s ) => JSON.parse( s.replace( /\\(?!["\\nt])/g, '\\\\' ) );

function parsePo( text ) {
	const result = new Map();
	let headers = '';
	for ( const block of text.split( /\r?\n\r?\n/ ) ) {
		if ( /^#~/m.test( block ) && ! /^msgid/m.test( block ) ) {
			continue;
		}
		const field = ( name ) => {
			const match = block.match( new RegExp( `^${ name } ("(?:[^"\\\\]|\\\\.)*")((?:\\r?\\n"(?:[^"\\\\]|\\\\.)*")*)`, 'm' ) );
			if ( ! match ) {
				return null;
			}
			const parts = [ match[ 1 ], ...( match[ 2 ].match( /"(?:[^"\\]|\\.)*"/g ) || [] ) ];
			return parts.map( poUnquote ).join( '' );
		};
		const msgid = field( 'msgid' );
		if ( msgid === null ) {
			continue;
		}
		const msgstr = field( 'msgstr' ) || '';
		if ( msgid === '' ) {
			headers = msgstr;
			continue;
		}
		const context = field( 'msgctxt' ) || '';
		result.set( context ? `${ context }\u0004${ msgid }` : msgid, msgstr );
	}
	return { headers, translations: result };
}

function writeEntries( translations ) {
	const out = [];
	for ( const [ key, entry ] of entries ) {
		entry.comments.forEach( ( c ) => out.push( `#. ${ c }` ) );
		if ( entry.refs.length ) {
			out.push( `#: ${ entry.refs.join( ' ' ) }` );
		}
		if ( entry.context ) {
			out.push( `msgctxt ${ poString( entry.context ) }` );
		}
		out.push( `msgid ${ poString( entry.msgid ) }` );
		out.push( `msgstr ${ poString( translations ? translations.get( key ) || '' : '' ) }`, '' );
	}
	return out.join( '\n' );
}

const version = header( styleCss, 'Version' );
const potHeader = [
	'# Copyright (C) Estrategia Web. GPLv2 or later.',
	'# Generated by tools/i18n.mjs. Do not edit by hand.',
	'msgid ""',
	'msgstr ""',
	poString( `Project-Id-Version: Estrategia Web ${ version }\n` ),
	poString( 'MIME-Version: 1.0\n' ),
	poString( 'Content-Type: text/plain; charset=UTF-8\n' ),
	poString( 'Content-Transfer-Encoding: 8bit\n' ),
	poString( `X-Domain: ${ DOMAIN }\n` ),
	'',
].join( '\n' );

fs.mkdirSync( langDir, { recursive: true } );
fs.writeFileSync( path.join( langDir, `${ DOMAIN }.pot` ), `${ potHeader }\n${ writeEntries( null ) }` );

// ---- Merge each <locale>.po and write <locale>.l10n.php ---------------------

const phpString = ( s ) => `'${ s.replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ) }'`;
const phpKey = ( key ) => key.split( '\u0004' ).map( phpString ).join( ' . "\\4" . ' );

for ( const file of fs.readdirSync( langDir ).filter( ( f ) => /^[a-z]{2,3}(_[A-Z]{2})?\.po$/.test( f ) ) ) {
	const locale = file.replace( /\.po$/, '' );
	const { translations } = parsePo( fs.readFileSync( path.join( langDir, file ), 'utf8' ) );
	const obsolete = [ ...translations.keys() ].filter( ( key ) => ! entries.has( key ) && translations.get( key ) );
	const poHeader = [
		'# Generated by tools/i18n.mjs from estrategia-web.pot. Translate here, then run the tool again.',
		'msgid ""',
		'msgstr ""',
		poString( `Project-Id-Version: Estrategia Web ${ version }\n` ),
		poString( `Language: ${ locale }\n` ),
		poString( 'MIME-Version: 1.0\n' ),
		poString( 'Content-Type: text/plain; charset=UTF-8\n' ),
		poString( 'Content-Transfer-Encoding: 8bit\n' ),
		poString( 'Plural-Forms: nplurals=2; plural=(n != 1);\n' ),
		poString( `X-Domain: ${ DOMAIN }\n` ),
		'',
	].join( '\n' );
	const obsoleteText = obsolete
		.map( ( key ) => {
			const [ ctxOrId, maybeId ] = key.split( '\u0004' );
			const lines = maybeId ? [ `#~ msgctxt ${ poString( ctxOrId ) }`, `#~ msgid ${ poString( maybeId ) }` ] : [ `#~ msgid ${ poString( ctxOrId ) }` ];
			return [ ...lines, `#~ msgstr ${ poString( translations.get( key ) ) }`, '' ].join( '\n' );
		} )
		.join( '\n' );
	fs.writeFileSync( path.join( langDir, file ), `${ poHeader }\n${ writeEntries( translations ) }${ obsoleteText ? `\n${ obsoleteText }` : '' }` );

	const messages = [ ...entries.keys() ]
		.filter( ( key ) => translations.get( key ) )
		.map( ( key ) => `\t\t${ phpKey( key ) } => ${ phpString( translations.get( key ) ) },` );
	const php = [
		'<?php',
		'// Generated by tools/i18n.mjs from ' + file + '. Do not edit by hand: edit the .po and run the tool.',
		'return array(',
		`\t'project-id-version' => ${ phpString( `Estrategia Web ${ version }` ) },`,
		`\t'language' => ${ phpString( locale ) },`,
		"\t'plural-forms' => 'nplurals=2; plural=(n != 1);',",
		`\t'x-domain' => '${ DOMAIN }',`,
		"\t'messages' => array(",
		...messages,
		'\t),',
		');',
		'',
	].join( '\n' );
	fs.writeFileSync( path.join( langDir, `${ locale }.l10n.php` ), php );
	const missing = [ ...entries.keys() ].filter( ( key ) => ! translations.get( key ) );
	console.log( `${ locale }: ${ messages.length }/${ entries.size } translated${ missing.length ? `; missing:\n  ${ missing.map( ( k ) => k.replace( '\u0004', ' | ' ) ).join( '\n  ' ) }` : '' }` );
}
console.log( `${ DOMAIN }.pot: ${ entries.size } strings` );
