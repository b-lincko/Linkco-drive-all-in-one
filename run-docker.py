#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Linkco contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Start Linkco locally. Python 3.10+, Docker Desktop; no pip or Node required."""
import argparse
import getpass
import ipaddress
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / '.env.linkco'
PROJECT = 'linkco-local'


def docker(*args, capture=True, check=True, env=None):
    result = subprocess.run(['docker', *args], cwd=ROOT, text=True,
                            capture_output=capture, env=env)
    if check and result.returncode:
        # Do not print captured inspect/config output: it may contain secrets.
        raise RuntimeError('Docker command failed. Check Docker Desktop and the local container logs.')
    return result


def compose(*args, **kwargs):
    return docker('compose', '--env-file', str(ENV_FILE), '-f',
                  str(ROOT / 'compose.linkco.yaml'), *args, **kwargs)


def read_env(text):
    values = {}
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    return values


def local_hosts(extra):
    hosts = ['localhost', '127.0.0.1']
    try:
        for result in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = result[4][0]
            if ipaddress.ip_address(ip).is_private and ip not in hosts:
                hosts.append(ip)
    except socket.gaierror:
        pass
    for ip in extra:
        address = ipaddress.ip_address(ip)
        if address.version != 4:
            raise ValueError('Use a LAN IPv4 address with --ip.')
        if ip not in hosts:
            hosts.append(ip)
    return hosts


def recovered_environment():
    result = docker('ps', '-aq', '--filter', f'label=com.docker.compose.project={PROJECT}',
                    '--filter', 'label=com.docker.compose.service=drive')
    for container in result.stdout.split():
        data = json.loads(docker('inspect', container).stdout)[0]
        env = dict(item.split('=', 1) for item in data.get('Config', {}).get('Env', []) if '=' in item)
        if env.get('POSTGRES_PASSWORD') and env.get('NEXTCLOUD_ADMIN_PASSWORD'):
            return env
    return {}


def prepare_config(extra_ips):
    old = ENV_FILE.read_text(encoding='utf-8-sig') if ENV_FILE.exists() else ''
    values = read_env(old)
    required = ('LINKCO_ADMIN_PASSWORD', 'LINKCO_DB_PASSWORD')
    if not all(values.get(key) for key in required):
        recovered = recovered_environment()
        volumes = docker('volume', 'ls', '-q', '--filter',
                         f'label=com.docker.compose.project={PROJECT}').stdout.strip()
        # Also catch volumes whose Compose labels were removed or imported.
        named = docker('volume', 'ls', '--format', '{{.Name}}').stdout.splitlines()
        existing = bool(volumes) or any(name in named for name in
            ('linkco-local_linkco_html', 'linkco-local_linkco_database'))
        if existing and not recovered:
            raise RuntimeError('Existing Linkco data found, but original passwords could not be recovered. '
                               'Restore the original .env.linkco. Nothing was deleted or reset.')
        values.setdefault('LINKCO_ADMIN_USER', recovered.get('NEXTCLOUD_ADMIN_USER', 'admin'))
        for key, source in [('LINKCO_ADMIN_PASSWORD', 'NEXTCLOUD_ADMIN_PASSWORD'),
                            ('LINKCO_DB_PASSWORD', 'POSTGRES_PASSWORD')]:
            # Recovered credentials win over partial/mismatched files.
            values[key] = recovered[source] if recovered else values.get(key) or secrets.token_hex(24)
        print('Recovered installation settings.' if recovered else 'Created new installation passwords.')
    hosts = values.get('LINKCO_TRUSTED_HOSTS', '').split()
    for host in local_hosts(extra_ips):
        if host not in hosts:
            hosts.append(host)
    values.update(LINKCO_TRUSTED_HOSTS=' '.join(hosts))
    values.setdefault('LINKCO_PORT', '8090')
    values.setdefault('LINKCO_BIND_ADDRESS', '0.0.0.0')
    values.setdefault('LINKCO_ADMIN_USER', 'admin')
    if not values['LINKCO_PORT'].isdigit() or not 1 <= int(values['LINKCO_PORT']) <= 65535:
        raise ValueError('LINKCO_PORT must be between 1 and 65535.')
    # Prevent unescaped dotenv expansion/newline injection. Generated passwords
    # use hex; preserve, but refuse to rewrite unsupported manually edited values.
    if any(any(char in value for char in '\r\n"\'$`\\') for value in values.values()):
        raise ValueError('Configuration contains unsupported quoting/expansion characters. Original file left unchanged.')
    content = '# Linkco local credentials. Keep private. Never commit.\n'
    content += ''.join(f'{key}="{value}"\n' for key, value in values.items())
    if content != old:
        if old.strip():
            backup = ROOT / '.env.linkco.backup'
            if not backup.exists():
                backup.write_text(old, encoding='utf-8')
                os.chmod(backup, 0o600)
        temporary = ROOT / '.env.linkco.tmp'
        temporary.write_text(content, encoding='utf-8')
        os.chmod(temporary, 0o600)
        temporary.replace(ENV_FILE)
    return values


def ensure_docker():
    if not shutil.which('docker'):
        raise RuntimeError('Install Docker Desktop for Windows, enable Linux containers, and run this file again.')
    if docker('info', check=False).returncode:
        desktop = Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'Docker/Docker/Docker Desktop.exe'
        if os.name != 'nt' or not desktop.exists():
            raise RuntimeError('Start Docker Desktop (Linux containers), then run again.')
        print('Starting Docker Desktop. Waiting up to two minutes…')
        subprocess.Popen([str(desktop)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.monotonic() + 120
        while docker('info', check=False).returncode:
            if time.monotonic() > deadline:
                raise RuntimeError('Docker Desktop is not ready. Complete its startup, then try again.')
            time.sleep(4)
    docker('compose', 'version')


def ready(url, timeout):
    # Ignore system HTTP proxies for the localhost readiness check.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with opener.open(url + '/status.php', timeout=5) as response:
                status = json.load(response)
            if status.get('installed') and not status.get('maintenance') and not status.get('needsDbUpgrade'):
                return
        except (OSError, ValueError, urllib.error.URLError):
            pass
        time.sleep(4)
    raise RuntimeError('Installation did not become ready. Run the logs command shown below. '
                       'For the earlier failed first-install issue, rerun with --repair; '
                       'repair refuses existing installations or databases containing tables.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip', action='append', default=[], help='Add server LAN IPv4 address (repeatable)')
    parser.add_argument('--repair', action='store_true', help='Guarded recovery of the earlier failed, empty installation')
    parser.add_argument('--reset-password', action='store_true', help='Prompt for and reset the local administrator password')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--timeout', type=int, default=600, help='Seconds to wait for installation')
    args = parser.parse_args()
    try:
        if not (ROOT / 'compose.linkco.yaml').is_file():
            raise RuntimeError('Keep run-docker.py in the extracted project folder alongside compose.linkco.yaml.')
        local_hosts(args.ip)  # Validate before any changes.
        ensure_docker()
        values = prepare_config(args.ip)
        print('Local HTTP only: do not expose this port to the internet.')
        compose('config', '--quiet')
        if args.repair:
            compose('stop', 'drive', 'cron', capture=False)
            compose('build', 'drive', capture=False)
            compose('up', '-d', 'database', 'redis', capture=False)
            compose('run', '--rm', '--no-deps', '--entrypoint', 'sh', 'drive',
                    '/opt/linkco-repair.sh', capture=False)
        print('Building and starting Linkco. The first build can take several minutes…')
        compose('up', '-d', '--build', capture=False)
        url = f'http://127.0.0.1:{values["LINKCO_PORT"]}'
        print('Waiting for installation…')
        ready(url, args.timeout)
        # Reapply branding/app files even if a prior branding hook failed.
        compose('exec', '-T', 'drive', 'sh',
                '/docker-entrypoint-hooks.d/post-installation/linkco.sh', capture=False)
        if args.reset_password:
            password = getpass.getpass('New administrator password (not shown): ')
            if len(password) < 12 or password != getpass.getpass('Confirm password: '):
                raise ValueError('Passwords must match and be at least 12 characters. Password was not changed.')
            env = dict(os.environ, OC_PASS=password)
            compose('exec', '-T', '-u', 'www-data', '-e', 'OC_PASS', 'drive', 'php', 'occ',
                    'user:resetpassword', '--password-from-env', values['LINKCO_ADMIN_USER'], env=env)
            print('Administrator password changed. Use the password you just entered; the env file contains the initial seed only.')
        print(f'\nLinkco is ready: {url}\nUsername: {values["LINKCO_ADMIN_USER"]}')
        print('Initial password is LINKCO_ADMIN_PASSWORD in .env.linkco (open locally in Notepad).')
        print('For an existing account whose password changed, rerun with --reset-password.')
        for host in values['LINKCO_TRUSTED_HOSTS'].split():
            if host not in ('localhost', '127.0.0.1'):
                print(f'LAN address: http://{host}:{values["LINKCO_PORT"]}')
        if not args.no_browser:
            webbrowser.open(url)
        return 0
    except (RuntimeError, ValueError, OSError) as error:
        print(f'\nStopped: {error}', file=sys.stderr)
        print('No volumes were deleted. Do not use down -v.', file=sys.stderr)
        print('Logs: docker compose --env-file .env.linkco -f compose.linkco.yaml logs --tail=100 drive', file=sys.stderr)
        return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print('\nCancelled. Existing data and any started containers are preserved.')
        sys.exit(130)
