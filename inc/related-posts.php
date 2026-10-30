<?php
/**
 * Related posts (1.2.0, 28-10-2026): a Query block with
 * query.estrategiaWebRelated = true lists posts of the CURRENT post's
 * categories, never the current post itself.
 *
 * Why here and not a block: core/query cannot say «same category as the post
 * being viewed» nor «except this one», and a new block is the plugin's job
 * (since 1.1.0 the parent registers none). This only adjusts the query of a
 * core block, which is what inc/ is for (like inc/core-blocks.php). Used by
 * patterns/single-post.php; a child can use the same flag in its own query.
 *
 * How to maintain:
 * - Who: whoever touches the parent. When: if core/query ever gets «exclude
 *   current» and «same terms» of its own, this goes away and the pattern uses
 *   the core attributes.
 * - Edge case: a post WITHOUT categories (or only «uncategorized») gets the
 *   latest posts, still without itself: better something than an empty box.
 * - The trap: the flag lives in the block's «query» context; the filter gets
 *   the post-template block, whose context carries it. Outside a single post
 *   (get_queried_object_id() is not a post) nothing changes.
 *
 * @package estrategia-web
 */

defined( 'ABSPATH' ) || exit;

/**
 * Narrows a flagged Query block to the current post's categories, minus the post.
 *
 * @param array    $query Query vars built by core.
 * @param WP_Block $block The post-template block.
 */
function estrategia_web_related_posts_query( array $query, $block ): array {
	if ( empty( $block->context['query']['estrategiaWebRelated'] ) || ! is_singular() ) {
		return $query;
	}
	$current = get_queried_object_id();
	if ( ! $current ) {
		return $query;
	}
	$query['post__not_in']        = array_merge( (array) ( $query['post__not_in'] ?? array() ), array( $current ) );
	$query['ignore_sticky_posts'] = true;
	$categories                   = array_diff( wp_get_post_categories( $current ), array( (int) get_option( 'default_category' ) ) );
	if ( $categories ) {
		$query['category__in'] = array_values( $categories );
	}
	return $query;
}
add_filter( 'query_loop_block_query_vars', 'estrategia_web_related_posts_query', 10, 2 );
