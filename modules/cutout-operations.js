"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeCutouts=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function polygon(el){if(el.type==='rect')return[{x:el.x,y:el.y},{x:el.x+el.w,y:el.y},{x:el.x+el.w,y:el.y+el.h},{x:el.x,y:el.y+el.h}];if(el.points&&el.points.length>2)return el.points.map(function(p){return{x:p.x,y:p.y}});return null}
 function contains(container,shape,pointInPoly){var outer=polygon(container),inner=polygon(shape);return!!(outer&&inner&&pointInPoly((inner||[])[0],outer))}
 function normalize(el,pointInPoly){var kind=el.operation||el.role;if(kind!=='groove'&&kind!=='cutout')return null;var ring=polygon(el);if(!ring)return null;return{type:kind,ring:ring,depth:Math.max(0,Number(el.depth)||0),through:kind==='cutout'||el.through===true,valid:true}}
 function collect(elements,pointInPoly){var bodies=(elements||[]).filter(function(e){return e.role==='body'||(!e.role&&e.type==='rect')});return(elements||[]).map(function(el){var op=normalize(el,pointInPoly);if(!op)return null;var host=bodies.find(function(b){return contains(b,el,pointInPoly)});return Object.assign(op,{hostId:host&&host.id||null,valid:!!host})}).filter(Boolean)}
 return{polygon:polygon,normalize:normalize,collect:collect}
});
