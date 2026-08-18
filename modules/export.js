"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeExport=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function esc(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
 function drawable(list){return(list||[]).filter(function(el){return el&&el.type!=='dimension'})}
 function bounds(list){
  var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity,any=false;
  function p(x,y){if(!isFinite(x)||!isFinite(y))return;any=true;x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y)}
  drawable(list).forEach(function(el){
   if(el.type==='line'){p(el.x1,el.y1);p(el.x2,el.y2)}
   else if(el.type==='rect'){p(el.x,el.y);p(el.x+el.w,el.y+el.h)}
   else if(el.type==='circle'){p(el.cx-el.r,el.cy-el.r);p(el.cx+el.r,el.cy+el.r)}
   else if(el.points)el.points.forEach(function(q){p(q.x,q.y)})
  });
  return any?{x1:x1,y1:y1,x2:x2,y2:y2,w:Math.max(1,x2-x1),h:Math.max(1,y2-y1)}:{x1:-100,y1:-100,x2:100,y2:100,w:200,h:200}
 }
 function dash(el){if(el.style==='dashed')return' stroke-dasharray="6 3.5"';if(el.style==='center')return' stroke-dasharray="13 3 3 3"';return''}
 function svg(list,options){
  options=options||{};var b=bounds(list),pad=isFinite(options.padding)?options.padding:20,out=[];
  drawable(list).forEach(function(el){var d=dash(el);
   if(el.type==='line')out.push('<line x1="'+el.x1+'" y1="'+el.y1+'" x2="'+el.x2+'" y2="'+el.y2+'"'+d+'/>');
   else if(el.type==='rect')out.push('<rect x="'+Math.min(el.x,el.x+el.w)+'" y="'+Math.min(el.y,el.y+el.h)+'" width="'+Math.abs(el.w)+'" height="'+Math.abs(el.h)+'"'+d+'/>');
   else if(el.type==='circle')out.push('<circle cx="'+el.cx+'" cy="'+el.cy+'" r="'+Math.abs(el.r)+'"'+d+'/>');
   else if(el.points&&el.points.length>1){var pts=el.points.map(function(q){return q.x+','+q.y}).join(' '),tag=(el.closed||el.type==='polygon')?'polygon':'polyline';out.push('<'+tag+' points="'+pts+'"'+d+'/>')}
  });
  return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(b.x1-pad)+' '+(b.y1-pad)+' '+(b.w+pad*2)+' '+(b.h+pad*2)+'"><title>'+esc(options.title||'DrawForge drawing')+'</title><g fill="none" stroke="#111827" stroke-width="1.4" stroke-linejoin="round">'+out.join('')+'</g></svg>'
 }
 function dxf(list){
  var out=['0','SECTION','2','ENTITIES'];function add(){for(var i=0;i<arguments.length;i++)out.push(String(arguments[i]))}
  drawable(list).forEach(function(el){
   if(el.type==='line')add('0','LINE','8','0','10',el.x1,'20',-el.y1,'11',el.x2,'21',-el.y2);
   else if(el.type==='circle')add('0','CIRCLE','8','0','10',el.cx,'20',-el.cy,'40',Math.abs(el.r));
   else if(el.type==='rect'){var x=el.x,y=el.y,w=el.w,h=el.h;add('0','LWPOLYLINE','8','0','90','4','70','1','10',x,'20',-y,'10',x+w,'20',-y,'10',x+w,'20',-(y+h),'10',x,'20',-(y+h))}
   else if(el.points&&el.points.length>1){add('0','LWPOLYLINE','8','0','90',el.points.length,'70',(el.closed||el.type==='polygon')?1:0);el.points.forEach(function(q){add('10',q.x,'20',-q.y)})}
  });out.push('0','ENDSEC','0','EOF');return out.join('\n')
 }
 function json(project,options){options=options||{};return JSON.stringify(project,null,options.pretty===false?0:2)}
 function file(format,payload,options){options=options||{};if(format==='svg')return{name:options.name||'drawforge.svg',type:'image/svg+xml',content:svg(payload,options)};if(format==='dxf')return{name:options.name||'drawforge.dxf',type:'application/dxf',content:dxf(payload)};if(format==='json')return{name:options.name||'drawforge.json',type:'application/json',content:json(payload,options)};throw new Error('Unsupported export format: '+format)}
 return{bounds:bounds,svg:svg,dxf:dxf,json:json,file:file}
});
