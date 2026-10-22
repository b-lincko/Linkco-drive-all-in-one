# AIO app for Nextcloud

This folder contains a Nextcloud app, which will be automatically installed within the Nextcloud instance.
It adds a link to the admin settings page that gives access to the AIO interface.

## How to develop the app?

Please note that in order to check if an app is already downloaded Nextcloud will look for a folder with the same name as the app.

Therefore you need to add the app to one of the app directories naming the directory `nextcloud-aio`.

## Linkco Drive

The app now includes a custom Linkco Drive workspace. It preserves the existing
AIO administration link and adds a **Linkco Drive** entry to Nextcloud navigation.
The dashboard uses the signed-in user's Nextcloud WebDAV endpoint; it does not
introduce a second account system, copy files, or require external services.

### Included

- Responsive sage-and-forest Linkco workspace, with folder quick access.
- Folder browsing and breadcrumbs, current-folder search, alphabetical sorting,
  recent-first sorting, and starred filtering (all scoped to the current folder).
- Multi-file upload, folder creation, direct file opening/download, and persistent
  Nextcloud favorites. Existing files are never overwritten by uploads.
- Storage quota display, loading/empty/error states, accessible labeled controls,
  and a keyboard-accessible folder dialog.

Sharing, trash, file previews, version history, and global recursive search remain
in the standard Nextcloud Files app; this dashboard does not replace those tools.
Uploads currently use a single WebDAV PUT per file, not chunked uploads, and are
subject to the installation's proxy and PHP upload limits. The visual identity is
a starting direction, not supplied official Linkco brand assets.

### Design preview (no Nextcloud needed)

```sh
node app/tools/preview.cjs
```

Open port 3000. This is an explicitly labeled, isolated sample-data preview.
Uploads and new folders are in memory only and reset on reload. It never reads
real Nextcloud files, and does not include authentication. Do not use the preview
server as a production file service.

### Deploy and verify

Install/update this repository's `app` directory as `nextcloud-aio` using the
existing AIO app packaging process. It requires the Nextcloud versions declared
in `appinfo/info.xml`. The dashboard is at `/index.php/apps/nextcloud-aio/drive`.
No changes to Docker images, container names, volumes, or upstream licensing are
needed. Optionally set the user's default app to `nextcloud-aio` in Nextcloud's
personal settings if supported by the installed version; otherwise use the
navigation entry or bookmark the dashboard URL.

Run automated utility tests with:

```sh
node --test app/tests/*.test.cjs
node --check app/js/drive.js
```

Before deploying or submitting, a human must test on a live Nextcloud instance:

1. Sign in as a regular (non-admin) user and open Linkco Drive from navigation.
   Signed-out access must redirect to Nextcloud login.
2. Verify the listing contains only that user's accessible files. Check names
   with spaces, Unicode, ampersands, and hash characters, and subdirectory installs.
3. Browse nested folders, use breadcrumbs, search, sort, and switch views. Verify
   empty folders and starred filters have clear empty states.
4. Create a folder and upload several files. Retry an existing name and verify
   no overwrite. Check read-only shared folders and full-storage errors.
5. Toggle a star, reload, and confirm the change in standard Nextcloud Files.
   Open/download files and verify quota information against Nextcloud settings.
6. Test mobile layout, keyboard navigation, Escape to close the dialog, and the
   browser console for CSP errors. Confirm the original AIO admin link still works.

PHP linting and live Nextcloud integration require a PHP/Nextcloud environment;
passing the JavaScript tests alone is not deployment verification.

### No domain? Localhost and LAN IP

Use the separate [Linkco local deployment](../linkco-local/README.md), not the
upstream AIO Compose file. It includes automatic installation, Linkco login
theming, persistent storage and explicit trusted hosts for local HTTP access.
