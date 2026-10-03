/**
 * armazon/map — editor. Script CLÁSICO, sin compilar (ver blocks/carousel/edit.js
 * para el porqué). Existe solo por el selector de imagen de la mediateca, que
 * los controles automáticos de autoRegister no ofrecen. La vista previa la
 * pinta el servidor (ServerSideRender) con el mismo render.php del front.
 */
( function ( wp ) {
	const { registerBlockType } = wp.blocks;
	const { createElement: h, Fragment } = wp.element;
	const { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } = wp.blockEditor;
	const { PanelBody, TextControl, TextareaControl, Button } = wp.components;
	const ServerSideRender = wp.serverSideRender;
	const { __ } = wp.i18n;

	registerBlockType( 'armazon/map', {
		edit( { attributes, setAttributes } ) {
			const blockProps = useBlockProps();
			const text = ( label, key, help ) =>
				h( TextControl, {
					label,
					help,
					value: attributes[ key ],
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
						{ title: __( 'Map settings', 'armazon' ) },
						h( wp.components.ToggleControl, {
							label: __( 'Show the place details', 'armazon' ),
							help: __( 'Turn it off when the address is already next to the map.', 'armazon' ),
							checked: attributes.showDetails,
							onChange: ( value ) => setAttributes( { showDetails: value } ),
						} ),
						text( __( 'Place name', 'armazon' ), 'placeName' ),
						h( TextareaControl, {
							label: __( 'Address', 'armazon' ),
							value: attributes.address,
							onChange: ( value ) => setAttributes( { address: value } ),
						} ),
						text( __( 'Phone', 'armazon' ), 'phone' ),
						h( TextareaControl, {
							label: __( 'Opening hours', 'armazon' ),
							value: attributes.hours,
							onChange: ( value ) => setAttributes( { hours: value } ),
						} ),
						h( TextareaControl, {
							label: __( 'Google Maps embed URL', 'armazon' ),
							help: __( 'Google Maps › Share › Embed a map. You can paste the whole iframe code.', 'armazon' ),
							value: attributes.embedUrl,
							onChange: ( value ) => setAttributes( { embedUrl: value } ),
						} ),
						text(
							__( 'Google Maps link', 'armazon' ),
							'mapsUrl',
							__( 'Optional. Empty: a search for the address.', 'armazon' )
						)
					),
					h(
						PanelBody,
						{ title: __( 'Static map', 'armazon' ), initialOpen: false },
						h( 'p', null, __( 'An OpenStreetMap image made with tools/static-map.mjs, shown under the place details until the visitor loads Google Maps. It must be served by this site.', 'armazon' ) ),
						text(
							__( 'Static map image', 'armazon' ),
							'staticMapUrl',
							__( 'A theme path (assets/maps/place.webp) or a URL of this site.', 'armazon' )
						),
						h(
							MediaUploadCheck,
							null,
							h( MediaUpload, {
								allowedTypes: [ 'image' ],
								value: attributes.staticMapId,
								onSelect: ( media ) => setAttributes( { staticMapId: media.id } ),
								render: ( { open } ) =>
									h(
										Button,
										{ variant: 'secondary', onClick: open },
										attributes.staticMapId ? __( 'Replace image', 'armazon' ) : __( 'Choose from the media library', 'armazon' )
									),
							} )
						),
						attributes.staticMapId
							? h(
									Button,
									{ variant: 'link', isDestructive: true, onClick: () => setAttributes( { staticMapId: 0 } ) },
									__( 'Remove image', 'armazon' )
							  )
							: null
					),
					h(
						PanelBody,
						{ title: __( 'Static image', 'armazon' ), initialOpen: false },
						h( 'p', null, __( 'Optional. Without an image the map shows a box with the place details.', 'armazon' ) ),
						h( wp.components.ToggleControl, {
							label: __( 'Use the featured image of the post', 'armazon' ),
							help: __( 'Inside a Query Loop.', 'armazon' ),
							checked: attributes.useFeaturedImage,
							onChange: ( value ) => setAttributes( { useFeaturedImage: value } ),
						} ),
						h(
							MediaUploadCheck,
							null,
							h( MediaUpload, {
								allowedTypes: [ 'image' ],
								value: attributes.imageId,
								onSelect: ( media ) =>
									setAttributes( {
										imageId: media.id,
										imageUrl: media.sizes?.large?.url || media.url,
										imageAlt: attributes.imageAlt || media.alt || '',
									} ),
								render: ( { open } ) =>
									h(
										Button,
										{ variant: 'secondary', onClick: open },
										attributes.imageId ? __( 'Replace image', 'armazon' ) : __( 'Choose image', 'armazon' )
									),
							} )
						),
						attributes.imageId
							? h(
									Button,
									{
										variant: 'link',
										isDestructive: true,
										onClick: () => setAttributes( { imageId: 0, imageUrl: '' } ),
									},
									__( 'Remove image', 'armazon' )
							  )
							: null,
						text( __( 'Image alternative text', 'armazon' ), 'imageAlt' )
					)
				),
				h( 'div', blockProps, h( ServerSideRender, { block: 'armazon/map', attributes } ) )
			);
		},
		save() {
			return null;
		},
	} );
} )( window.wp );
