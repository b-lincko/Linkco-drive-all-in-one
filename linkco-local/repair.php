<?php
/**
 * SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
declare(strict_types=1);
// Only permit initialization of an uninstalled configuration AND empty database.
// Do not print config contents or database credentials.
try {
	$CONFIG = [];
	if (is_file('/var/www/html/config/config.php')) {
		require '/var/www/html/config/config.php';
	}
	if (!empty($CONFIG['installed']) || !empty($CONFIG['version'])) {
		throw new RuntimeException('Existing installation detected. Refusing first-install repair. Collect drive logs for diagnosis instead.');
	}
	$db = new PDO(
		'pgsql:host=' . getenv('POSTGRES_HOST') . ';dbname=' . getenv('POSTGRES_DB'),
		getenv('POSTGRES_USER'),
		getenv('POSTGRES_PASSWORD'),
		[PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
	);
	$count = (int)$db->query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")->fetchColumn();
	if ($count !== 0) {
		throw new RuntimeException('Database already contains tables. Refusing first-install repair. Preserve the volumes and collect drive logs for diagnosis.');
	}
	echo "Confirmed uninstalled configuration and empty database.\n";
} catch (Throwable $e) {
	// PDO exceptions can include connection details; expose only our safe messages.
	fwrite(STDERR, $e instanceof PDOException ? "Database check failed. Confirm database is running and credentials match.\n" : $e->getMessage() . "\n");
	exit(1);
}
