import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
process.umask(0o077);
const env = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' };
const network = 'zilber-local';
const cli = (...args) =>
  execFileSync(path.join(root, 'node_modules/.bin/supabase'), args, {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function status() {
  return JSON.parse(cli('status', '-o', 'json'));
}

function show(s) {
  for (const key of ['API_URL', 'STUDIO_URL', 'MAILPIT_URL', 'DB_URL']) {
    if (s[key]) console.log(`${key}=${s[key]}`);
  }
  console.log('Credentials synced to .env.local');
}

function sync(s) {
  const target = path.join(root, '.env.local');
  let text = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: s.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: s.ANON_KEY || s.PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
    DATABASE_URL: s.DB_URL,
  };
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    text = regex.test(text) ? text.replace(regex, () => `${key}=${value}`) : text + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(target, text.trim() + '\n', { mode: 0o600 });
}

try {
  const action = process.argv[2] || 'status';
  if (action === 'start') {
    let exists = false;
    try {
      const value = JSON.parse(docker('network', 'inspect', network))[0];
      exists = true;
      if (value.Options['com.docker.network.bridge.host_binding_ipv4'] !== '127.0.0.1') {
        throw new Error('Unsafe existing network');
      }
    } catch (error) {
      if (exists) throw error;
    }
    if (!exists) {
      docker('network', 'create', '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network);
    }
    cli('start', '--network-id', network);
    const s = status();
    sync(s);
    show(s);
  } else if (action === 'stop') {
    cli('stop');
    console.log('Local services stopped; persistent data retained.');
  } else if (action === 'status') {
    show(status());
  } else if (action === 'sync') {
    const s = status();
    sync(s);
    show(s);
  } else {
    throw new Error('Use start, stop, status, or sync');
  }
} catch (error) {
  console.error(`Supabase script failed: ${error.stderr || error.stdout || error.message}`);
  process.exitCode = 1;
}
