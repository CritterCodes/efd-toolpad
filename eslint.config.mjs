// efd-admin lint — GUARDRAILS_PLAN Phase 1 (docs/GUARDRAILS_PLAN.md), modelled on Kuzu's eslint.config.mjs.
//
// THE RATCHET. Every rule below is an error. Violations that existed on 2026-09-30 are recorded in
// eslint-suppressions.json (ESLint's bulk suppressions) — CI fails on any NEW violation, and ESLint
// fails when a recorded one has been fixed but not pruned, so the file can only shrink:
//   npm run lint                 the gate (CI)
//   npm run lint:prune           after fixing violations: drop them from the baseline
//   npm run guardrails:report    violations left, per rule (the plan's scoreboard)
// Never add to the baseline (`--suppress-all`) to make a new violation pass — fix it.
import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve next's plugins (react, react-hooks, jsx-a11y, import, @next/next) from eslint-config-next itself, so
// the config loads the same way under the local pnpm workspace and CI's flat npm install.
const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  resolvePluginsRelativeTo: dirname(require.resolve('eslint-config-next')),
});

const BROWSER_NODE_GLOBALS = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', localStorage: 'readonly',
  sessionStorage: 'readonly', fetch: 'readonly', FormData: 'readonly', File: 'readonly', Blob: 'readonly',
  URL: 'readonly', URLSearchParams: 'readonly', Headers: 'readonly', Request: 'readonly', Response: 'readonly',
  AbortController: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly', process: 'readonly', Buffer: 'readonly', global: 'readonly',
  globalThis: 'readonly', __dirname: 'readonly', __filename: 'readonly', module: 'writable', require: 'readonly',
  exports: 'writable', crypto: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', atob: 'readonly',
  btoa: 'readonly', structuredClone: 'readonly', queueMicrotask: 'readonly', Image: 'readonly',
  FileReader: 'readonly', XMLHttpRequest: 'readonly', WebSocket: 'readonly', Notification: 'readonly',
  IntersectionObserver: 'readonly', ResizeObserver: 'readonly', MutationObserver: 'readonly', Event: 'readonly',
  CustomEvent: 'readonly', HTMLElement: 'readonly', HTMLCanvasElement: 'readonly', HTMLInputElement: 'readonly',
  Element: 'readonly', Node: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly', alert: 'readonly',
  confirm: 'readonly', prompt: 'readonly', self: 'readonly', caches: 'readonly', clients: 'readonly',
  performance: 'readonly', screen: 'readonly', history: 'readonly', DOMParser: 'readonly', Intl: 'readonly',
  MediaRecorder: 'readonly', MediaStream: 'readonly', AudioContext: 'readonly', BarcodeDetector: 'readonly',
  PushManager: 'readonly', ServiceWorkerRegistration: 'readonly', setImmediate: 'readonly', clearImmediate: 'readonly',
};
const TEST_GLOBALS = {
  describe: 'readonly', it: 'readonly', test: 'readonly', expect: 'readonly', vi: 'readonly',
  beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
};

// Who may talk to the database (Kuzu ADR-0002, efd-shaped): the database helpers and the model layer.
const DB_LAYER = ['src/lib/**', 'src/**/model.js', 'src/**/model/**', 'src/**/models/**', 'src/**/*.model.js', 'scripts/**'];
// Code that runs in the browser — it must never reach the database or server-only code.
const CLIENT_SIDE = ['src/app/components/**', 'src/components/**', 'src/hooks/**', 'src/context/**', 'src/app/**/components/**'];

export default [
  { ignores: ['.next/**', 'node_modules/**', 'graphify-out/**', 'public/**', 'coverage/**', '**/*.min.js'] },
  ...compat.extends('next/core-web-vitals'),
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: BROWSER_NODE_GLOBALS },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
      // Shipped code never console.logs (Kuzu ADR-0016); warn/error stay — that's how a route reports a failure.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // A page is assembly, not a 2,000-line program (Kuzu ADR-0006: thin screens over the kit).
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      // Circular imports: import/no-cycle took >10 min on 1,300 files, so it is NOT in the per-push gate. Kuzu runs
      // dependency-cruiser for this; efd gets it as a separate weekly job (GUARDRAILS_PLAN Phase 1, item 6).
      // Accessibility (Kuzu ADR-0016): alt text, labels, keyboard access.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/heading-has-content': 'error',
    },
  },
  {
    // Outside the database layer nobody opens a connection: MongoClient & co. live in lib/database and the
    // models. The ObjectId type is fine anywhere; tests start their own in-memory database.
    files: ['src/**/*.js', 'src/**/*.jsx'],
    ignores: [...DB_LAYER, '**/*.test.js', '**/*.test.jsx', '**/catalogFixtures.js'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'mongodb', allowImportNames: ['ObjectId'], message: 'Only the database helpers and model files open a database connection (GUARDRAILS_PLAN Phase 1). Use lib/database or a model.' }],
      }],
    },
  },
  {
    files: CLIENT_SIDE,
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'mongodb', message: 'Browser code never touches the database.' }],
        patterns: [
          { group: ['@/lib/database', '@/lib/database/*', '**/lib/database'], message: 'Browser code never touches the database — call an API route.' },
          { group: ['@/app/api/**/model', '@/app/api/**/service', '@/app/api/**/model.js', '@/app/api/**/service.js'], message: 'Browser code never imports server models or services — call an API route.' },
        ],
      }],
    },
  },
  {
    // Server routes never import screens.
    files: ['src/app/api/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [],
        patterns: [{ group: ['@/app/dashboard/**', '@/app/components/**', '@/components/**'], message: 'An API route never imports UI code.' }],
      }],
    },
  },
  {
    // Scripts and tests print and run long by design.
    files: ['scripts/**', '**/*.test.js', '**/*.test.jsx', '**/*.mjs'],
    rules: { 'no-console': 'off', 'max-lines': 'off' },
  },
  { files: ['**/*.test.js', '**/*.test.jsx'], languageOptions: { globals: TEST_GLOBALS } },
];
