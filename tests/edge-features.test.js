"use strict";const assert=require('node:assert/strict'),G=require('../modules/geometry-3d.js');
const rect={type:'rect',x:0,y:0,w:100,h:50,role:'body',edgeFeature:'chamfer',edgeSize:10};let p=G.polygon(rect);assert.equal(p.length,4);let c=G.edgeFeature(p,rect);assert.equal(c.length,8);assert.ok(c.some(q=>q.x===10&&q.y===0));
const fillet=Object.assign({},rect,{edgeFeature:'fillet',edgeSize:8});let f=G.edgeFeature(G.polygon(fillet),fillet);assert.ok(f.length>8);assert.ok(f.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));
const parts=G.buildParts([rect],30);assert.ok(parts[0].outer.length>4);console.log('✓ edge feature tests passed');
