"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeProjectState=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 var VERSION=1;
 function clone(v){return JSON.parse(JSON.stringify(v))}
 function capture(state){return{version:VERSION,sheet:clone(state.sheet||[]),projections:clone(state.projections||{front:[],top:[],side:[]}),mode:state.mode||'sheet',viewport:clone(state.viewport||{x:0,y:0,z:1}),nextId:state.nextId||1,unit:state.unit||'mm',autoDims:!!state.autoDims}}
 function restore(raw){var p=typeof raw==='string'?JSON.parse(raw):clone(raw||{});return{sheet:p.sheet||p.s||[],projections:p.projections||p.p||{front:[],top:[],side:[]},mode:p.mode||'sheet',viewport:p.viewport||p.vp||{x:0,y:0,z:1},nextId:p.nextId||p.nid||1,unit:p.unit||'mm',autoDims:!!(p.autoDims||p.dims)}}
 function serialize(state){return JSON.stringify(capture(state))}
 return{VERSION:VERSION,capture:capture,restore:restore,serialize:serialize}
});
