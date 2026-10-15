<?php
/**
 * Title: Page not found
 * Slug: estrategia-web/404
 * Inserter: no
 *
 * Content of templates/404.html. A pattern and not text in the template
 * because .html templates do not go through gettext (row 11 of the Armazón).
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
