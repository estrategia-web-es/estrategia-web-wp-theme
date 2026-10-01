/**
 * armazon/carousel — editor. Script CLÁSICO, sin compilar.
 *
 * Por qué así: InnerBlocks necesita JavaScript en el editor y WordPress 7.1
 * no acepta módulos ES como editorScript. Se usan los globales wp.* (sus
 * handles están en edit.asset.php) y createElement en vez de JSX.
 * Los textos van con wp.i18n.__( ..., 'armazon' ); las traducciones las
 * inyecta inc/blocks.php desde languages/<locale>.l10n.php.
 *
 * Cómo se mantiene: un control nuevo es un atributo nuevo en block.json con
 * default; save() devuelve solo InnerBlocks.Content y NO se toca: el marcado
 * lo pinta render.php, así que cambiarlo no invalida carruseles guardados.
 */
( function ( wp ) {
	const { registerBlockType } = wp.blocks;
	const { createElement: h, Fragment } = wp.element;
	const { useBlockProps, useInnerBlocksProps, InnerBlocks, InspectorControls } = wp.blockEditor;
	const { PanelBody, ToggleControl, RangeControl, TextControl } = wp.components;
	const { __ } = wp.i18n;

	registerBlockType( 'armazon/carousel', {
		edit( { attributes, setAttributes } ) {
			const blockProps = useBlockProps( {
				className: 'armazon-carousel is-editing',
				style: {
					'--armazon-carousel-per-view-mobile': attributes.perViewMobile,
					'--armazon-carousel-per-view-tablet': attributes.perViewTablet,
					'--armazon-carousel-per-view-desktop': attributes.perViewDesktop,
				},
			} );
			const innerBlocksProps = useInnerBlocksProps(
				{ className: 'armazon-carousel__track' },
				{
					orientation: 'horizontal',
					template: [ [ 'core/image' ], [ 'core/image' ], [ 'core/image' ] ],
				}
			);
			const range = ( label, key ) =>
				h( RangeControl, {
					label,
					value: attributes[ key ],
					min: 1,
					max: 6,
					step: 0.5,
					onChange: ( value ) => setAttributes( { [ key ]: value } ),
				} );

			return h(
				Fragment,
				null,
				h(
					InspectorControls,
					null,
					h(
						PanelBody,
						{ title: __( 'Carousel settings', 'armazon' ) },
						h( TextControl, {
							label: __( 'Accessible name', 'armazon' ),
							help: __( 'Read by screen readers. Defaults to “Carousel”.', 'armazon' ),
							value: attributes.label,
							onChange: ( value ) => setAttributes( { label: value } ),
						} ),
						h( ToggleControl, {
							label: __( 'Show arrows', 'armazon' ),
							checked: attributes.showArrows,
							onChange: ( value ) => setAttributes( { showArrows: value } ),
						} ),
						h( ToggleControl, {
							label: __( 'Show dots', 'armazon' ),
							checked: attributes.showDots,
							onChange: ( value ) => setAttributes( { showDots: value } ),
						} ),
						range( __( 'Visible on mobile', 'armazon' ), 'perViewMobile' ),
						range( __( 'Visible on tablet', 'armazon' ), 'perViewTablet' ),
						range( __( 'Visible on desktop', 'armazon' ), 'perViewDesktop' ),
						h( ToggleControl, {
							label: __( 'Autoplay', 'armazon' ),
							help: __( 'Off by default for accessibility. Ignored when the visitor asks for reduced motion.', 'armazon' ),
							checked: attributes.autoplay,
							onChange: ( value ) => setAttributes( { autoplay: value } ),
						} )
					)
				),
				h( 'div', blockProps, h( 'div', innerBlocksProps ) )
			);
		},
		save() {
			return h( InnerBlocks.Content );
		},
	} );
} )( window.wp );
