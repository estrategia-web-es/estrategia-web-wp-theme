<?php
/**
 * Title: Single post
 * Slug: estrategia-web/single-post
 * Inserter: no
 * Description: The body of templates/single.html: breadcrumbs, category, title, byline (author, date, reading time), featured image, then the content with an aside (author box and related posts), previous/next links and comments.
 *
 * Why (1.2.0, 28-10-2026): up to 1.1.0 a post was title, date, image,
 * content and categories, never used by a real site. Estrategia Web is the
 * first site with a blog and its design asks for what any blog does: who
 * wrote it (and their bio, which is also the authorship signal search
 * engines look for), how long it takes to read, where it sits (breadcrumbs)
 * and what to read next. A pattern and not markup in the template because
 * its labels («Related posts», «About the author») must be translatable and
 * .html templates do not go through gettext.
 *
 * Structure the child dresses (classes, no colours here):
 *   .estrategia-web-single__head    breadcrumbs, category, title, byline
 *   .estrategia-web-single__image   featured image (wide)
 *   .estrategia-web-single__body    columns: content (70%) + aside (30%);
 *                                   stacked on mobile (core columns)
 *   .estrategia-web-single__aside   author box + related posts
 *   .estrategia-web-related         the related posts query (3, same
 *                                   category, never the current one:
 *                                   inc/related-posts.php)
 *
 * Comments: the core block renders nothing when comments are closed and
 * there are none (the case with the plugin's comments-off module), so a site
 * WITH comments gets them without touching anything (closes the GAP of
 * docs/web-nueva.md 8.5 in the plugin repo).
 *
 * How to maintain:
 * - Who: whoever touches the parent. Something a site wants and the next
 *   one would want too (a share button) goes here; a site's own box (a
 *   promotion) goes in its child, overriding single.html.
 * - Edge case: a child that overrides templates/single.html stops getting
 *   the fixes of this pattern; better to include it and add around it.
 * - The trap: the related query depends on query.estrategiaWebRelated; the
 *   editor may drop unknown keys of «query» when the template is saved from
 *   the Site Editor (then it lists the latest posts, current one included).
 *
 * @package estrategia-web
 */

?>
<!-- wp:group {"align":"wide","className":"estrategia-web-single__head","style":{"spacing":{"blockGap":"var:preset|spacing|16"}},"layout":{"type":"constrained","contentSize":"860px","justifyContent":"left"}} -->
<div class="wp-block-group alignwide estrategia-web-single__head"><!-- wp:breadcrumbs {"prefersTaxonomy":true} /-->

<!-- wp:post-title {"level":1} /-->

<!-- wp:group {"className":"estrategia-web-single__byline","style":{"spacing":{"blockGap":"var:preset|spacing|8"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
<div class="wp-block-group estrategia-web-single__byline"><!-- wp:post-author-name /-->

<!-- wp:post-date /-->

<!-- wp:post-time-to-read {"displayAsRange":false} /--></div>
<!-- /wp:group --></div>
<!-- /wp:group -->

<!-- wp:post-featured-image {"align":"wide","aspectRatio":"21/8","className":"estrategia-web-single__image"} /-->

<!-- wp:columns {"align":"wide","className":"estrategia-web-single__body","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|48"}}}} -->
<div class="wp-block-columns alignwide estrategia-web-single__body"><!-- wp:column {"width":"70%","className":"estrategia-web-single__content"} -->
<div class="wp-block-column estrategia-web-single__content" style="flex-basis:70%"><!-- wp:post-content {"layout":{"type":"default"}} /-->

<!-- wp:post-terms {"term":"category","className":"estrategia-web-single__terms"} /-->

<!-- wp:post-terms {"term":"post_tag","className":"estrategia-web-single__tags"} /--></div>
<!-- /wp:column -->

<!-- wp:column {"width":"30%","className":"estrategia-web-single__aside"} -->
<div class="wp-block-column estrategia-web-single__aside" style="flex-basis:30%"><!-- wp:group {"className":"estrategia-web-single__author","style":{"spacing":{"blockGap":"var:preset|spacing|8"}},"layout":{"type":"default"}} -->
<div class="wp-block-group estrategia-web-single__author"><!-- wp:paragraph {"className":"estrategia-web-single__label"} -->
<p class="estrategia-web-single__label"><?php echo esc_html__( 'About the author', 'estrategia-web' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:post-author {"avatarSize":64,"showAvatar":false,"showBio":true} /--></div>
<!-- /wp:group -->

<!-- wp:query {"queryId":7,"query":{"perPage":3,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":false,"sticky":"","estrategiaWebRelated":true},"className":"estrategia-web-related","layout":{"type":"default"}} -->
<div class="wp-block-query estrategia-web-related"><!-- wp:paragraph {"className":"estrategia-web-single__label"} -->
<p class="estrategia-web-single__label"><?php echo esc_html__( 'Related posts', 'estrategia-web' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:post-template {"className":"estrategia-web-related__list","layout":{"type":"default"}} -->
<!-- wp:group {"className":"estrategia-web-related__item","style":{"spacing":{"blockGap":"var:preset|spacing|16"}},"layout":{"type":"flex","flexWrap":"nowrap"}} -->
<div class="wp-block-group estrategia-web-related__item"><!-- wp:post-featured-image {"isLink":true,"width":"64px","height":"48px","sizeSlug":"thumbnail"} /-->

<!-- wp:post-title {"isLink":true,"level":3,"fontSize":"small"} /--></div>
<!-- /wp:group -->
<!-- /wp:post-template --></div>
<!-- /wp:query --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:group {"align":"wide","className":"estrategia-web-single__nav","layout":{"type":"flex","justifyContent":"space-between"}} -->
<div class="wp-block-group alignwide estrategia-web-single__nav"><!-- wp:post-navigation-link {"type":"previous","showTitle":true,"arrow":"arrow"} /-->

<!-- wp:post-navigation-link {"showTitle":true,"arrow":"arrow"} /--></div>
<!-- /wp:group -->

<!-- wp:comments {"align":"wide","className":"estrategia-web-single__comments"} -->
<div class="wp-block-comments alignwide estrategia-web-single__comments"><!-- wp:comments-title /-->

<!-- wp:comment-template -->
<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group"><!-- wp:comment-author-name /-->

<!-- wp:comment-date /-->

<!-- wp:comment-content /-->

<!-- wp:comment-reply-link /--></div>
<!-- /wp:group -->
<!-- /wp:comment-template -->

<!-- wp:comments-pagination -->
<!-- wp:comments-pagination-previous /-->

<!-- wp:comments-pagination-numbers /-->

<!-- wp:comments-pagination-next /-->
<!-- /wp:comments-pagination -->

<!-- wp:post-comments-form /--></div>
<!-- /wp:comments -->
