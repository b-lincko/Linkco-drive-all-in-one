/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const net = require('node:net');
function hostsFor(interfaces, extra = []) {
 const detected = Object.values(interfaces).flat().filter(i => i && !i.internal && i.family === 'IPv4').map(i => i.address);
 for (const host of extra) if (!net.isIP(host)) throw new Error(`Expected an IP address, not a URL or hostname: ${host}`);
 return [...new Set(['localhost', '127.0.0.1', ...detected, ...extra])];
}
if (require.main === module) {
 try {
  const target = path.resolve(__dirname, '../.env.linkco');
  if (fs.existsSync(target)) throw new Error('.env.linkco already exists. Edit LINKCO_TRUSTED_HOSTS there to add an IP; existing credentials were not changed.');
  const hosts = hostsFor(os.networkInterfaces(), process.argv.slice(2));
  const content = `# Local Linkco credentials. Keep private; never commit.\nLINKCO_PORT=8090\nLINKCO_BIND_ADDRESS=0.0.0.0\nLINKCO_TRUSTED_HOSTS="${hosts.join(' ')}"\nLINKCO_ADMIN_USER=admin\nLINKCO_ADMIN_PASSWORD=${crypto.randomBytes(24).toString('hex')}\nLINKCO_DB_PASSWORD=${crypto.randomBytes(24).toString('hex')}\n`;
  fs.writeFileSync(target, content, {mode: 0o600, flag:'wx'});
  console.log(`Created .env.linkco with random passwords. Login: admin (password in .env.linkco).\nTrusted hosts: ${hosts.join(', ')}\nStart: docker compose --env-file .env.linkco -f compose.linkco.yaml up -d --build\nOpen: http://localhost:8090 or http://YOUR-LAN-IP:8090`);
 } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {hostsFor};
