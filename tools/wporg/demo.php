<?php
/**
 * Demo content for screenshot.png (node tools/wporg.mjs screenshot), run
 * inside Playground. Core blocks only and no images: what the screenshot shows
 * must be the theme itself, and readme.txt («Resources») says it has no
 * third-party images — if an image is ever added here, its licence goes there.
 *
 * Not part of the theme (tools/ is export-ignore). The site name, «Studio
 * Norte», is made up: WordPress.org rejects screenshots that look like an ad,
 * so no real brand.
 */
require_once '/wordpress/wp-load.php';

switch_theme( 'estrategia-web' );
update_option( 'blogname', 'Studio Norte' );
update_option( 'blogdescription', '' );

wp_delete_post( 2, true ); // «Sample Page»
wp_delete_post( 1, true ); // «Hello world!»
foreach ( array( 'About', 'Services', 'Journal', 'Contact' ) as $i => $title ) {
	wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'menu_order' => $i + 1 ) );
}
foreach ( array(
	array( 'What a small business site really needs', 'Five pages, a contact form and a map do more than most people think. Here is where to start.' ),
	array( 'Fast by default', 'System fonts, no build step and styles only for the blocks a page uses.' ),
	array( 'Writing for your clients, not for search engines', 'Clear headings and short paragraphs help both, and readers notice.' ),
) as $i => $p ) {
	wp_insert_post( array( 'post_status' => 'publish', 'post_title' => $p[0], 'post_excerpt' => $p[1], 'post_content' => '<!-- wp:paragraph --><p>' . $p[1] . '</p><!-- /wp:paragraph -->', 'post_date' => gmdate( 'Y-m-d H:i:s', strtotime( '2026-10-0' . ( 3 + $i * 3 ) ) ) ) );
}

$content = <<<'HTML'
<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"top":"var:preset|spacing|64","bottom":"var:preset|spacing|48"}}},"layout":{"type":"constrained","contentSize":"900px"}} -->
<div class="wp-block-group alignwide" style="padding-top:var(--wp--preset--spacing--64);padding-bottom:var(--wp--preset--spacing--48)">
<!-- wp:heading {"level":1,"fontSize":"xx-large"} -->
<h1 class="wp-block-heading has-xx-large-font-size">A calm, fast base for small business websites</h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"muted","fontSize":"large"} -->
<p class="has-muted-color has-text-color has-large-font-size">Templates, layout and typography that stay out of the way, so the brand in your child theme is what people see.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">See our work</a></div>
<!-- /wp:button -->
<!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">Get in touch</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--48);padding-bottom:var(--wp--preset--spacing--48)">
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide">
<!-- wp:column --><div class="wp-block-column">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Design</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Brand identity, layouts and the small details that make a site feel finished.</p><!-- /wp:paragraph -->
</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Development</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Block themes built on WordPress core: nothing to learn, nothing to lock you in.</p><!-- /wp:paragraph -->
</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Care</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Updates, backups and someone who answers when something needs to change.</p><!-- /wp:paragraph -->
</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"top":"var:preset|spacing|48","bottom":"var:preset|spacing|48"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignwide" style="padding-top:var(--wp--preset--spacing--48);padding-bottom:var(--wp--preset--spacing--48)">
<!-- wp:heading {"fontSize":"x-large"} --><h2 class="wp-block-heading has-x-large-font-size">From the journal</h2><!-- /wp:heading -->
<!-- wp:query {"queryId":1,"query":{"perPage":3,"postType":"post","order":"desc","orderBy":"date","inherit":false}} -->
<div class="wp-block-query"><!-- wp:post-template {"layout":{"type":"grid","columnCount":3}} -->
<!-- wp:post-date {"textColor":"muted","fontSize":"small"} /-->
<!-- wp:post-title {"isLink":true,"fontSize":"large"} /-->
<!-- wp:post-excerpt /-->
<!-- /wp:post-template --></div>
<!-- /wp:query -->
</div>
<!-- /wp:group -->
HTML;

$front = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Home', 'post_content' => $content ) );
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $front );
