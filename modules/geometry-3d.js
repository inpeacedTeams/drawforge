"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeGeometry3D=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function signedArea(p){var a=0;for(var i=0;i<p.length;i++){var j=(i+1)%p.length;a+=p[i].x*p[j].y-p[j].x*p[i].y}return a/2}
 function area(p){return Math.abs(signedArea(p))}
 function centroid(p){var x=0,y=0;for(var i=0;i<p.length;i++){x+=p[i].x;y+=p[i].y}return{x:x/p.length,y:y/p.length}}
 function pointInPoly(pt,poly){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var a=poly[i],b=poly[j];if(((a.y>pt.y)!==(b.y>pt.y))&&(pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y+1e-12)+a.x))inside=!inside}return inside}
 function polygon(el,segments){var out=[],i;if(el.type==='rect')return[{x:el.x,y:el.y},{x:el.x+el.w,y:el.y},{x:el.x+el.w,y:el.y+el.h},{x:el.x,y:el.y+el.h}];if(el.type==='circle'){segments=segments||64;for(i=0;i<segments;i++){var a=i/segments*Math.PI*2;out.push({x:el.cx+Math.cos(a)*el.r,y:el.cy+Math.sin(a)*el.r})}return out}if(el.points&&el.points.length>2)return el.points.map(function(p){return{x:p.x,y:p.y}});return null}
 function isClosed(el){return el&&(el.type==='rect'||el.type==='circle'||el.type==='polygon'||(el.type==='polyline'&&el.closed))}
 function orient(p,ccw){var positive=signedArea(p)>0;return positive===ccw?p.slice():p.slice().reverse()}
 function flip(p){return p.map(function(q){return{x:q.x,y:-q.y}})}
 function buildParts(elements,globalDepth,options){
  options=options||{};globalDepth=Math.max(1,Number(globalDepth)||40);var items=[],i,k;
  (elements||[]).filter(isClosed).forEach(function(el){var poly=polygon(el,options.circleSegments);if(poly)items.push({el:el,poly:poly,area:area(poly),center:centroid(poly),host:null,role:null})});
  for(i=0;i<items.length;i++)for(k=0;k<items.length;k++){if(i===k||items[k].area<=items[i].area||!pointInPoly(items[i].center,items[k].poly))continue;if(!items[i].host||items[k].area<items[i].host.area)items[i].host=items[k]}
  for(i=0;i<items.length;i++){var role=items[i].el.role;if(!role||role==='auto')role=(items[i].el.type==='circle'&&items[i].host)?'hole':'body';if((role==='hole'||role==='boss')&&!items[i].host)role='body';items[i].role=role}
  var parts=[],map={};
  for(i=0;i<items.length;i++)if(items[i].role==='body'){var depth=Math.max(1,Number(items[i].el.depth)||globalDepth),part={outer:orient(flip(items[i].poly),true),holes:[],z0:0,z1:depth,source:items[i]};parts.push(part);if(items[i].el.id)map[items[i].el.id]=part}
  function hostPart(item){var h=item.host,guard=0;while(h&&guard++<20){if(h.el.id&&map[h.el.id])return map[h.el.id];h=h.host}return null}
  for(i=0;i<items.length;i++)if(items[i].role==='hole'){var hp=hostPart(items[i]);if(!hp)continue;var through=items[i].el.through!==false,max=hp.z1-hp.z0,depth=Math.min(Math.max(1,Number(items[i].el.depth)||max),max);hp.holes.push({ring:orient(flip(items[i].poly),false),depth:depth,through:through||depth>=max-.001,source:items[i]})}
  for(i=0;i<items.length;i++)if(items[i].role==='boss'){var basePart=hostPart(items[i]),base=basePart?basePart.z1:globalDepth,height=Math.max(1,Number(items[i].el.depth)||Math.max(6,globalDepth*.4));parts.push({outer:orient(flip(items[i].poly),true),holes:[],z0:base,z1:base+height,source:items[i]})}
  return parts
 }
 function ring3(ring,z){return ring.map(function(p){return[p.x,p.y,z]})}
 function makeFaces(parts){var faces=[];
  function walls(ring,z0,z1,meta){for(var i=0;i<ring.length;i++){var a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy)||1;faces.push({rings:[[[a.x,a.y,z0],[b.x,b.y,z0],[b.x,b.y,z1],[a.x,a.y,z1]]],n:[dy/len,-dx/len,0],hole:meta||null})}}
  (parts||[]).forEach(function(p){var through=p.holes.filter(function(h){return h.through}),back=[ring3(p.outer,p.z0)],front=[ring3(p.outer,p.z1)];through.forEach(function(h){back.push(ring3(h.ring,p.z0))});p.holes.forEach(function(h){front.push(ring3(h.ring,p.z1))});faces.push({rings:back,n:[0,0,-1]});faces.push({rings:front,n:[0,0,1]});walls(p.outer,p.z0,p.z1);p.holes.forEach(function(h){var bottom=h.through?p.z0:Math.max(p.z0,p.z1-h.depth),meta={top:ring3(h.ring,p.z1),bot:ring3(h.ring,bottom),through:h.through};walls(h.ring,bottom,p.z1,meta);if(!h.through&&bottom>p.z0+.001)faces.push({rings:[ring3(h.ring,bottom)],n:[0,0,1],floor:true,hole:meta})})});return faces}
 function bounds(parts){var x1=Infinity,y1=Infinity,z1=Infinity,x2=-Infinity,y2=-Infinity,z2=-Infinity;(parts||[]).forEach(function(p){p.outer.forEach(function(q){x1=Math.min(x1,q.x);x2=Math.max(x2,q.x);y1=Math.min(y1,q.y);y2=Math.max(y2,q.y)});z1=Math.min(z1,p.z0);z2=Math.max(z2,p.z1)});return isFinite(x1)?{x1:x1,y1:y1,z1:z1,x2:x2,y2:y2,z2:z2,w:x2-x1,h:y2-y1,d:z2-z1}:null}
 return{signedArea:signedArea,area:area,centroid:centroid,pointInPoly:pointInPoly,polygon:polygon,buildParts:buildParts,makeFaces:makeFaces,bounds:bounds}
});
