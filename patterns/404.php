<?php
/**
 * Title: Page not found
 * Slug: armazon/404
 * Inserter: no
 *
 * Contenido de templates/404.html. Patrón y no texto en la plantilla porque
 * las plantillas .html no pasan por gettext (fila 11 del Armazón).
 *
 * @package armazon
 */

?>
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading"><?php esc_html_e( 'Page not found', 'armazon' ); ?></h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><?php esc_html_e( 'The page you are looking for does not exist or has moved. Try searching for it.', 'armazon' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:search {"buttonPosition":"button-inside","buttonUseIcon":true} /-->
