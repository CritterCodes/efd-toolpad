/**
 * Dev launcher for the Claude Preview harness only.
 *
 * The NextAuth credentials provider self-fetches `${NEXT_PUBLIC_URL}/api/auth/signin`.
 * `.env.local` pins that to :3001 (the canonical dev port), but the preview harness
 * runs the app on an auto-assigned PORT. This wrapper overrides NEXT_PUBLIC_URL /
 * NEXTAUTH_URL to the preview's own origin so auth works in-instance, WITHOUT
 * touching .env.local (so a normal `npm run dev` on 3001 is unaffected).
 */
import { spawnSync, spawn } from 'node:child_process';

const port = process.env.PORT || '3099';
const origin = `http://localhost:${port}`;
const env = { ...process.env, NEXT_PUBLIC_URL: origin, NEXTAUTH_URL: origin };

// Ensure the .next working dir junction exists (normal predev step).
spawnSync(process.execPath, ['scripts/prepare-next-dir.js'], { stdio: 'inherit', env });

// next dev binds to PORT when no --port flag is given.
const child = spawn('npx', ['next', 'dev'], { stdio: 'inherit', env, shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
