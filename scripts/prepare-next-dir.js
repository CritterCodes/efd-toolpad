const fs = require('fs');
const os = require('os');
const path = require('path');

function isWindows() {
  return process.platform === 'win32';
}

function removePath(targetPath) {
  fs.rmSync(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}

/**
 * Node resolves `require('react/jsx-runtime')` by walking UP from the requiring file. The build output
 * lives in LOCALAPPDATA, where there is no `node_modules` on any parent — so the moment anything in
 * `.next/server` requires a bare package name, it throws MODULE_NOT_FOUND and the whole server 500s.
 *
 * `next build` survives it (the compiler resolves from the project root), which is why this went
 * unnoticed: the build goes green and then `next start` AND `next dev` both fail on the first request
 * with "Cannot find module 'react/jsx-runtime' … .next/server/pages/_document.js". It reads like a
 * broken install rather than a path problem, and in a worktree the natural suspicion is the
 * node_modules junction, which is fine.
 *
 * One junction beside the output fixes it: resolution finds `<output>/node_modules` on the first hop up.
 * Found 2026-10-14, when a UI change could not be checked locally because nothing would serve at all.
 */
function ensureModulesBesideOutput(targetPath, projectRoot) {
  const modules = path.join(projectRoot, 'node_modules');
  const link = path.join(targetPath, 'node_modules');
  if (!fs.existsSync(modules)) return;          // nothing installed yet; the build will say so
  if (fs.existsSync(link)) return;              // already linked (or a real directory someone made)
  try {
    fs.symlinkSync(fs.realpathSync(modules), link, 'junction');
    console.log(`[prepare-next-dir] Linked node_modules beside the build output -> ${link}`);
  } catch (error) {
    // Not fatal: the build still works, and only the server would fail. Say what to do about it.
    console.warn(`[prepare-next-dir] Could not link node_modules beside ${targetPath}: ${error.message}`);
    console.warn('[prepare-next-dir] `next start` / `next dev` may fail with MODULE_NOT_FOUND on jsx-runtime.');
  }
}

function ensureWindowsNextJunction() {
  if (!isWindows()) {
    return;
  }

  const projectRoot = process.cwd();
  const localAppData = process.env.LOCALAPPDATA || os.tmpdir();
  const targetPath = path.join(localAppData, 'EngelFineDesign', 'efd-admin-next');
  const linkPath = path.join(projectRoot, '.next');

  fs.mkdirSync(targetPath, { recursive: true });
  ensureModulesBesideOutput(targetPath, projectRoot);

  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);

    if (stats.isSymbolicLink()) {
      const existingTarget = fs.realpathSync(linkPath);
      const normalizedExisting = path.resolve(existingTarget);
      const normalizedTarget = path.resolve(targetPath);

      if (normalizedExisting.toLowerCase() === normalizedTarget.toLowerCase()) {
        console.log(`[prepare-next-dir] Using existing .next junction -> ${targetPath}`);
        return;
      }
    }

    removePath(linkPath);
  }

  fs.symlinkSync(targetPath, linkPath, 'junction');
  console.log(`[prepare-next-dir] Redirected .next -> ${targetPath}`);
}

try {
  ensureWindowsNextJunction();
} catch (error) {
  console.error('[prepare-next-dir] Failed to prepare .next directory');
  console.error(error);
  process.exit(1);
}
