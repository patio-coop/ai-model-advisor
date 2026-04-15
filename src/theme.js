// OSAI Design System — Terminal Theme
// Maps Figma design tokens to terminal-compatible values for ink/chalk

export const THEME = {
  brand: {
    name: 'OSAI',
    tagline: 'OPEN-SOURCE AI COMPASS',
    subtitle: 'Find and deploy the right open LLM for your stack',
  },
  colors: {
    // Primary
    accent: '#35FF38',       // neon green - CTAs, highlights, active states
    accentDim: '#45FA4F',    // secondary green
    // Backgrounds
    bgDark: '#191A17',       // hero bg
    bgMedium: '#232420',     // card bg
    bgLight: '#F7F7F7',      // light sections
    // Text
    textPrimary: 'white',
    textSecondary: 'gray',
    textOnDark: 'white',
    textOnLight: '#000000',
    // Accents
    blue: '#96D8FD',
    teal: '#94C9E7',
    // Semantic
    success: '#35FF38',
    warning: '#FFB800',
    error: '#FF4444',
    info: '#96D8FD',
  },
  borders: {
    header: 'double',
    section: 'single',
    card: 'round',
    highlight: 'bold',
  },
  // ASCII wireframe globe — inspired by Figma hero section
  logo: [
    '         .--~~--.         ',
    '        /  .--.  \\        ',
    '       | /    \\ |        ',
    '    .--+--------+--.     ',
    '   /   |  .--.  |   \\    ',
    '  |  --+--    --+--  |   ',
    '   \\   |  `--\'  |   /    ',
    '    `--+--------+--\'     ',
    '       | \\    / |        ',
    '        \\  `--\'  /        ',
    '         `--~~--\'         ',
  ].join('\n'),
  // "OSAI" block wordmark — clean, bold, max 5 lines
  wordmark: [
    '  ___  ____    _    ___ ',
    ' / _ \\/ ___|  / \\  |_ _|',
    '| | | \\___ \\ / _ \\  | | ',
    '| |_| |___) / ___ \\ | | ',
    ' \\___/|____/_/   \\_\\___|',
  ].join('\n'),
};
