const { spawn } = require('node:child_process');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      ...options,
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

async function main() {
  const shouldRunMigrations =
    process.env.RUN_PRISMA_MIGRATIONS === 'true' || Boolean(process.env.DIRECT_URL);

  if (shouldRunMigrations) {
    console.log('[render-start] Running Prisma migrations before starting the API.');
    await run(process.execPath, ['scripts/prisma-migrate-deploy.js']);
  } else {
    console.warn(
      '[render-start] Skipping Prisma migrations because DIRECT_URL is not set. ' +
        'Set DIRECT_URL or RUN_PRISMA_MIGRATIONS=true to enable startup migrations.',
    );
  }

  await run(process.execPath, ['dist/src/main.js']);
}

main().catch((error) => {
  console.error('[render-start]', error.message);
  process.exit(1);
});
