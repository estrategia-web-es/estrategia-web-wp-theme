<?php
/**
 * Title: Page not found
 * Slug: estrategia-web/404
 * Inserter: no
 *
 * Contenido de templates/404.html. Patrón y no texto en la plantilla porque
 * las plantillas .html no pasan por gettext (fila 11 del Armazón).
 *
 * @package estrategia-web
 */

?>
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading"><?php esc_html_e( 'Page not found', 'estrategia-web' ); ?></h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><?php esc_html_e( 'The page you are looking for does not exist or has moved. Try searching for it.', 'estrategia-web' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:search {"buttonPosition":"button-inside","buttonUseIcon":true} /-->
