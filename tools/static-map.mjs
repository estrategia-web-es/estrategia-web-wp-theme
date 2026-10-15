// NIVEL: WORKBENCH — not a test. Tool: static map image from OpenStreetMap.
/**
 * Generates ONE map image (webp or png) with a marker in the brand colour and
 * "© OpenStreetMap" inside it, for the estrategia-web/map block (attribute
 * staticMapUrl, 0.5.0). It runs ONCE when preparing a site's content; the
 * image is saved in the child theme and served by the site itself: the
 * visitor makes no third-party request until they accept the maps.
 *
 *     node tools/static-map.mjs --direccion "Carrer de Sant Miquel 30, Palma" \
 *          --salida ../web-hijo/assets/maps/sede.webp --color "#0b6e4f"
 *     node tools/static-map.mjs --lat 39.5716 --lon 2.6502 --zoom 16 \
 *          --ancho 800 --alto 450 --escala 2 --salida mapa.png
 *     node tools/static-map.mjs ... --seco      says what it would request, requests nothing
 *     node tools/static-map.mjs --ayuda
 *
 * Options (the flag names are Spanish, the Armazón's tool convention):
 * --lat/--lon or --direccion (address; geocodes with Nominatim, ONE request) ·
 * --zoom (16) · --ancho/--alto (width/height) in CSS px (800×450, 16/9 like
 * the block) · --escala 1|2 (scale; 2: twice the pixels for dense screens) ·
 * --color of the marker (#1a1a1a) · --salida (output) .webp|.png (mapa.webp) ·
 * --contacto (contact) email or URL that goes in the User-Agent (required by
 * the OSM policy; it can also be set in ESTRATEGIA_WEB_OSM_CONTACT).
 *
 * Why this way and not a Google screenshot: Google does not allow saving its
 * maps as an image (licence) and requesting them when the page is visited
 * sends the visitor's IP to Google without consent. OSM data is ODbL and its
 * tiles can be used crediting "© OpenStreetMap"; here the credit goes INSIDE
 * the image, so it travels with the file wherever it goes.
 *
 * How it works: Node downloads the tiles (tile.openstreetmap.org, one at a
 * time) and hands them to a Playwright Chromium (portal-hs's, like the tests),
 * which composes them on a <canvas>, paints the marker and the credit, and
 * exports to webp/png. Chromium acts as decoder, typography and encoder: zero
 * dependencies of our own.
 *
 * How to maintain:
 * - Who: whoever prepares a site with a map. When: when a location is added
 *   or moved. The resulting image goes to the CHILD's REPO (assets/maps/), not
 *   here.
 * - The OSM tile policy (operations.osmfoundation.org/policies/tiles) is the
 *   limit: own User-Agent, no bulk downloads, with a cache. Hence: a cap of
 *   MAX_TILES tiles per image, one at a time, and a cache in tools/.cache/
 *   (ignored by git) that is reused for 7 days. If an image needs more tiles,
 *   lower the size or the scale; do NOT raise the cap.
 * - Edge case: --escala 2 uses tiles from the next zoom level for the same
 *   area, so street labels come out at half size on screen. For a city
 *   location (zoom 16) they are readable; if not, --escala 1.
 * - The trap: Nominatim returns the FIRST result and sometimes it is another
 *   street with the same name in another town. The tool prints what it found
 *   (name and coordinates): check it before accepting the image, and if it
 *   does not match pass --lat/--lon by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const VERSION = '0.5.0';
const MAX_TILES = 40;
const CACHE_DAYS = 7;
const TILE_URL = ( z, x, y ) => `https://tile.openstreetmap.org/${ z }/${ x }/${ y }.png`;
const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const cacheDir = path.join( root, 'tools', '.cache', 'osm-tiles' );

const HELP = `Static map image (OpenStreetMap) for estrategia-web/map.

  node tools/static-map.mjs (--lat N --lon N | --direccion "...") [options]

  --zoom N         zoom level (16)
  --ancho N        width in CSS px (800)
  --alto N         height in CSS px (450)
  --escala 1|2     pixel density (2)
  --color #hex     marker colour (#1a1a1a)
  --salida f       .webp or .png file (mapa.webp)
  --contacto c     email or URL for the User-Agent (or ESTRATEGIA_WEB_OSM_CONTACT)
  --direccion "…"  address to geocode with Nominatim (1 request)
  --seco           dry run: says which tiles it would request and requests nothing
  --ayuda          this help

Exits with 0 if it writes the image and with 1 if anything fails.`;

/** Parses --name value pairs and bare --flags. */
function parseArgs( argv ) {
	const args = {};
	for ( let i = 0; i < argv.length; i++ ) {
		const key = argv[ i ].replace( /^--/, '' );
		const next = argv[ i + 1 ];
		if ( next === undefined || next.startsWith( '--' ) ) {
			args[ key ] = true;
		} else {
			args[ key ] = next;
			i++;
		}
	}
	return args;
}

const fail = ( message ) => {
	console.error( `✗ ${ message }` );
	process.exit( 1 );
};

/** Web Mercator: lat/lon to world pixel coordinates at a zoom level (256 px tiles). */
export function project( lat, lon, zoom ) {
	const size = 256 * 2 ** zoom;
	const sin = Math.sin( ( lat * Math.PI ) / 180 );
	return {
		x: ( ( lon + 180 ) / 360 ) * size,
		y: ( 0.5 - Math.log( ( 1 + sin ) / ( 1 - sin ) ) / ( 4 * Math.PI ) ) * size,
	};
}

/** Tiles needed to cover a width×height image centred on a world pixel. */
export function tilesFor( center, width, height, zoom ) {
	const left = center.x - width / 2;
	const top = center.y - height / 2;
	const max = 2 ** zoom - 1;
	const tiles = [];
	for ( let ty = Math.floor( top / 256 ); ty <= Math.floor( ( top + height - 1 ) / 256 ); ty++ ) {
		for ( let tx = Math.floor( left / 256 ); tx <= Math.floor( ( left + width - 1 ) / 256 ); tx++ ) {
			if ( ty < 0 || ty > max ) {
				continue;
			}
			const wrapped = ( ( tx % ( max + 1 ) ) + max + 1 ) % ( max + 1 );
			tiles.push( { z: zoom, x: wrapped, y: ty, dx: tx * 256 - left, dy: ty * 256 - top } );
		}
	}
	return tiles;
}

const userAgent = ( contact ) =>
	`estrategia-web-static-map/${ VERSION } (one-off static map for a website${ contact ? `; ${ contact }` : '' })`;

async function geocode( address, contact ) {
	const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${ encodeURIComponent( address ) }`;
	const response = await fetch( url, { headers: { 'User-Agent': userAgent( contact ), 'Accept-Language': 'es' } } );
	if ( ! response.ok ) {
		fail( `Nominatim answered ${ response.status } for "${ address }"` );
	}
	const [ hit ] = await response.json();
	if ( ! hit ) {
		fail( `Nominatim cannot find "${ address }". Pass --lat and --lon.` );
	}
	console.log( `  found: ${ hit.display_name }\n  at ${ hit.lat }, ${ hit.lon } — check that it is the right place` );
	return { lat: Number( hit.lat ), lon: Number( hit.lon ) };
}

async function tile( { z, x, y }, contact ) {
	const file = path.join( cacheDir, String( z ), String( x ), `${ y }.png` );
	if ( fs.existsSync( file ) && Date.now() - fs.statSync( file ).mtimeMs < CACHE_DAYS * 864e5 ) {
		return fs.readFileSync( file );
	}
	const response = await fetch( TILE_URL( z, x, y ), { headers: { 'User-Agent': userAgent( contact ) } } );
	if ( ! response.ok ) {
		fail( `tile ${ z }/${ x }/${ y } answered ${ response.status }` );
	}
	const body = Buffer.from( await response.arrayBuffer() );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, body );
	return body;
}

/** Composes tiles, marker and attribution in Chromium and returns the encoded image. */
async function compose( { tiles, width, height, scale, color, type } ) {
	const { chromium } = createRequire( 'E:/Repositories/portal-hs/package.json' )( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const dataUrl = await page.evaluate(
			async ( { tiles, width, height, scale, color, type } ) => {
				const canvas = document.createElement( 'canvas' );
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext( '2d' );
				ctx.fillStyle = '#f2efe9';
				ctx.fillRect( 0, 0, width, height );
				for ( const t of tiles ) {
					const image = new Image();
					image.src = `data:image/png;base64,${ t.png }`;
					await image.decode();
					ctx.drawImage( image, Math.round( t.dx ), Math.round( t.dy ) );
				}
				// Marker: a drop with its tip at the exact centre of the map.
				const cx = width / 2;
				const cy = height / 2;
				const r = 14 * scale;
				ctx.save();
				ctx.shadowColor = 'rgba(0,0,0,.35)';
				ctx.shadowBlur = 4 * scale;
				ctx.shadowOffsetY = 1 * scale;
				ctx.beginPath();
				ctx.moveTo( cx, cy );
				ctx.bezierCurveTo( cx - r * 0.35, cy - r * 0.9, cx - r, cy - r * 1.3, cx - r, cy - r * 2.1 );
				ctx.arc( cx, cy - r * 2.1, r, Math.PI, 0 );
				ctx.bezierCurveTo( cx + r, cy - r * 1.3, cx + r * 0.35, cy - r * 0.9, cx, cy );
				ctx.closePath();
				ctx.fillStyle = color;
				ctx.fill();
				ctx.restore();
				ctx.lineWidth = 2 * scale;
				ctx.strokeStyle = '#ffffff';
				ctx.stroke();
				ctx.beginPath();
				ctx.arc( cx, cy - r * 2.1, r * 0.4, 0, Math.PI * 2 );
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				// The credit, bottom right, as OSM maps place it.
				const text = '© OpenStreetMap';
				ctx.font = `${ 12 * scale }px system-ui, -apple-system, "Segoe UI", sans-serif`;
				const pad = 4 * scale;
				const w = ctx.measureText( text ).width + pad * 2;
				const h = 18 * scale;
				ctx.fillStyle = 'rgba(255,255,255,.85)';
				ctx.fillRect( width - w, height - h, w, h );
				ctx.fillStyle = '#333333';
				ctx.textBaseline = 'middle';
				ctx.fillText( text, width - w + pad, height - h / 2 );
				return canvas.toDataURL( type, 0.86 );
			},
			{ tiles, width, height, scale, color, type }
		);
		return Buffer.from( dataUrl.split( ',' )[ 1 ], 'base64' );
	} finally {
		await browser.close();
	}
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( args.ayuda || process.argv.length <= 2 ) {
		console.log( HELP );
		return;
	}
	const zoom = Number( args.zoom ?? 16 );
	const scale = Number( args.escala ?? 2 );
	const width = Number( args.ancho ?? 800 );
	const height = Number( args.alto ?? 450 );
	const color = String( args.color ?? '#1a1a1a' );
	const output = path.resolve( String( args.salida ?? 'mapa.webp' ) );
	const contact = args.contacto || process.env.ESTRATEGIA_WEB_OSM_CONTACT || '';
	const ext = path.extname( output ).toLowerCase();
	const type = { '.webp': 'image/webp', '.png': 'image/png' }[ ext ];

	if ( ! type ) fail( `--salida must end in .webp or .png (it is "${ ext || 'no extension' }")` );
	if ( ! [ 1, 2 ].includes( scale ) ) fail( '--escala is 1 or 2' );
	if ( ! Number.isInteger( zoom ) || zoom < 1 || zoom + Math.log2( scale ) > 19 ) fail( '--zoom between 1 and 19 (18 with --escala 2)' );
	if ( ! ( width >= 64 && height >= 64 && width <= 2000 && height <= 2000 ) ) fail( '--ancho and --alto between 64 and 2000' );
	if ( ! /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test( color ) ) fail( `--color must be #rgb or #rrggbb ("${ color }")` );

	let lat = Number( args.lat );
	let lon = Number( args.lon );
	if ( args.direccion ) {
		if ( args.seco ) {
			console.log( `  [dry run] would geocode "${ args.direccion }" with Nominatim (1 request)` );
			lat = 39.5696;
			lon = 2.6502;
		} else {
			( { lat, lon } = await geocode( String( args.direccion ), contact ) );
		}
	}
	if ( ! Number.isFinite( lat ) || ! Number.isFinite( lon ) || Math.abs( lat ) > 85 || Math.abs( lon ) > 180 ) {
		fail( 'the place is missing: --lat and --lon, or --direccion' );
	}

	const tileZoom = zoom + Math.log2( scale );
	const pxWidth = width * scale;
	const pxHeight = height * scale;
	const tiles = tilesFor( project( lat, lon, tileZoom ), pxWidth, pxHeight, tileZoom );
	if ( tiles.length > MAX_TILES ) {
		fail( `${ tiles.length } tiles would be needed and the cap is ${ MAX_TILES } (OSM policy): lower --ancho/--alto or --escala` );
	}
	const cached = tiles.filter( ( t ) => fs.existsSync( path.join( cacheDir, String( t.z ), String( t.x ), `${ t.y }.png` ) ) ).length;
	console.log( `  ${ pxWidth }×${ pxHeight } px, zoom ${ zoom } (tiles from ${ tileZoom }): ${ tiles.length } tiles, ${ cached } cached` );
	if ( args.seco ) {
		tiles.forEach( ( t ) => console.log( `  [dry run] ${ TILE_URL( t.z, t.x, t.y ) }` ) );
		return;
	}

	const loaded = [];
	for ( const t of tiles ) {
		loaded.push( { ...t, png: ( await tile( t, contact ) ).toString( 'base64' ) } );
	}
	const image = await compose( { tiles: loaded, width: pxWidth, height: pxHeight, scale, color, type } );
	fs.mkdirSync( path.dirname( output ), { recursive: true } );
	fs.writeFileSync( output, image );
	console.log( `✓ ${ output } (${ Math.round( image.length / 1024 ) } KB). Block attributes: "staticMapUrl" with its URL or path in the child.` );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().catch( ( error ) => fail( error.stack || error ) );
}
