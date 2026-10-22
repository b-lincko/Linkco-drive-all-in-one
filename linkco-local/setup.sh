#!/bin/sh
# SPDX-FileCopyrightText: 2026 Linkco contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
set -eu
cd /var/www/html
mkdir -p custom_apps/nextcloud-aio
cp -a /opt/linkco-app/. custom_apps/nextcloud-aio/
chown -R www-data:www-data custom_apps/nextcloud-aio
occ() {
    if [ "$(id -u)" = 0 ]; then
        su -s /bin/sh www-data -c 'exec php /var/www/html/occ "$@"' -- sh "$@"
    else
        php /var/www/html/occ "$@"
    fi
}
occ app:enable nextcloud-aio
occ app:enable theming
occ theming:config name 'Linkco Drive'
occ theming:config slogan 'Your files. All together.'
occ theming:config color '#346c49'
occ theming:config logo /opt/linkco-brand.svg
occ theming:config background backgroundColor
occ background:cron
