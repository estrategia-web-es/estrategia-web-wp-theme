<?php
/**
 * armazon/carousel — carrusel de desplazamiento horizontal.
 *
 * Qué es: una fila desplazable (scroll-snap) con los bloques que se metan
 * dentro (imágenes, grupos, tarjetas: cada hijo directo es una diapositiva),
 * flechas anterior/siguiente, puntos opcionales y autoplay SOLO si se pide.
 *
 * Con una Consulta dentro (0.2.0): si un hijo directo es un core/query, cada
 * entrada de su post-template (<li>) es una diapositiva. Así una lista que
 * vive en la base de datos (clientes, opiniones) se pasa en carrusel sin
 * copiar sus fichas a mano. La consulta y su <ul> se aplanan con
 * display: contents (style.css) y view.js recorre los <li>.
 * - Caso frontera: la paginación de la consulta NO va dentro del carrusel
 *   (sería una diapositiva más); el carrusel enseña las perPage que traiga.
 * - La trampa: el post-template tiene que ser hijo DIRECTO de la consulta. Si
 *   se envuelve en un grupo, el grupo es la única diapositiva.
 * - En el editor la consulta se ve con su disposición normal (en columna): el
 *   aplanado es solo de la página publicada.
 *
 * Decisiones:
 * - Sin JavaScript es una fila desplazable con el dedo, la rueda o las flechas
 *   del teclado: el comportamiento es una mejora, no un requisito. Los
 *   controles salen ocultos y view.js les quita la ocultación (clase is-ready).
 * - Comportamiento con la Interactivity API (view.js, módulo ES nativo).
 * - Editor: InnerBlocks necesita JavaScript en el editor, y WordPress 7.1 no
 *   admite módulos ES como editorScript (no hay editorScriptModule). Por eso
 *   edit.js es un script CLÁSICO que usa los globales wp.element y
 *   wp.blockEditor, sin JSX ni compilación. Su lista de dependencias está en
 *   edit.asset.php, escrita a mano.
 * - Cuántos se ven: por ANCHO DEL CARRUSEL (container queries), no de la
 *   ventana. Un carrusel en una columna estrecha enseña los de móvil aunque la
 *   pantalla sea grande, que es lo que se quiere.
 * - Accesibilidad: región con aria-roledescription «carousel» y nombre; la
 *   pista es enfocable (tabindex=0) y responde a ← → Inicio Fin; botones con
 *   nombre y aria-controls; prefers-reduced-motion quita el desplazamiento
 *   suave y anula el autoplay. El autoplay, si se activa, se para al pasar el
 *   ratón o al entrar el foco, y tiene botón de pausa (WCAG 2.2.2).
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Cuándo: al cambiar el marcado o los
 *   atributos; un atributo nuevo lleva default para que los carruseles ya
 *   guardados sigan igual (condición 2 del padre: no obligar a tocar un hijo).
 * - Caso frontera: «quiero el carrusel con las flechas encima de las
 *   imágenes» es un AJUSTE (CSS del hijo sobre .armazon-carousel__controls);
 *   «quiero un carrusel que sincronice dos filas» es OTRA COSA: bloque del hijo.
 * - Los cortes de container query (480px / 782px) copian settings.viewport de
 *   theme.json. Si se cambian allí, se cambian en style.css: CSS no deja usar
 *   variables dentro de @container.
 * - La trampa: los puntos se cuentan con los bloques internos al renderizar;
 *   un bloque interno que no pinta nada (un párrafo vacío borrado a medias)
 *   cuenta como diapositiva invisible.
 *
 * @package armazon
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

/*
 * Diapositivas: cada bloque interno directo, SALVO un core/query, que aporta
 * una por cada <li> de su post-template (0.2.0). Las de la consulta se
 * cuentan en el HTML ya pintado: antes de renderizar no se sabe cuántas
 * entradas trae.
 */
$armazon_count = 0;
foreach ( $block->inner_blocks as $armazon_inner ) {
	if ( 'core/query' !== $armazon_inner->name ) {
		++$armazon_count;
	}
}
if ( str_contains( $content, 'wp-block-post-template' ) ) {
	$armazon_tags = new WP_HTML_Tag_Processor( $content );
	while ( $armazon_tags->next_tag( array( 'tag_name' => 'LI', 'class_name' => 'wp-block-post' ) ) ) {
		++$armazon_count;
	}
}
$armazon_track_id = wp_unique_id( 'armazon-carousel-' );
$armazon_track_id = wp_unique_id( 'armazon-carousel-' );
$armazon_label    = '' !== trim( (string) $attributes['label'] ) ? $attributes['label'] : __( 'Carousel', 'armazon' );

$armazon_per_view = array(
	'mobile'  => max( 1, (float) $attributes['perViewMobile'] ),
	'tablet'  => max( 1, (float) $attributes['perViewTablet'] ),
	'desktop' => max( 1, (float) $attributes['perViewDesktop'] ),
);

$armazon_context = array(
	'ready'      => false,
	'atStart'    => true,
	'atEnd'      => false,
	'current'    => 0,
	'count'      => $armazon_count,
	'autoplay'   => (bool) $attributes['autoplay'],
	'interval'   => max( 2000, (int) $attributes['autoplayInterval'] ),
	'playing'    => false,
	'hover'      => false,
	'focused'    => false,
	'labelPause' => __( 'Pause carousel', 'armazon' ),
	'labelPlay'  => __( 'Play carousel', 'armazon' ),
);

$armazon_wrapper = get_block_wrapper_attributes(
	array(
		'class'                => 'armazon-carousel',
		'role'                 => 'region',
		'aria-roledescription' => _x( 'carousel', 'ARIA role description', 'armazon' ),
		'aria-label'           => $armazon_label,
		'style'                => sprintf(
			'--armazon-carousel-per-view-mobile:%s;--armazon-carousel-per-view-tablet:%s;--armazon-carousel-per-view-desktop:%s;',
			$armazon_per_view['mobile'],
			$armazon_per_view['tablet'],
			$armazon_per_view['desktop']
		),
	)
);
?>
<div
	<?php echo $armazon_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped by core. ?>
	data-wp-interactive="armazon/carousel"
	<?php echo wp_interactivity_data_wp_context( $armazon_context ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	data-wp-init="callbacks.init"
	data-wp-class--is-ready="context.ready"
	data-wp-class--is-static="state.isStatic"
	data-wp-on-async--mouseenter="actions.hoverIn"
	data-wp-on-async--mouseleave="actions.hoverOut"
	data-wp-on-async--focusin="actions.focusIn"
	data-wp-on-async--focusout="actions.focusOut"
>
	<div
		class="armazon-carousel__track"
		id="<?php echo esc_attr( $armazon_track_id ); ?>"
		tabindex="0"
		aria-label="<?php echo esc_attr( $armazon_label ); ?>"
		data-wp-on-async--scroll="callbacks.onScroll"
		data-wp-on--keydown="actions.onKeydown"
	>
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput -- inner blocks. ?>
	</div>

	<?php if ( $attributes['showArrows'] || $attributes['autoplay'] ) : ?>
	<div class="armazon-carousel__controls">
		<?php if ( $attributes['autoplay'] ) : ?>
		<button
			type="button"
			class="armazon-carousel__toggle"
			aria-controls="<?php echo esc_attr( $armazon_track_id ); ?>"
			data-wp-on--click="actions.toggleAutoplay"
			aria-label="<?php echo esc_attr( $armazon_context['labelPause'] ); ?>"
			data-wp-bind--aria-label="state.toggleLabel"
		>
			<span class="armazon-carousel__toggle-icon" aria-hidden="true" data-wp-class--is-playing="context.playing"></span>
		</button>
		<?php endif; ?>
		<?php if ( $attributes['showArrows'] ) : ?>
		<button
			type="button"
			class="armazon-carousel__arrow armazon-carousel__prev"
			aria-controls="<?php echo esc_attr( $armazon_track_id ); ?>"
			aria-label="<?php echo esc_attr__( 'Previous slide', 'armazon' ); ?>"
			data-wp-on--click="actions.prev"
			data-wp-bind--disabled="context.atStart"
		>
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
		</button>
		<button
			type="button"
			class="armazon-carousel__arrow armazon-carousel__next"
			aria-controls="<?php echo esc_attr( $armazon_track_id ); ?>"
			aria-label="<?php echo esc_attr__( 'Next slide', 'armazon' ); ?>"
			data-wp-on--click="actions.next"
			data-wp-bind--disabled="context.atEnd"
		>
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
		</button>
		<?php endif; ?>
	</div>
	<?php endif; ?>

	<?php if ( $attributes['showDots'] && $armazon_count > 1 ) : ?>
	<div class="armazon-carousel__dots" role="group" aria-label="<?php echo esc_attr__( 'Choose slide', 'armazon' ); ?>">
		<?php for ( $armazon_i = 0; $armazon_i < $armazon_count; $armazon_i++ ) : ?>
		<button
			type="button"
			class="armazon-carousel__dot"
			aria-controls="<?php echo esc_attr( $armazon_track_id ); ?>"
			aria-label="<?php echo esc_attr( sprintf( /* translators: %d: slide number. */ __( 'Go to slide %d', 'armazon' ), $armazon_i + 1 ) ); ?>"
			<?php echo wp_interactivity_data_wp_context( array( 'index' => $armazon_i ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			data-wp-on--click="actions.goTo"
			data-wp-bind--aria-current="state.isCurrentDot"
		></button>
		<?php endfor; ?>
	</div>
	<?php endif; ?>
</div>
