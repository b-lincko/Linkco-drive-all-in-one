/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
(function (root) {
 'use strict';
 const core = {
  path: value => value.split('/').filter(Boolean).map(encodeURIComponent).join('/'),
  validName: value => !!value.trim() && !/[\/\\\x00-\x1f]/.test(value) && !['.', '..'].includes(value.trim()),
  size: value => { if (!value) return '—'; const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3); return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`; },
  select: (items, view, query, ascending) => items.filter(f => (view !== 'starred' || f.starred) && f.name.toLowerCase().includes(query.toLowerCase())).sort((a,b) => view === 'recent' ? b.modified - a.modified : Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name) * (ascending ? 1 : -1)),
 };
 if (typeof module !== 'undefined') module.exports = core;
 else root.LinkcoDriveCore = core;
})(globalThis);
