"use strict";const assert=require('node:assert/strict'),V=require('../geometry-validation.js'),G=require('../modules/geometry-3d.js');
assert.equal(V.validateContours([{type:'line',x1:0,y1:0,x2:10,y2:0}]).length,0,'single construction line must not block 3D');
assert.ok(V.validateContours([{type:'line',x1:0,y1:0,x2:10,y2:0},{type:'line',x1:10,y1:0,x2:10,y2:10},{type:'line',x1:10,y1:10,x2:0,y2:10}]).length>0,'three-edge open contour must be reported');
let parts=G.buildParts([{id:'b',type:'rect',x:0,y:0,w:100,h:50,role:'body'},{id:'boss',type:'rect',x:10,y:10,w:20,h:10,role:'boss',depth:8}],20);assert.equal(parts[1].source.role,'boss');
console.log('✓ critical user findings tests passed');
