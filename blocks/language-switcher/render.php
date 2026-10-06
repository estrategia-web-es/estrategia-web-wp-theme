<?php
/**
 * armazon/language-switcher — selector de idioma (0.7.6).
 *
 * Qué pinta: un BOTÓN con el idioma actual («ES» y una flecha) y, al
 * pulsarlo, una lista de enlaces a la MISMA página en los otros idiomas:
 *
 *     <div class="armazon-language">
 *       <button aria-expanded="false" aria-controls="…">ES</button>
 *       <ul id="…" hidden><li><a href="/en/…" hreflang="en" lang="en">English</a></li></ul>
 *     </div>
 *
 * Los idiomas y sus URL los da WPML (filtro wpml_active_languages). SIN WPML,
 * o con un solo idioma activo, NO SE PINTA NADA: un selector con un idioma no
 * sirve, y una web monolingüe no tiene por qué saber que existe este bloque.
 *
 * Decisiones:
 * - Botón con aria-expanded y una lista de enlaces, no un <select>: cambiar de
 *   idioma es navegar, y un enlace con hreflang y lang es lo que entienden un
 *   lector de pantalla y un buscador. Y no <details>: su <summary> no dice
 *   «expandido/contraído» en todos los lectores, que es el motivo de que el
 *   hijo de Lavandería tuviera uno y se haya sustituido por este.
 * - Interactivity API (view.js), como el resto de bloques del padre: abre y
 *   cierra, se cierra con Escape (y el foco vuelve al botón) y al pulsar
 *   fuera. Sin JavaScript la lista no se abre; el idioma actual se sigue
 *   viendo.
 * - Cada enlace lleva el nombre del idioma EN ESE IDIOMA («English», no
 *   «Inglés»): quien busca su idioma lo reconoce así.
 * - skip_missing 0: si la página no está traducida, WPML da la portada de ese
 *   idioma. Mejor llegar a la portada en inglés que no poder cambiar.
 * - Sin estilos de marca: la hoja solo coloca la lista. El hijo pone el
 *   aspecto sobre .armazon-language (Lavandería: theme/assets/css/header.css),
 *   también la flecha (.armazon-language__toggle::after).
 *
 * Cómo se mantiene:
 * - Quién: quien toque la cabecera de una web con WPML. Cuándo: al añadir un
 *   idioma no hay que tocar nada (sale de WPML); al cambiar el marcado, en el
 *   mismo commit, tests/language-switcher.test.mjs del hijo que lo use.
 * - Caso frontera: el código que se enseña es el de WPML en mayúsculas
 *   («ES»); si una web quiere «Español», atributo display: name. Las banderas
 *   NO: son países, no idiomas.
 * - La trampa: en el editor (ServerSideRender, petición REST) WPML puede
 *   decir que no hay idiomas y el bloque sale vacío. No es un fallo: en la web
 *   sí sale. Y con dos bloques en la misma página, el id de la lista se
 *   distingue con wp_unique_id(); nunca un id fijo.
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

$armazon_languages = apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) );
if ( ! is_array( $armazon_languages ) || count( $armazon_languages ) < 2 ) {
	return;
}

$armazon_current = null;
$armazon_others  = array();
foreach ( $armazon_languages as $armazon_language ) {
	if ( ! empty( $armazon_language['active'] ) ) {
		$armazon_current = $armazon_language;
	} else {
		$armazon_others[] = $armazon_language;
	}
}
if ( ! $armazon_current || ! $armazon_others ) {
	return;
}

$armazon_name    = static fn( array $l ): string => (string) ( $l['native_name'] ?? $l['translated_name'] ?? strtoupper( (string) $l['code'] ) );

// «inline» (0.7.7): todos los idiomas en línea, «EN – ES», sin desplegable; el
// actual marcado con aria-current y el resto enlazados. Para el menú del móvil:
// David, 06-10-2026, «el selector de idioma en mobile es feo, puedes poner
// EN - ES (sin desplegable)». El orden es el de WPML. Sin JS.
if ( 'inline' === ( $attributes['layout'] ?? 'dropdown' ) ) {
	$armazon_text = static fn( array $l ): string => 'name' === ( $attributes['display'] ?? 'code' ) ? $armazon_name( $l ) : strtoupper( (string) $l['code'] );
	$armazon_wrap = get_block_wrapper_attributes(
		array(
			'class'      => 'armazon-language armazon-language--inline',
			'aria-label' => __( 'Language', 'armazon' ),
		)
	);
	echo '<nav ' . $armazon_wrap . '><ul class="armazon-language__inline">'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped by core.
	foreach ( $armazon_languages as $armazon_language ) {
		$armazon_code = (string) $armazon_language['code'];
		$armazon_full = $armazon_name( $armazon_language );
		if ( ! empty( $armazon_language['active'] ) ) {
			printf( '<li><span aria-current="true" lang="%1$s" title="%2$s">%3$s</span></li>', esc_attr( $armazon_code ), esc_attr( $armazon_full ), esc_html( $armazon_text( $armazon_language ) ) );
		} else {
			printf( '<li><a href="%1$s" hreflang="%2$s" lang="%2$s" aria-label="%3$s">%4$s</a></li>', esc_url( (string) $armazon_language['url'] ), esc_attr( $armazon_code ), esc_attr( $armazon_full ), esc_html( $armazon_text( $armazon_language ) ) );
		}
	}
	echo '</ul></nav>';
	return;
}
$armazon_label   = 'name' === ( $attributes['display'] ?? 'code' ) ? $armazon_name( $armazon_current ) : strtoupper( (string) $armazon_current['code'] );
$armazon_list_id = wp_unique_id( 'armazon-language-' );
$armazon_wrapper = get_block_wrapper_attributes(
	array(
		'class'               => 'armazon-language',
		'data-wp-interactive' => 'armazon/language-switcher',
		'data-wp-context'     => wp_json_encode( array( 'open' => false ) ),
		'data-wp-on-document--click' => 'callbacks.closeOutside',
		'data-wp-on--keydown' => 'callbacks.closeOnEscape',
	)
);
?>
<div <?php echo $armazon_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped by core. ?>>
	<button type="button" class="armazon-language__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $armazon_list_id ); ?>" data-wp-on--click="actions.toggle" data-wp-bind--aria-expanded="context.open">
		<span class="screen-reader-text"><?php esc_html_e( 'Language:', 'armazon' ); ?> </span><span lang="<?php echo esc_attr( (string) $armazon_current['code'] ); ?>"><?php echo esc_html( $armazon_label ); ?></span>
	</button>
	<ul id="<?php echo esc_attr( $armazon_list_id ); ?>" class="armazon-language__list" hidden data-wp-bind--hidden="!context.open">
		<?php foreach ( $armazon_others as $armazon_language ) : ?>
		<li><a href="<?php echo esc_url( (string) $armazon_language['url'] ); ?>" hreflang="<?php echo esc_attr( (string) $armazon_language['code'] ); ?>" lang="<?php echo esc_attr( (string) $armazon_language['code'] ); ?>"><?php echo esc_html( $armazon_name( $armazon_language ) ); ?></a></li>
		<?php endforeach; ?>
	</ul>
</div>
