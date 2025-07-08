// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
			 image: {
   service: passthroughImageService(),
 },
	integrations: [

		starlight({
			title: 'Go-Agentic v0.0.2',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/sklyt/go-agentic' }],
			sidebar: [
				{
					label: 'Start',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Getting Started', slug: 'guides/example' },
						{label: 'Function Call', slug: 'guides/fncall' },
					],
				},
				// {
				// 	label: 'Reference',
				// 	autogenerate: { directory: 'reference' },
				// },
			],
		}),
	],
});
