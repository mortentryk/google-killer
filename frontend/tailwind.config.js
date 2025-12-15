/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0f0f12',
                surface: '#1b1b21',
                primary: '#6c63ff',
                text: '#eaeaea',
                textSecondary: '#b6b6c9',
            },
        },
    },
    plugins: [],
}
