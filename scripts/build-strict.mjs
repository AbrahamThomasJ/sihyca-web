// Build de producción: falla si la configuración aún usa el dominio de ejemplo.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['astro', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, STRICT_CONFIG: '1' },
});
process.exit(result.status ?? 1);
