/* SPDX-FileCopyrightText: 2026 Linkco contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/drive-core.js');
test('DAV paths encode each component, including special characters',()=>{assert.equal(core.path('/Team files/hello #?.pdf'),'Team%20files/hello%20%23%3F.pdf');assert.equal(core.path('فريق/a&b'),' %D9%81%D8%B1%D9%8A%D9%82/a%26b'.trim());});
test('folder names reject traversal, separators and controls',()=>{for(const name of ['','  ','.','..','a/b','a\\b','a\n'])assert.equal(core.validName(name),false,name);assert.equal(core.validName('Team projects'),true);});
test('sizes handle empty files and human readable values',()=>{assert.equal(core.size(0),'—');assert.equal(core.size(1024),'1.0 KB');assert.equal(core.size(150),'150 B');});
const files=[{name:'Zebra',folder:true,starred:false,modified:1},{name:'Alpha.pdf',folder:false,starred:true,modified:3},{name:'Beta.pdf',folder:false,starred:false,modified:2}];
test('folders sort first and queries ignore case',()=>{assert.deepEqual(core.select(files,'all','',true).map(f=>f.name),['Zebra','Alpha.pdf','Beta.pdf']);assert.equal(core.select(files,'all','ALPHA',true).length,1);assert.equal(files[0].name,'Zebra');});
test('starred and recent views filter and sort',()=>{assert.deepEqual(core.select(files,'starred','',true).map(f=>f.name),['Alpha.pdf']);assert.deepEqual(core.select(files,'recent','',true).map(f=>f.modified),[3,2,1]);});
