/**
 * Font CSS variables for layout.
 *
 * Avoid `next/font/google` here: loaders must be module-scope consts and they
 * block e2e/air-gapped boots on network fetch. Stacks are declared in
 * `app/globals.css` (@theme --font-sans / serif / mono) with Source * names
 * and system fallbacks.
 */
export const sans = { variable: "--font-sans-face", className: "" }
export const serif = { variable: "--font-serif-face", className: "" }
export const mono = { variable: "--font-mono-face", className: "" }
