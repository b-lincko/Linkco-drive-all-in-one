#!/bin/sh
# SPDX-FileCopyrightText: 2026 Linkco contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
set -eu
php /opt/linkco-repair.php
cd /var/www/html
mkdir -p config
# Preserve existing configuration; restore stock files skipped by the old bind mount.
for file in /usr/src/nextcloud/config/*; do
    name=$(basename "$file")
    if [ ! -e "config/$name" ]; then
        cp -a "$file" "config/$name"
    fi
done
cp /usr/src/nextcloud/config/linkco.config.php config/linkco.config.php
touch config/CAN_INSTALL
chown -R www-data:www-data config
# version.php may already exist after the failed initial copy, so run the
# installer explicitly rather than relying on entrypoint's image-version check.
su -s /bin/sh www-data -c 'exec php /var/www/html/occ "$@"' -- sh \
    maintenance:install -n --database pgsql \
    --database-host "$POSTGRES_HOST" --database-name "$POSTGRES_DB" \
    --database-user "$POSTGRES_USER" --database-pass "$POSTGRES_PASSWORD" \
    --admin-user "$NEXTCLOUD_ADMIN_USER" --admin-pass "$NEXTCLOUD_ADMIN_PASSWORD"
sh /docker-entrypoint-hooks.d/post-installation/linkco.sh
echo 'Installation and Linkco branding complete. Start the drive and cron services.'
