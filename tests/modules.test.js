"use strict";const assert=require('node:assert/strict'),H=require('../modules/history.js'),P=require('../modules/project-state.js');
let h=H.create({limit:3});h.snapshot({n:1});h.snapshot({n:2});h.snapshot({n:3});assert.equal(h.undo().n,2);assert.equal(h.redo().n,3);assert.equal(h.redo(),null);h.undo();h.snapshot({n:4});assert.equal(h.inspect().canRedo,false);assert.equal(h.current().n,4);
h=H.create({limit:2});h.snapshot({n:1});h.snapshot({n:2});h.snapshot({n:3});assert.equal(h.inspect().length,2);assert.equal(h.undo().n,2);
const source={sheet:[{id:'a'}],projections:{front:[],top:[],side:[]},mode:'proj',viewport:{x:2,y:3,z:4},nextId:8,unit:'cm',autoDims:true};const restored=P.restore(P.serialize(source));assert.deepEqual(restored,source);source.sheet[0].id='changed';assert.equal(restored.sheet[0].id,'a');
const legacy=P.restore({s:[{id:'legacy'}],p:{front:[],top:[],side:[]},vp:{x:1,y:1,z:1},nid:5,dims:true});assert.equal(legacy.sheet[0].id,'legacy');assert.equal(legacy.nextId,5);assert.equal(legacy.autoDims,true);
console.log('✓ module tests passed');
