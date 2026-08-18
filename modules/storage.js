"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeStorage=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 var DEFAULT_KEY='drawforge.project';
 function memoryAdapter(seed){var data=Object.assign({},seed||{});return{getItem:function(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null},setItem:function(k,v){data[k]=String(v)},removeItem:function(k){delete data[k]},dump:function(){return Object.assign({},data)}}}
 function create(options){
  options=options||{};var adapter=options.adapter,key=options.key||DEFAULT_KEY,legacyKeys=options.legacyKeys||['df15'],serialize=options.serialize,restore=options.restore;
  if(!adapter||typeof adapter.getItem!=='function')throw new Error('Storage adapter is required');
  if(typeof serialize!=='function'||typeof restore!=='function')throw new Error('serialize and restore are required');
  function save(state){var raw=serialize(state);adapter.setItem(key,raw);return raw}
  function readRaw(){var raw=adapter.getItem(key);if(raw!=null)return{raw:raw,key:key,legacy:false};for(var i=0;i<legacyKeys.length;i++){raw=adapter.getItem(legacyKeys[i]);if(raw!=null)return{raw:raw,key:legacyKeys[i],legacy:true}}return null}
  function load(){var found=readRaw();if(!found)return null;try{var state=restore(found.raw);if(found.legacy){save(state);adapter.removeItem(found.key)}return state}catch(error){return{error:'invalid_project',message:error.message}}}
  function clear(){adapter.removeItem(key);for(var i=0;i<legacyKeys.length;i++)adapter.removeItem(legacyKeys[i])}
  function exists(){return readRaw()!=null}
  return{save:save,load:load,clear:clear,exists:exists,key:key}
 }
 return{DEFAULT_KEY:DEFAULT_KEY,create:create,memoryAdapter:memoryAdapter}
});
