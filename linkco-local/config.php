<?php
/**
 * SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Explicit hosts only. Never trust arbitrary HTTP Host headers or wildcard IPs.
$hosts = preg_split('/\s+/', trim(getenv('LINKCO_TRUSTED_HOSTS') ?: 'localhost 127.0.0.1'));
$CONFIG = [
	'trusted_domains' => array_values(array_filter($hosts)),
	'defaultapp' => 'nextcloud-aio',
	'knowledgebaseenabled' => false,
	// Relative URLs allow the same installation to work via localhost and LAN IP.
	// Do not force overwritehost or overwriteprotocol here.
];
