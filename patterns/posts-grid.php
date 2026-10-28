<?php
/**
 * Title: Posts grid
 * Slug: estrategia-web/posts-grid
 * Inserter: no
 * Description: The list of posts of index, archive and search: a grid of cards (featured image, category, title, excerpt, date and reading time) with numbered pagination.
 *
 * Why (1.2.0, 28-10-2026): the listings were title + date + excerpt, never
 * used by a real site. Estrategia Web (estrategiaweb.es) is the first site
 * with a blog, and what it asked for is what any blog asks for: the image,
 * the category and the reading time in the card, real paginated links (not
 * infinite scroll: crawlable) and the same card in every listing. One
 * pattern for the three templates, so a fix happens once.
 *
 * What the child does: the LOOK (radius of the image, colours, sizes), with
 * CSS on .estrategia-web-posts (the query) and .estrategia-web-posts__card
 * (each card). Without child CSS it is a plain three-column grid.
 *
 * How to maintain:
 * - Who: whoever touches the parent. A card change goes here, not in the
 *   templates; the three templates only include this pattern.
 * - Edge case: «inherit»: the grid always lists the main query (the archive,
 *   the search, the blog page); a page that wants a different list (only one
 *   category, the latest three) uses its own Query block, not this pattern.
 * - The trap: core/post-time-to-read shows a RANGE («4–6 minutes») by
 *   default; displayAsRange:false gives one number.
 *
 * @package estrategia-web
 */

?>
<!-- wp:query {"queryId":1,"query":{"inherit":true,"perPage":12},"align":"wide","className":"estrategia-web-posts","layout":{"type":"default"}} -->
<div class="wp-block-query alignwide estrategia-web-posts"><!-- wp:post-template {"className":"estrategia-web-posts__grid","layout":{"type":"grid","columnCount":3,"minimumColumnWidth":"18rem"}} -->
<!-- wp:group {"className":"estrategia-web-posts__card","style":{"spacing":{"blockGap":"var:preset|spacing|16"}},"layout":{"type":"flex","orientation":"vertical","flexWrap":"nowrap"}} -->
<div class="wp-block-group estrategia-web-posts__card"><!-- wp:post-featured-image {"isLink":true,"aspectRatio":"16/9","sizeSlug":"medium_large","className":"estrategia-web-posts__image"} /-->

<!-- wp:post-terms {"term":"category","className":"estrategia-web-posts__terms"} /-->

<!-- wp:post-title {"isLink":true,"level":2,"className":"estrategia-web-posts__title","fontSize":"large"} /-->

<!-- wp:post-excerpt {"excerptLength":24,"className":"estrategia-web-posts__excerpt"} /-->

<!-- wp:group {"className":"estrategia-web-posts__meta","style":{"spacing":{"blockGap":"var:preset|spacing|16"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
<div class="wp-block-group estrategia-web-posts__meta"><!-- wp:post-date /-->

<!-- wp:post-time-to-read {"displayAsRange":false} /--></div>
<!-- /wp:group --></div>
<!-- /wp:group -->
<!-- /wp:post-template -->

<!-- wp:query-pagination {"paginationArrow":"arrow","className":"estrategia-web-posts__pagination","layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:query-pagination-previous /-->

<!-- wp:query-pagination-numbers /-->

<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->

<!-- wp:query-no-results -->
<!-- wp:pattern {"slug":"estrategia-web/no-results"} /-->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->
