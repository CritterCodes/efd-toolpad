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

function ensureWindowsNextJunction() {
  if (!isWindows()) {
    return;
  }

  const projectRoot = process.cwd();
  const localAppData = process.env.LOCALAPPDATA || os.tmpdir();
  const targetPath = path.join(localAppData, 'EngelFineDesign', 'efd-admin-next');
  const linkPath = path.join(projectRoot, '.next');

  fs.mkdirSync(targetPath, { recursive: true });

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
