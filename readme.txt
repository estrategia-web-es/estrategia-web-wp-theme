=== Estrategia Web ===
Contributors: estrategiaweb
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A neutral block theme to build small business sites on, with the brand in a child theme.

== Description ==

Estrategia Web is a block theme made to be a parent: templates, template parts and a base theme.json with a spacing scale, fluid typography and a neutral palette. It carries no branding on purpose. Each site adds its colours, fonts and patterns in a child theme, so the parent can be updated without touching any of that.

* Templates for the front page, pages, posts, archives, search and 404.
* System fonts and no build step: nothing to download before the first paint.
* Only the styles of the blocks a page uses, with critical CSS inline.
* Translated into Spanish and Catalan.

= Recommended plugin =

The footer includes a WhatsApp button block from the Estrategia Web plugin. Without the plugin the theme works the same and the button is simply not shown.

== Frequently Asked Questions ==

= How do I add my brand? =

Create a child theme with `Template: estrategia-web` in its style.css and redefine the palette, font and size slugs in its theme.json. The parent's templates pick them up.

= Does it need the Estrategia Web plugin? =

No. The plugin adds blocks the theme can use (WhatsApp button, map, carousel, language switcher); without it, those blocks are not rendered and there is no error.

== Changelog ==

= 1.1.0 =
* The theme no longer registers blocks: they moved to the Estrategia Web plugin.

== Copyright ==

Estrategia Web WordPress Theme, (C) 2026 Estrategia Web.
Estrategia Web is distributed under the terms of the GNU GPL.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

== Resources ==

* screenshot.png: made by Estrategia Web from the theme itself with sample text, no third-party images. License: GPLv2 or later.
