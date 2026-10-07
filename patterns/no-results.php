<?php
/**
 * Title: No results
 * Slug: estrategia-web/no-results
 * Inserter: no
 *
 * Texto de «sin resultados» de los listados. Es un patrón y no texto en la
 * plantilla porque las plantillas .html no pasan por gettext: solo un .php
 * puede traducir (fila 11 del Armazón).
 *
 * @package estrategia-web
 */

?>
<!-- wp:paragraph -->
<p><?php esc_html_e( 'Nothing was found here. Try a different search.', 'estrategia-web' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:search {"buttonPosition":"button-inside","buttonUseIcon":true} /-->
