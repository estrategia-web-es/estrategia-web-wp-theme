<?php
/**
 * Consentimiento de cookies propio y mínimo.
 *
 * Qué es: un aviso con Aceptar / Rechazar / Configurar (los tres con el mismo
 * peso visual, como pide la AEPD), categorías declarables, la elección en una
 * cookie propia y técnica (armazon_consent), y la elección expuesta:
 * - a PHP:  armazon_consent_has( 'maps' ), armazon_consent_categories();
 * - a JS:   window.armazonConsent.has( 'maps' ) / .get() / .open() /
 *           .grant( 'maps' ) (0.5.0: «Ver mapa» concede la categoría), el evento
 *           «armazon:consent» en document (detail.accepted) y el store de
 *           Interactivity «armazon/consent»;
 * - y activa solo los <script type="text/plain" data-armazon-consent="X">
 *   de las categorías aceptadas.
 * El aviso se pinta en wp_footer (no depende de que el hijo ponga un bloque).
 * El bloque armazon/consent es el ENLACE para reabrirlo, pensado para el pie;
 * también hay shortcode [armazon_consent_settings].
 *
 * Cómo declara categorías un hijo (en su functions.php):
 *
 *     add_filter( 'armazon_consent_categories', fn() => array( 'statistics', 'maps' ) );
 *
 * Categorías que conoce el padre: statistics, maps, marketing. «necessary»
 * siempre está y no se pregunta. SI NO SE DECLARA NINGUNA, EL AVISO NO SALE,
 * y es lo normal: con Matomo sin cookies (fila 16 del Armazón) y los mapas en
 * dos clics (armazon/map: el clic del visitante ES el consentimiento para esa
 * carga), la mayoría de webs no tienen nada que preguntar.
 *
 * WP Consent API (plugin): si está activo, se declara el tipo «optin» y el JS
 * llama a wp_set_consent() al guardar: statistics → statistics y
 * statistics-anonymous, marketing → marketing. «maps» no tiene equivalente en
 * esa API y no se comunica. No se depende de ella: sin el plugin, todo igual.
 *
 * Cómo se mantiene:
 * - Quién: quien toque el padre. Cuándo: al añadir una categoría o cambiar el
 *   texto legal por defecto.
 * - Al cambiar las categorías declaradas cambia la «revisión» (hash de la
 *   lista) y el aviso vuelve a salir a todo el mundo: es lo correcto, se les
 *   pregunta por algo nuevo. Si hay que forzarlo sin cambiar categorías (otra
 *   política), el filtro armazon_consent_revision.
 * - Caso frontera: una web necesita una categoría que el padre no conoce
 *   (p. ej. «chat»). Es un AJUSTE si basta con etiqueta y descripción: se
 *   añade al padre en una versión menor. Si necesita otra lógica, es del hijo.
 * - La trampa: armazon_consent_has() lee la cookie en el SERVIDOR. Con caché
 *   de página (SiteGround, etc.) la página cacheada de un visitante se sirve
 *   a otro. Para decidir si se carga algo, mejor en el navegador
 *   (text/plain + data-armazon-consent, o el evento). armazon_consent_has()
 *   vale para páginas que no se cachean.
 *
 * @package armazon
 */

defined( 'ABSPATH' ) || exit;

/**
 * Name of the consent cookie (technical, necessary).
 */
const ARMAZON_CONSENT_COOKIE = 'armazon_consent';

/**
 * Optional categories the parent knows how to describe.
 *
 * @return array<string, array{label: string, description: string}>
 */
function armazon_consent_known_categories(): array {
	return array(
		'statistics' => array(
			'label'       => __( 'Statistics', 'armazon' ),
			'description' => __( 'Help us understand how the site is used.', 'armazon' ),
		),
		'maps'       => array(
			'label'       => __( 'Maps and third-party content', 'armazon' ),
			'description' => __( 'Load embedded maps and other content served by third parties, which may set their own cookies.', 'armazon' ),
		),
		'marketing'  => array(
			'label'       => __( 'Marketing', 'armazon' ),
			'description' => __( 'Measure campaigns and show relevant advertising.', 'armazon' ),
		),
	);
}

/**
 * Optional categories declared by the site (child theme), in a stable order.
 *
 * @return string[]
 */
function armazon_consent_categories(): array {
	$declared = (array) apply_filters( 'armazon_consent_categories', array() );
	$known    = array_keys( armazon_consent_known_categories() );
	return array_values( array_intersect( $known, $declared ) );
}

/**
 * Revision of the declared categories. A stored choice with another revision
 * is ignored and the notice shows again.
 */
function armazon_consent_revision(): string {
	$seed = implode( ',', armazon_consent_categories() ) . '|' . apply_filters( 'armazon_consent_revision', '1' );
	return substr( md5( $seed ), 0, 8 );
}

/**
 * Lifetime of the choice, in seconds. 12 months by default (the AEPD guide
 * recommends not keeping a consent more than 24 months).
 */
function armazon_consent_max_age(): int {
	return (int) apply_filters( 'armazon_consent_max_age', YEAR_IN_SECONDS );
}

/**
 * Stored choice, or null when there is none valid for the current revision.
 *
 * Cookie format: "<revision>.<category~category>.<unix time>".
 *
 * @return string[]|null Accepted optional categories.
 */
function armazon_consent_choice(): ?array {
	if ( empty( $_COOKIE[ ARMAZON_CONSENT_COOKIE ] ) ) {
		return null;
	}
	$raw   = sanitize_text_field( wp_unslash( $_COOKIE[ ARMAZON_CONSENT_COOKIE ] ) );
	$parts = explode( '.', $raw );
	if ( 3 !== count( $parts ) || armazon_consent_revision() !== $parts[0] ) {
		return null;
	}
	$accepted = '' === $parts[1] ? array() : explode( '~', $parts[1] );
	return array_values( array_intersect( armazon_consent_categories(), $accepted ) );
}

/**
 * Whether a category is accepted. "necessary" always is.
 *
 * @param string $category Category slug.
 */
function armazon_consent_has( string $category ): bool {
	if ( 'necessary' === $category ) {
		return true;
	}
	$choice = armazon_consent_choice();
	return null !== $choice && in_array( $category, $choice, true );
}

/**
 * Interactivity state shared by the notice and the reopen button.
 */
function armazon_consent_state(): void {
	$known = armazon_consent_known_categories();
	wp_interactivity_state(
		'armazon/consent',
		array(
			'categories'   => armazon_consent_categories(),
			'labels'       => array_map( static fn( $c ) => $c['label'], array_intersect_key( $known, array_flip( armazon_consent_categories() ) ) ),
			'revision'     => armazon_consent_revision(),
			'cookieName'   => ARMAZON_CONSENT_COOKIE,
			'maxAge'       => armazon_consent_max_age(),
			'isOpen'       => false,
			'showSettings' => false,
		)
	);
}

/**
 * Enqueues the consent module on the front end when there is something to ask.
 */
function armazon_consent_enqueue(): void {
	if ( ! armazon_consent_categories() ) {
		return;
	}
	armazon_consent_state();
	wp_enqueue_script_module( 'armazon-consent-view-script-module' );
	wp_enqueue_style( 'armazon-consent-style' );
}
add_action( 'wp_enqueue_scripts', 'armazon_consent_enqueue' );

/**
 * Prints the notice. Hidden by default: view.js shows it when there is no valid
 * choice. Without JavaScript it stays hidden, and nothing optional loads
 * either (the scripts are text/plain), so nothing is lost.
 */
function armazon_consent_print_notice(): void {
	$categories = armazon_consent_categories();
	if ( ! $categories ) {
		return;
	}
	$known  = armazon_consent_known_categories();
	$policy = get_privacy_policy_url();
	$text   = apply_filters(
		'armazon_consent_text',
		__( 'We use our own and third-party cookies for the purposes listed below. You can accept them, reject them or choose which ones to allow. Necessary cookies are always active.', 'armazon' )
	);

	ob_start();
	?>
	<section
		id="armazon-consent"
		class="armazon-consent"
		hidden
		role="dialog"
		aria-modal="false"
		aria-labelledby="armazon-consent-title"
		aria-describedby="armazon-consent-text"
		data-wp-interactive="armazon/consent"
		data-wp-init="callbacks.init"
		data-wp-watch="callbacks.focusOnOpen"
		data-wp-bind--hidden="!state.isOpen"
		data-wp-on--keydown="actions.onKeydown"
	>
		<h2 id="armazon-consent-title" class="armazon-consent__title" tabindex="-1"><?php esc_html_e( 'Cookies', 'armazon' ); ?></h2>
		<p id="armazon-consent-text" class="armazon-consent__text">
			<?php echo esc_html( $text ); ?>
			<?php if ( $policy ) : ?>
				<a href="<?php echo esc_url( $policy ); ?>"><?php esc_html_e( 'Privacy and cookie policy', 'armazon' ); ?></a>
			<?php endif; ?>
		</p>

		<form class="armazon-consent__settings" id="armazon-consent-settings" hidden data-wp-bind--hidden="!state.showSettings" data-wp-on--submit="actions.saveSettings">
			<fieldset>
				<legend><?php esc_html_e( 'Cookie categories', 'armazon' ); ?></legend>
				<label class="armazon-consent__category">
					<input type="checkbox" checked disabled>
					<span><strong><?php esc_html_e( 'Necessary', 'armazon' ); ?></strong> — <?php esc_html_e( 'Required for the site to work, including remembering this choice. Always active.', 'armazon' ); ?></span>
				</label>
				<?php foreach ( $categories as $slug ) : ?>
				<label class="armazon-consent__category">
					<input
						type="checkbox"
						name="armazon-consent-category"
						value="<?php echo esc_attr( $slug ); ?>"
						<?php echo wp_interactivity_data_wp_context( array( 'category' => $slug ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						data-wp-bind--checked="state.isChecked"
						data-wp-on--change="actions.toggleCategory"
					>
					<span><strong><?php echo esc_html( $known[ $slug ]['label'] ); ?></strong> — <?php echo esc_html( $known[ $slug ]['description'] ); ?></span>
				</label>
				<?php endforeach; ?>
			</fieldset>
			<button type="submit" class="wp-element-button armazon-consent__button"><?php esc_html_e( 'Save choices', 'armazon' ); ?></button>
		</form>

		<div class="armazon-consent__actions">
			<button type="button" class="wp-element-button armazon-consent__button" data-armazon-consent-action="accept" data-wp-on--click="actions.acceptAll"><?php esc_html_e( 'Accept all', 'armazon' ); ?></button>
			<button type="button" class="wp-element-button armazon-consent__button" data-armazon-consent-action="reject" data-wp-on--click="actions.rejectAll"><?php esc_html_e( 'Reject all', 'armazon' ); ?></button>
			<button type="button" class="wp-element-button armazon-consent__button" data-armazon-consent-action="configure" aria-controls="armazon-consent-settings" data-wp-bind--aria-expanded="state.showSettings" data-wp-on--click="actions.toggleSettings"><?php esc_html_e( 'Configure', 'armazon' ); ?></button>
		</div>
	</section>
	<?php
	echo wp_interactivity_process_directives( (string) ob_get_clean() ); // phpcs:ignore WordPress.Security.EscapeOutput -- built above with escaping.
}
add_action( 'wp_footer', 'armazon_consent_print_notice', 5 );

/**
 * Shortcode [armazon_consent_settings]: same output as the armazon/consent block.
 *
 * @param array|string $atts Shortcode attributes (label).
 */
function armazon_consent_shortcode( $atts ): string {
	$atts = shortcode_atts( array( 'label' => '' ), $atts, 'armazon_consent_settings' );
	return render_block(
		array(
			'blockName'    => 'armazon/consent',
			'attrs'        => array( 'label' => (string) $atts['label'] ),
			'innerBlocks'  => array(),
			'innerHTML'    => '',
			'innerContent' => array(),
		)
	);
}
add_shortcode( 'armazon_consent_settings', 'armazon_consent_shortcode' );

/**
 * WP Consent API, if present: this site asks before (opt-in).
 */
function armazon_consent_wp_consent_api(): void {
	if ( ! function_exists( 'wp_has_consent' ) || ! armazon_consent_categories() ) {
		return;
	}
	add_filter( 'wp_get_consent_type', static fn() => 'optin' );
}
add_action( 'after_setup_theme', 'armazon_consent_wp_consent_api' );
