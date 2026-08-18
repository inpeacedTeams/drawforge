"use strict";
(function(){
 if(!window.DrawForgeCanvasRenderer)return;
 var R=window.DrawForgeCanvasRenderer;
 var originalPaintShape=window.paintShape;
 window.paintShape=function(el,selected,preview){
  var renderer=R.create({context:window.ctx,zoom:window.S&&window.S.viewport?window.S.viewport.z:1,selected:function(){return selected},format:function(v){return window.fmtVal?window.fmtVal(v):Math.round(v)+' мм'}});
  renderer.shape(el,preview);
  if(el.type==='dimension')renderer.dimension(el);
 };
 window.DrawForgeModules=window.DrawForgeModules||{};window.DrawForgeModules.canvasRenderer=R;
})();
