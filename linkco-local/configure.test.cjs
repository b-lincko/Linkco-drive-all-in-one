/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {hostsFor} = require('./configure.cjs');
const {readFileSync} = require('node:fs');
const path = require('node:path');
test('localhost plus detected LAN IPv4 addresses are trusted without duplicates', () => {
 assert.deepEqual(hostsFor({lo:[{address:'127.0.0.1',family:'IPv4',internal:true}],eth0:[{address:'192.168.1.25',family:'IPv4',internal:false},{address:'fe80::1',family:'IPv6',internal:false}]}, ['192.168.1.25','10.0.0.5']), ['localhost','127.0.0.1','192.168.1.25','10.0.0.5']);
});
test('URLs, wildcards and injected environment lines are rejected', () => {
 for(const host of ['*','http://192.168.1.2','192.168.1.2:8080','x\nPASSWORD=bad']) assert.throws(() => hostsFor({},[host]));
});
test('no network interfaces still permits loopback', () => assert.deepEqual(hostsFor({}), ['localhost','127.0.0.1']));
test('local config does not force a single host or trust arbitrary hosts', () => {
 const php=readFileSync(path.join(__dirname,'config.php'),'utf8');
 assert.match(php, /'trusted_domains'\s*=>/);
 assert.doesNotMatch(php, /'overwrite(?:host|protocol)'\s*=>/);
 assert.match(php, /'defaultapp'\s*=>\s*'nextcloud-aio'/);
});
test('Compose must not pre-populate the configuration directory with a bind mount', () => {
 const compose = readFileSync(path.join(__dirname,'../compose.linkco.yaml'),'utf8');
 assert.doesNotMatch(compose, /\.\/linkco-local\/config\.php:/);
 const dockerfile = readFileSync(path.join(__dirname,'Dockerfile'),'utf8');
 assert.match(dockerfile, /COPY linkco-local\/config.php \/usr\/src\/nextcloud\/config\/linkco.config.php/);
});
test('repair refuses existing installations and nonempty databases before restoring install files', () => {
 const php = readFileSync(path.join(__dirname,'repair.php'),'utf8');
 assert.match(php, /\$CONFIG\['installed'\]/);
 assert.match(php, /\$CONFIG\['version'\]/);
 assert.match(php, /\$count !== 0/);
 const shell = readFileSync(path.join(__dirname,'repair.sh'),'utf8');
 assert.ok(shell.indexOf('php /opt/linkco-repair.php') < shell.indexOf('touch config/CAN_INSTALL'));
 assert.doesNotMatch(shell, /rm -rf|DROP TABLE|DROP DATABASE/);
});
