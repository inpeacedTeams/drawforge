"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeHistory=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function clone(value){return JSON.parse(JSON.stringify(value))}
 function create(options){
  options=options||{};var limit=options.limit||60,entries=[],index=-1;
  function snapshot(value){entries=entries.slice(0,index+1);entries.push(clone(value));index=entries.length-1;if(entries.length>limit){entries.shift();index--}return current()}
  function current(){return index>=0?clone(entries[index]):null}
  function undo(){if(index<=0)return null;index--;return current()}
  function redo(){if(index>=entries.length-1)return null;index++;return current()}
  function reset(value){entries=[];index=-1;if(arguments.length)snapshot(value)}
  function inspect(){return{length:entries.length,index:index,canUndo:index>0,canRedo:index>=0&&index<entries.length-1}}
  return{snapshot:snapshot,current:current,undo:undo,redo:redo,reset:reset,inspect:inspect}
 }
 return{create:create,clone:clone}
});
