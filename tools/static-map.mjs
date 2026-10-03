// NIVEL: BANCO DE TRABAJO — no es una prueba. Herramienta: imagen estática de un mapa a partir de OpenStreetMap.
/**
 * Genera UNA imagen de mapa (webp o png) con un marcador del color de la marca
 * y «© OpenStreetMap» dentro, para el bloque armazon/map (atributo
 * staticMapUrl, 0.5.0). Se ejecuta UNA vez al preparar el contenido de una
 * web; la imagen se guarda en el hijo y la sirve el propio sitio: el
 * visitante no hace ninguna petición a terceros hasta que acepta los mapas.
 *
 *     node tools/static-map.mjs --direccion "Carrer de Sant Miquel 30, Palma" \
 *          --salida ../web-hijo/assets/maps/sede.webp --color "#0b6e4f"
 *     node tools/static-map.mjs --lat 39.5716 --lon 2.6502 --zoom 16 \
 *          --ancho 800 --alto 450 --escala 2 --salida mapa.png
 *     node tools/static-map.mjs ... --seco      dice qué pediría, sin pedir nada
 *     node tools/static-map.mjs --ayuda
 *
 * Opciones: --lat/--lon o --direccion (geocodifica con Nominatim, UNA
 * petición) · --zoom (16) · --ancho/--alto en px CSS (800×450, 16/9 como el
 * bloque) · --escala 1|2 (2: el doble de píxeles para pantallas densas) ·
 * --color del marcador (#1a1a1a) · --salida .webp|.png (mapa.webp) ·
 * --contacto correo o URL que va en el User-Agent (lo pide la política de
 * OSM; también se puede poner en ARMAZON_OSM_CONTACT).
 *
 * Por qué así y no una captura de Google: Google no permite guardar sus
 * mapas como imagen (licencia) y pedirlos al visitar la página manda su IP a
 * Google sin consentimiento. Los datos de OSM son ODbL y sus teselas se
 * pueden usar citando «© OpenStreetMap»; aquí la cita va DENTRO de la imagen,
 * así viaja con el fichero vaya donde vaya.
 *
 * Cómo funciona: Node descarga las teselas (tile.openstreetmap.org, de una en
 * una) y las pasa a un Chromium de Playwright (el de portal-hs, como las
 * pruebas), que las compone en un <canvas>, pinta el marcador y la cita, y
 * exporta a webp/png. Chromium hace de decodificador, de tipografía y de
 * codificador: cero dependencias propias.
 *
 * Cómo se mantiene:
 * - Quién: quien prepare una web con mapa. Cuándo: al dar de alta o mover una
 *   sede. La imagen resultante va al REPO DEL HIJO (assets/maps/), no aquí.
 * - La política de teselas de OSM (operations.osmfoundation.org/policies/
 *   tiles) es el límite: User-Agent propio, sin descargas masivas, con caché.
 *   Por eso: tope de MAX_TILES teselas por imagen, de una en una, y caché en
 *   tools/.cache/ (ignorada por git) que se reutiliza durante 7 días. Si una
 *   imagen necesita más teselas, se baja el tamaño o la escala; NO se sube
 *   el tope.
 * - Caso frontera: --escala 2 usa teselas del zoom siguiente para la misma
 *   zona, así que los rótulos de las calles salen a la mitad de tamaño en
 *   pantalla. En una sede de ciudad (zoom 16) se leen; si no, --escala 1.
 * - La trampa: Nominatim devuelve el PRIMER resultado y a veces es otra calle
 *   con el mismo nombre en otro pueblo. La herramienta imprime lo que ha
 *   encontrado (nombre y coordenadas): se mira antes de dar la imagen por
 *   buena, y si no cuadra se pasan --lat/--lon a mano.
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

const HELP = `Imagen estática de un mapa (OpenStreetMap) para armazon/map.

  node tools/static-map.mjs (--lat N --lon N | --direccion "...") [opciones]

  --zoom N         nivel de zoom (16)
  --ancho N        ancho en px CSS (800)
  --alto N         alto en px CSS (450)
  --escala 1|2     densidad de píxeles (2)
  --color #hex     color del marcador (#1a1a1a)
  --salida f       fichero .webp o .png (mapa.webp)
  --contacto c     correo o URL para el User-Agent (o ARMAZON_OSM_CONTACT)
  --seco           dice qué teselas pediría y no pide nada
  --ayuda          esto

Sale con 0 si escribe la imagen y con 1 si algo falla.`;

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
	`armazon-static-map/${ VERSION } (one-off static map for a website${ contact ? `; ${ contact }` : '' })`;

async function geocode( address, contact ) {
	const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${ encodeURIComponent( address ) }`;
	const response = await fetch( url, { headers: { 'User-Agent': userAgent( contact ), 'Accept-Language': 'es' } } );
	if ( ! response.ok ) {
		fail( `Nominatim respondió ${ response.status } para «${ address }»` );
	}
	const [ hit ] = await response.json();
	if ( ! hit ) {
		fail( `Nominatim no encuentra «${ address }». Pasa --lat y --lon.` );
	}
	console.log( `  encontrado: ${ hit.display_name }\n  en ${ hit.lat }, ${ hit.lon } — mira que sea el sitio` );
	return { lat: Number( hit.lat ), lon: Number( hit.lon ) };
}

async function tile( { z, x, y }, contact ) {
	const file = path.join( cacheDir, String( z ), String( x ), `${ y }.png` );
	if ( fs.existsSync( file ) && Date.now() - fs.statSync( file ).mtimeMs < CACHE_DAYS * 864e5 ) {
		return fs.readFileSync( file );
	}
	const response = await fetch( TILE_URL( z, x, y ), { headers: { 'User-Agent': userAgent( contact ) } } );
	if ( ! response.ok ) {
		fail( `la tesela ${ z }/${ x }/${ y } respondió ${ response.status }` );
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
				// Marcador: una gota con la punta en el centro exacto del mapa.
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
				// La cita, abajo a la derecha, como la ponen los mapas de OSM.
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
	const contact = args.contacto || process.env.ARMAZON_OSM_CONTACT || '';
	const ext = path.extname( output ).toLowerCase();
	const type = { '.webp': 'image/webp', '.png': 'image/png' }[ ext ];

	if ( ! type ) fail( `--salida tiene que acabar en .webp o .png (es «${ ext || 'sin extensión' }»)` );
	if ( ! [ 1, 2 ].includes( scale ) ) fail( '--escala es 1 o 2' );
	if ( ! Number.isInteger( zoom ) || zoom < 1 || zoom + Math.log2( scale ) > 19 ) fail( '--zoom entre 1 y 19 (18 con --escala 2)' );
	if ( ! ( width >= 64 && height >= 64 && width <= 2000 && height <= 2000 ) ) fail( '--ancho y --alto entre 64 y 2000' );
	if ( ! /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test( color ) ) fail( `--color tiene que ser #rgb o #rrggbb («${ color }»)` );

	let lat = Number( args.lat );
	let lon = Number( args.lon );
	if ( args.direccion ) {
		if ( args.seco ) {
			console.log( `  [seco] geocodificaría «${ args.direccion }» con Nominatim (1 petición)` );
			lat = 39.5696;
			lon = 2.6502;
		} else {
			( { lat, lon } = await geocode( String( args.direccion ), contact ) );
		}
	}
	if ( ! Number.isFinite( lat ) || ! Number.isFinite( lon ) || Math.abs( lat ) > 85 || Math.abs( lon ) > 180 ) {
		fail( 'falta el sitio: --lat y --lon, o --direccion' );
	}

	const tileZoom = zoom + Math.log2( scale );
	const pxWidth = width * scale;
	const pxHeight = height * scale;
	const tiles = tilesFor( project( lat, lon, tileZoom ), pxWidth, pxHeight, tileZoom );
	if ( tiles.length > MAX_TILES ) {
		fail( `harían falta ${ tiles.length } teselas y el tope es ${ MAX_TILES } (política de OSM): baja --ancho/--alto o --escala` );
	}
	const cached = tiles.filter( ( t ) => fs.existsSync( path.join( cacheDir, String( t.z ), String( t.x ), `${ t.y }.png` ) ) ).length;
	console.log( `  ${ pxWidth }×${ pxHeight } px, zoom ${ zoom } (teselas del ${ tileZoom }): ${ tiles.length } teselas, ${ cached } en caché` );
	if ( args.seco ) {
		tiles.forEach( ( t ) => console.log( `  [seco] ${ TILE_URL( t.z, t.x, t.y ) }` ) );
		return;
	}

	const loaded = [];
	for ( const t of tiles ) {
		loaded.push( { ...t, png: ( await tile( t, contact ) ).toString( 'base64' ) } );
	}
	const image = await compose( { tiles: loaded, width: pxWidth, height: pxHeight, scale, color, type } );
	fs.mkdirSync( path.dirname( output ), { recursive: true } );
	fs.writeFileSync( output, image );
	console.log( `✓ ${ output } (${ Math.round( image.length / 1024 ) } KB). Atributos del bloque: "staticMapUrl" con su URL o ruta en el hijo.` );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().catch( ( error ) => fail( error.stack || error ) );
}
