/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
// Local design preview only. This server never connects to Nextcloud.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer((req,res) => {
 const pathname = new URL(req.url,'http://preview').pathname;
 const assets = {'/drive.css':['css/drive.css','text/css'],'/drive-core.js':['js/drive-core.js','text/javascript'],'/drive.js':['js/drive.js','text/javascript']};
 if (assets[pathname]) { const [file,type]=assets[pathname]; res.writeHead(200,{'Content-Type':type}); return res.end(fs.readFileSync(path.join(root,file))); }
 if(pathname!=='/') { res.writeHead(404);return res.end('Not found'); }
 const body=fs.readFileSync(path.join(root,'templates/drive.html'),'utf8').replace('id="linkco-drive"','id="linkco-drive" data-demo="true"');
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
 res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Linkco Drive · Your workspace</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/drive.css"><style>body{margin:0}#linkco-drive{min-height:100vh}</style><script defer src="/drive-core.js"></script><script defer src="/drive.js"></script></head><body>${body}</body></html>`);
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Linkco Drive design preview on port '+(process.env.PORT||3000)));
