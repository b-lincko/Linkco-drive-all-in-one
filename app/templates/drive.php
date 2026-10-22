<?php
/**
 * SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
\OCP\Util::addStyle('nextcloud-aio', 'drive');
\OCP\Util::addScript('nextcloud-aio', 'drive-core');
\OCP\Util::addScript('nextcloud-aio', 'drive');
require __DIR__ . '/drive.html';
