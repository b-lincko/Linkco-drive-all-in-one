<?php

declare(strict_types=1);
/**
 * SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
namespace OCA\AllInOne\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\INavigationManager;
use OCP\IURLGenerator;

class Application extends App implements IBootstrap {
	public function __construct() {
		parent::__construct('nextcloud-aio');
	}

	public function register(IRegistrationContext $context): void {
	}

	public function boot(IBootContext $context): void {
		$context->injectFn(function (INavigationManager $navigation, IURLGenerator $url): void {
			$navigation->add(function () use ($url): array {
				return [
					'id' => 'linkco-drive',
					'order' => 1,
					'href' => $url->linkToRoute('nextcloud-aio.drive.index'),
					'icon' => $url->imagePath('nextcloud-aio', 'drive.svg'),
					'name' => 'Linkco Drive',
				];
			});
		});
	}
}
