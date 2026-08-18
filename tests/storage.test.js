"use strict";const assert=require('node:assert/strict'),Storage=require('../modules/storage.js'),Project=require('../modules/project-state.js');
function project(){return{sheet:[{id:'a',type:'rect'}],projections:{front:[],top:[],side:[]},mode:'proj',viewport:{x:1,y:2,z:3},nextId:7,unit:'cm',autoDims:true}}
let mem=Storage.memoryAdapter(),store=Storage.create({adapter:mem,serialize:Project.serialize,restore:Project.restore});assert.equal(store.exists(),false);store.save(project());assert.equal(store.exists(),true);assert.deepEqual(store.load(),project());store.clear();assert.equal(store.exists(),false);
mem=Storage.memoryAdapter({df15:JSON.stringify({s:[{id:'old'}],p:{front:[],top:[],side:[]},nid:9,dims:true})});store=Storage.create({adapter:mem,serialize:Project.serialize,restore:Project.restore});let migrated=store.load();assert.equal(migrated.sheet[0].id,'old');assert.equal(migrated.nextId,9);assert.equal(mem.getItem('df15'),null);assert.ok(mem.getItem('drawforge.project'));
mem=Storage.memoryAdapter({'drawforge.project':'{broken'});store=Storage.create({adapter:mem,serialize:Project.serialize,restore:Project.restore});assert.equal(store.load().error,'invalid_project');
assert.throws(()=>Storage.create({adapter:null,serialize:Project.serialize,restore:Project.restore}),/adapter/);
console.log('✓ storage tests passed');
