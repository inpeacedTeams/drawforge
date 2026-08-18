"use strict";const assert=require('node:assert/strict'),G=require('../modules/geometry-3d.js'),STL=require('../modules/stl.js');
function rect(id,x,y,w,h,role,depth){return{id,type:'rect',x,y,w,h,role,depth}}
let parts=G.buildParts([rect('body',0,0,100,50,'body')],20);assert.equal(parts.length,1);assert.equal(parts[0].z1,20);let box=G.bounds(parts);assert.equal(box.x1,0);assert.equal(box.y1,-50);assert.equal(Math.abs(box.y2),0);assert.equal(box.x2,100);assert.equal(box.d,20);
parts=G.buildParts([rect('body',0,0,100,50,'body'),{id:'hole',type:'circle',cx:50,cy:25,r:10,role:'hole',through:true}],20,{circleSegments:16});assert.equal(parts[0].holes.length,1);assert.equal(parts[0].holes[0].ring.length,16);assert.equal(parts[0].holes[0].through,true);
parts=G.buildParts([rect('body',0,0,100,50,'body'),rect('boss',20,10,20,10,'boss',8)],20);assert.equal(parts.length,2);assert.equal(parts[1].z0,20);assert.equal(parts[1].z1,28);
let faces=G.makeFaces(G.buildParts([rect('b',0,0,10,10,'body')],5));assert.equal(faces.length,6);assert.deepEqual(faces[0].n,[0,0,-1]);assert.deepEqual(faces[1].n,[0,0,1]);
let stl=STL.fromParts(G.buildParts([rect('b',0,0,10,10,'body')],5));assert.match(stl,/^solid drawforge/);assert.match(stl,/facet normal/);assert.match(stl,/endsolid drawforge$/);assert.doesNotMatch(stl,/NaN/);
assert.deepEqual(STL.normal([0,0,0],[1,0,0],[0,1,0]),[0,0,1]);
console.log('✓ 3D geometry and STL tests passed');
