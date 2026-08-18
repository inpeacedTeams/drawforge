"use strict";
(function(){
 try{
  if(localStorage.getItem('df15'))return;
  var raw=localStorage.getItem('drawforge.project');if(!raw)return;
  var p=JSON.parse(raw);
  localStorage.setItem('df15',JSON.stringify({s:p.sheet||[],p:p.projections||{front:[],top:[],side:[]},mode:p.mode||'sheet',vp:p.viewport||{x:0,y:0,z:1},nid:p.nextId||1,unit:p.unit||'mm',dims:!!p.autoDims}));
 }catch(error){console.warn('DrawForge preload failed',error)}
})();
