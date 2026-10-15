<?php
/**
 * Title: No results
 * Slug: estrategia-web/no-results
 * Inserter: no
 *
 * The "no results" text of the listings. It is a pattern and not text in the
 * template because .html templates do not go through gettext: only a .php
 * can translate (row 11 of the Armazón).
 *
 * @package estrategia-web
 */

?>
<!-- wp:paragraph -->
<p><?php esc_html_e( 'Nothing was found here. Try a different search.', 'estrategia-web' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:search {"buttonPosition":"button-inside","buttonUseIcon":true} /-->
