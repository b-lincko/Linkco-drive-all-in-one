# SPDX-FileCopyrightText: 2026 Linkco contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
FROM nextcloud:34-apache

COPY app /opt/linkco-app
# This standalone deployment has no AIO mastercontainer administration page.
RUN sed -i '/<settings>/,/<\/settings>/d' /opt/linkco-app/appinfo/info.xml
COPY linkco-local/config.php /usr/src/nextcloud/config/linkco.config.php
COPY linkco-local/brand.svg /opt/linkco-brand.svg
COPY --chmod=755 linkco-local/setup.sh /docker-entrypoint-hooks.d/post-installation/linkco.sh
COPY --chmod=755 linkco-local/setup.sh /docker-entrypoint-hooks.d/post-upgrade/linkco.sh
COPY linkco-local/repair.php /opt/linkco-repair.php
COPY --chmod=755 linkco-local/repair.sh /opt/linkco-repair.sh
