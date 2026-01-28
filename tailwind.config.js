/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		extend: {
			colors: {
				slate: {
					850: '#1a1d21',
					900: '#131518',
					950: '#0d0f12',
				},
				amber: {
					400: '#d4a574',
					500: '#b8956a',
				}
			},
			fontFamily: {
				sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
				serif: ['Newsreader', 'Georgia', 'serif'],
				mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
			},
			animation: {
				'fade-in': 'fadeIn 0.3s ease forwards',
				'slide-up': 'slideUp 0.3s ease forwards',
				'slide-in': 'slideIn 0.3s ease forwards',
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
};
