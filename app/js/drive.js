/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
(function () {
 'use strict';
 const start = async () => {
 const root = document.getElementById('linkco-drive'); if (!root) return;
 const $ = id => document.getElementById(`ld-${id}`), core = window.LinkcoDriveCore;
 const demo = root.dataset.demo === 'true';
 const user = !demo && window.OC ? OC.getCurrentUser() : null;
 let items = [], folder = '', view = 'all', ascending = true, busy = false;
 const base = user ? OC.generateUrl('/remote.php/dav/files/') + encodeURIComponent(user.uid) + '/' : '';
 const dav = path => base + core.path(path);
 const toast = message => { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, 5000); };
 const request = async (path, method, body, headers = {}) => {
  const response = await fetch(dav(path), {method, body, credentials: 'same-origin', headers: {requesttoken: OC.requestToken, ...headers}});
  if (!response.ok) throw new Error(response.status === 507 ? 'Storage is full.' : response.status === 403 ? 'You do not have permission for this action.' : response.status === 412 || response.status === 405 ? 'A file or folder with that name already exists.' : `Request failed (${response.status}). Please try again.`);
  return response;
 };
 const samples = [
  ['Brand assets',true,0,2],['Projects',true,0,5],['Team resources',true,0,8],['Shared documents',true,0,12],
  ['Linkco — Brand guidelines.pdf',false,4823449,1],['Q4 Project roadmap.xlsx',false,870400,3],['Website exploration.fig',false,12582912,4],['Team onboarding.pdf',false,2516582,7],['Meeting notes.docx',false,45056,9],['Campaign moodboard.png',false,6710886,10]
 ].map(([name,folder,size,days],i) => ({name,folder,size,modified:Date.now()-days*86400000,starred:i===0 || i===4, id:i+1}));
 function icon(file) { if (file.folder) return ['▰','folder']; const ext = file.name.split('.').pop().toLowerCase(); return ext === 'pdf' ? ['PDF','pdf'] : ['xlsx','csv'].includes(ext) ? ['X','sheet'] : ['png','jpg','fig'].includes(ext) ? ['▧','image'] : ['W','doc']; }
 function fileIcon(file) { const el = document.createElement('span'); const [symbol,type] = icon(file); el.className = `ld-file-icon ld-${type}`; el.textContent = symbol; return el; }
 function render() {
  root.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active',button.dataset.view===view));
  const selected = core.select(items,view,$('search').value,ascending);
  $('files').replaceChildren();
  for (const file of selected) {
   const row = document.createElement('tr'), name = document.createElement('td'), open = document.createElement('button');
   open.className = 'ld-file-name'; open.append(fileIcon(file),document.createTextNode(file.name));
   open.onclick = () => file.folder ? load(folder ? `${folder}/${file.name}` : file.name) : demo ? toast('Sample file — downloads are available in your connected workspace.') : window.location.assign(dav(folder ? `${folder}/${file.name}` : file.name));
   name.append(open); if (file.starred) { const star = document.createElement('span'); star.className='ld-star'; star.textContent='★'; name.append(star); }
   const modified = document.createElement('td'); modified.textContent = new Date(file.modified).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
   const size = document.createElement('td'); size.textContent = file.folder ? '—' : core.size(file.size);
   const actions = document.createElement('td'), star = document.createElement('button'); star.className='ld-star-action'; star.textContent=file.starred?'★':'☆'; star.title=file.starred?'Remove from starred':'Add to starred'; star.setAttribute('aria-label',`${star.title}: ${file.name}`);
   star.onclick = async () => { try { if (!demo) await request(folder ? `${folder}/${file.name}` : file.name,'PROPPATCH',`<?xml version="1.0"?><d:propertyupdate xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:set><d:prop><oc:favorite>${file.starred?0:1}</oc:favorite></d:prop></d:set></d:propertyupdate>`,{'Content-Type':'application/xml'}).then(async response => { const xml = new DOMParser().parseFromString(await response.text(),'application/xml'); if ([...xml.getElementsByTagNameNS('DAV:','status')].some(s => !s.textContent.includes(' 200 '))) throw new Error('Could not update starred status.'); }); file.starred=!file.starred; render(); } catch(e) {toast(e.message);} };
   actions.append(star); row.append(name,modified,size,actions); $('files').append(row);
  }
  if (!selected.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan=4; cell.className='ld-empty'; cell.textContent = $('search').value ? 'No files match your search.' : view==='starred' ? 'Star a file to keep it close.' : 'A fresh start. Upload a file or create a folder.'; row.append(cell); $('files').append(row); }
  $('count').textContent=`${selected.length} items${view==='recent'?' · newest first':''}`;
  $('folders').replaceChildren();
  items.filter(f=>f.folder).slice(0,4).forEach((file,i)=> { const button=document.createElement('button'); button.className=`ld-folder-card ld-folder-${i}`; button.append(fileIcon(file)); const title=document.createElement('strong'); title.textContent=file.name; const meta=document.createElement('small'); meta.textContent='Open folder ↗'; button.append(title,meta); button.onclick=()=>load(folder?`${folder}/${file.name}`:file.name); $('folders').append(button); });
  if (!items.some(f=>f.folder)) {const text=document.createElement('p'); text.className='ld-muted'; text.textContent='Your folders will appear here.'; $('folders').append(text);}
  $('breadcrumb').replaceChildren(); const home=document.createElement('button'); home.textContent='Workspace'; home.onclick=()=>load(''); $('breadcrumb').append(home);
  let path=''; folder.split('/').filter(Boolean).forEach(part=> {path=path?`${path}/${part}`:part; const destination=path, button=document.createElement('button'); button.textContent=` / ${part}`; button.onclick=()=>load(destination); $('breadcrumb').append(button);});
 }
 async function load(path='') {
  if (busy) return; busy=true; $('count').textContent='Loading your workspace…';
  try {
   let next;
   if (demo) next=path ? [] : samples;
   else {
    const response=await request(path,'PROPFIND','<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><d:displayname/><d:resourcetype/><d:getcontentlength/><d:getlastmodified/><d:quota-used-bytes/><d:quota-available-bytes/><oc:favorite/></d:prop></d:propfind>',{Depth:'1','Content-Type':'application/xml'});
    const xml=new DOMParser().parseFromString(await response.text(),'application/xml');
    if(xml.querySelector('parsererror')) throw new Error('Could not read the file listing.');
    const responses=[...xml.getElementsByTagNameNS('DAV:','response')];
    const value=(node,ns,key)=>node.getElementsByTagNameNS(ns,key)[0]?.textContent || '';
    const currentPath=new URL(dav(path),location.origin).pathname.replace(/\/$/,'');
    next=[];
    for(const entry of responses) {
     const href=value(entry,'DAV:','href');
     const entryPath=new URL(href,location.origin).pathname.replace(/\/$/,'');
     if(entryPath===currentPath) {const used=Number(value(entry,'DAV:','quota-used-bytes')), available=Number(value(entry,'DAV:','quota-available-bytes')); $('storage-label').textContent=available>=0?`${core.size(used)} of ${core.size(used+available)}`:`${core.size(used)} used`; $('storage-meter').style.width=available>=0 && used+available>0?`${Math.min(100,used/(used+available)*100)}%`:'0%'; continue;}
     const props=[...entry.getElementsByTagNameNS('DAV:','propstat')].find(p=>value(p,'DAV:','status').includes(' 200 ')); if(!props) continue;
     next.push({name:decodeURIComponent(entryPath.split('/').pop()),folder:props.getElementsByTagNameNS('DAV:','collection').length>0,size:Number(value(props,'DAV:','getcontentlength')),modified:Date.parse(value(props,'DAV:','getlastmodified'))||Date.now(),starred:value(props,'http://owncloud.org/ns','favorite')==='1'});
    }
   }
   items=next; folder=path; render();
  } catch(e) {toast(e.message); $('count').textContent='Unable to load files. Select All files to retry.';} finally {busy=false;}
 }
 root.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view; render(); if(!items.length) load(folder);});
 root.querySelector('.ld-brand').onclick=e=>{e.preventDefault();view='all';load('');};
 $('search').oninput=render; $('sort').onclick=()=>{ascending=!ascending;render();};
 $('upload').onclick=()=>$('file-input').click();
 $('file-input').onchange=async()=>{const files=[...$('file-input').files]; if(!files.length)return; $('upload').disabled=true; let uploaded=0; try {for(const file of files) {if(!core.validName(file.name))throw new Error('Unsupported file name.'); if(demo) {items.push({name:file.name,folder:false,size:file.size,modified:Date.now(),starred:false});} else await request(folder?`${folder}/${file.name}`:file.name,'PUT',file,{'If-None-Match':'*'}); uploaded++;} toast(`${uploaded} file${uploaded===1?'':'s'} uploaded${demo?' in preview only':''}.`);}catch(e){toast(`${uploaded} uploaded. ${e.message}`);}finally{$('upload').disabled=false;$('file-input').value='';if(demo)render();else load(folder);}};
 const dialog=$('folder-dialog'); $('new-folder').onclick=$('create-hero').onclick=()=>{dialog.showModal();$('folder-name').focus();}; $('cancel-folder').onclick=()=>dialog.close();
 $('folder-form').onsubmit=async e=>{e.preventDefault();const name=$('folder-name').value.trim();if(!core.validName(name)){toast('Choose a name without slashes or special control characters.');return;} const submit=e.submitter; submit.disabled=true; try{if(demo){if(items.some(f=>f.name===name))throw new Error('That name already exists.');items.push({name,folder:true,size:0,modified:Date.now(),starred:false});render();}else{await request(folder?`${folder}/${name}`:name,'MKCOL');await load(folder);}dialog.close();$('folder-form').reset();toast('Folder created.');}catch(error){toast(error.message);}finally{submit.disabled=false;}};
 if(demo){$('demo').hidden=false;$('storage-label').textContent='8.4 GB of 100 GB';$('storage-meter').style.width='8.4%';$('settings').onclick=e=>{e.preventDefault();toast('Workspace settings are available when signed in to Nextcloud.');};}else if(user){$('avatar').textContent=(user.displayName || user.uid).slice(0,1).toUpperCase();$('settings').href=OC.generateUrl('/settings/user');}else{$('count').textContent='Please open Linkco Drive through your signed-in Nextcloud instance.';return;}
 await load();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
