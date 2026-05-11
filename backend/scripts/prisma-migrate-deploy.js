const { spawn } = require('node:child_process');

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.warn(
    '[prisma:migrate] DIRECT_URL is not set; falling back to DATABASE_URL.',
  );
}

const prisma = spawn(
  process.execPath,
  ['./node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  },
);

prisma.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

