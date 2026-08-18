"use strict";const assert=require('node:assert/strict'),E=require('../modules/export.js');
const shapes=[{type:'rect',x:10,y:20,w:-30,h:40},{type:'circle',cx:50,cy:50,r:10},{type:'line',x1:0,y1:0,x2:5,y2:5,style:'dashed'},{type:'polygon',closed:true,points:[{x:70,y:0},{x:80,y:0},{x:75,y:10}]},{type:'dimension',x1:0,y1:0,x2:100,y2:0}];
assert.deepEqual(E.bounds(shapes),{x1:-20,y1:0,x2:80,y2:60,w:100,h:60});
let svg=E.svg(shapes,{title:'A&B'});assert.match(svg,/viewBox="-40 -20 140 100"/);assert.match(svg,/<title>A&amp;B<\/title>/);assert.match(svg,/stroke-dasharray/);assert.doesNotMatch(svg,/dimension/);
let dxf=E.dxf(shapes);assert.match(dxf,/SECTION/);assert.match(dxf,/LWPOLYLINE/);assert.match(dxf,/CIRCLE/);assert.match(dxf,/EOF$/);
let project={sheet:[{id:'a'}],projections:{front:[],top:[],side:[]}};assert.deepEqual(JSON.parse(E.json(project)),project);
assert.equal(E.file('svg',shapes).type,'image/svg+xml');assert.throws(()=>E.file('pdf',shapes),/Unsupported/);
console.log('✓ export tests passed');
