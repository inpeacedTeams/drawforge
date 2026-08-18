"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeProjectionLinks=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function scaleElement(el,axis,origin,factor){
  function v(n){return origin+(n-origin)*factor}
  if(el.type==='line'||el.type==='dimension'){if(axis==='x'){el.x1=v(el.x1);el.x2=v(el.x2)}else{el.y1=v(el.y1);el.y2=v(el.y2)}}
  else if(el.type==='rect'){if(axis==='x'){el.x=v(el.x);el.w*=factor}else{el.y=v(el.y);el.h*=factor}}
  else if(el.type==='circle'){if(axis==='x')el.cx=v(el.cx);else el.cy=v(el.cy);el.r*=factor}
  else if(el.points)for(var i=0;i<el.points.length;i++){if(axis==='x')el.points[i].x=v(el.points[i].x);else el.points[i].y=v(el.points[i].y)}
 }
 function resizeProjection(list,axis,target,boundsFn){var b=boundsFn(list);if(!b||!(target>0))return false;var current=axis==='x'?b.w:b.h;if(!(current>0)||Math.abs(current-target)<.001)return false;var origin=axis==='x'?b.x1:b.y1,factor=target/current;for(var i=0;i<list.length;i++)scaleElement(list[i],axis,origin,factor);return true}
 function sync(projections,source,dimensions,boundsFn){var changed=[];function set(view,axis,value){if(view===source)return;if(resizeProjection(projections[view],axis,value,boundsFn))changed.push(view)}
  if(source==='front'){set('top','x',dimensions.w);set('side','y',dimensions.h)}
  if(source==='top'){set('front','x',dimensions.w);set('side','x',dimensions.h)}
  if(source==='side'){set('front','y',dimensions.h);set('top','y',dimensions.w)}
  return changed
 }
 return{scaleElement:scaleElement,resizeProjection:resizeProjection,sync:sync}
});
