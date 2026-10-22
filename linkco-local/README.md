<!-- SPDX-FileCopyrightText: 2026 Linkco contributors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Linkco Drive — localhost and LAN installation

This separate deployment runs the real file service with login and persistent
storage **without a domain**. It uses the standard Nextcloud Apache image,
PostgreSQL, Redis, and the custom Linkco dashboard. It does not run the AIO
mastercontainer or provide AIO's managed backups, Office, Talk, or update tooling.
The existing `compose.yaml` is unchanged.

## Requirements

- Docker Engine / Docker Desktop with Compose v2.
- Node.js 22+ for the one-time password and trusted-IP configuration helper.
- Internet access to pull the container images, and free local port 8090.
- Run on your own computer/server, not inside the Arena preview environment.

## Start

From the repository root:

```sh
node linkco-local/configure.cjs
docker compose --env-file .env.linkco -f compose.linkco.yaml up -d --build
```

The helper creates **`.env.linkco`**, with randomly generated passwords, localhost,
127.0.0.1 and the machine's detected LAN IPv4 addresses. It refuses to overwrite
existing credentials. Open that file locally to find `LINKCO_ADMIN_PASSWORD`.
Do not share it or commit it. The username defaults to `admin`.

On Docker Desktop/WSL, if the helper detects a VM IP rather than your host's LAN
IP, provide the host IP explicitly on the first run:

```sh
node linkco-local/configure.cjs 192.168.1.50
```

Replace the example with your actual IP (`ipconfig` on Windows or `ip addr` on
Linux). For an existing configuration edit `LINKCO_TRUSTED_HOSTS` in `.env.linkco`.
Keep the hosts space-separated inside its quotes, with no scheme, path, or port.
Then rerun the Compose up command so the containers get the updated environment.

Wait for initial installation and the Linkco branding hook to finish:

```sh
docker compose --env-file .env.linkco -f compose.linkco.yaml logs -f drive
```

If `configure.cjs` is missing, you have an older download. Download the latest
branch ZIP again and extract it into a **new folder**, then run these commands
from the folder containing `compose.linkco.yaml`. `.env.linkco` is generated
locally, so it is intentionally not included in the ZIP.

Then open:

- On the server/computer: **http://localhost:8090**
- On another device on the same LAN: **http://YOUR-SERVER-IP:8090**

Use **HTTP**, not HTTPS, and do not add `/containers`. The blue AIO domain
installer at `https://localhost:8080/containers` is a different service; leave
its data/volumes untouched. The local Linkco setup defaults to port 8090 to avoid
that conflict.

Sign in as `admin` using the generated password. The default landing app is
Linkco Drive. The direct route is `/index.php/apps/nextcloud-aio/drive`.
Create regular users in administration settings rather than using admin daily.

The login name, slogan, logo and primary color are configured through Nextcloud
Theming. The custom dashboard uses Linkco branding. Technical identifiers,
copyright/license notices and third-party attribution remain intact; some
upstream administration/help pages may still mention Nextcloud.

## Local network security

This configuration uses **HTTP**, not HTTPS. Credentials and files are not
encrypted in transit. Use only a trusted local/test network. Do not port-forward
8090, expose it to the public internet, or use it on untrusted/public Wi-Fi.
Restrict inbound TCP 8090 in your firewall to the local subnet. HTTPS with a
trusted certificate is required for public deployment and recommended for real
sensitive data. Some browser features require HTTPS and may not work over LAN HTTP.

To permit localhost only, set `LINKCO_BIND_ADDRESS=127.0.0.1` in `.env.linkco`.
By default it binds to all interfaces for LAN access, but the application only
accepts explicitly configured trusted hosts. A trusted-host entry is **not** a
firewall rule. `localhost` on a phone means the phone, not the server: use the
server's LAN IP instead. For external remote access, use a properly secured VPN
or a separate HTTPS deployment, not this HTTP port exposed directly.

## Updates and persistence

Files, accounts, settings and database live in named Docker volumes. Stop with:

```sh
docker compose --env-file .env.linkco -f compose.linkco.yaml down
```

Do **not** use `down -v`: that deletes the persistent volumes. Back up the
volumes/database before changes; this setup does not configure automatic backups.
Changing the initial admin or database password in `.env.linkco` after installation
does not rotate the stored account/database passwords. Use Nextcloud's account
settings and PostgreSQL's password-management tools instead.

For dashboard source updates, rebuild/recreate, then refresh the installed app:

```sh
docker compose --env-file .env.linkco -f compose.linkco.yaml up -d --build
docker compose --env-file .env.linkco -f compose.linkco.yaml exec drive sh /docker-entrypoint-hooks.d/post-installation/linkco.sh
```

The hook reapplies the default Linkco branding; it does not delete user files.
Upgrade Nextcloud separately following upstream's supported version-by-version
upgrade procedure. This app declares compatibility with Nextcloud 34–35; this
Dockerfile targets the official `nextcloud:34-apache` image. Never point this at
existing AIO data volumes; it is an independent installation.

## Checks and deployment verification

```sh
node --test app/tests/*.test.cjs linkco-local/configure.test.cjs
```

Docker and PHP are not installed in the development sandbox, so a full image
build and runtime login/upload test have not been executed here. On your host:

1. Run `docker compose --env-file .env.linkco -f compose.linkco.yaml config --quiet`.
2. Build/start; verify the initialization and branding hook succeed in logs.
3. Check Linkco login branding at both localhost and the configured LAN IP.
4. Sign in as a normal user; verify own files only, folder creation, uploads,
   downloads, favorites and persistence after restarting containers.
5. Verify an unconfigured Host header is rejected as an untrusted domain.
6. Confirm cron runs and administration shows no background-job errors.

## Recover the initial configuration error (older local setup)

The original local Compose file bind-mounted a file into the config directory
before installation. The official entrypoint then saw a nonempty directory and
skipped copying stock configuration, including `CAN_INSTALL`. This can produce
“Configuration was not read or initialized correctly, not overwriting …config.php”.
The fixed Compose file does not mount individual files there. Keep your existing
`.env.linkco` (same credentials) when updating the source. Do not delete volumes.

From the updated source folder, using the original `.env.linkco`:

```sh
docker compose --env-file .env.linkco -f compose.linkco.yaml stop drive cron
docker compose --env-file .env.linkco -f compose.linkco.yaml build drive
docker compose --env-file .env.linkco -f compose.linkco.yaml up -d database redis
docker compose --env-file .env.linkco -f compose.linkco.yaml run --rm --no-deps --entrypoint sh drive /opt/linkco-repair.sh
docker compose --env-file .env.linkco -f compose.linkco.yaml up -d --force-recreate
```

The recovery script first **refuses to proceed** if the configuration indicates
an installed version or if the database contains any tables. It restores missing
stock configuration only for an uninstalled instance with an empty database, then
runs the installer and branding hook explicitly. If it refuses or fails, do not
reset the database: collect `logs --tail=100 drive` for diagnosis (redact secrets
before sharing). It has not been runtime-tested in the development sandbox.
