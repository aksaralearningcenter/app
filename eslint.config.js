// Flat config ESLint untuk frontend (ES modules, browser). Vendor qrcode.js
// dikecualikan (minified pihak ketiga).
export default [
  {
    ignores: ['node_modules/**', 'docs/src/js/admin/vendor/**']
  },
  {
    files: ['docs/src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        history: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        AbortController: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        NodeFilter: 'readonly',
        CSS: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-dupe-args': 'error'
    }
  }
];