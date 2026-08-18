"use strict";
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DrawForgeSTL=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function n(v){return Math.round(v*1e5)/1e5}
 function normal(a,b,c){var u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],q=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(q[0],q[1],q[2])||1;return q.map(function(x){return n(x/l)})}
 function facet(a,b,c){var q=normal(a,b,c);return'facet normal '+q.join(' ')+'\n outer loop\n  vertex '+a.map(n).join(' ')+'\n  vertex '+b.map(n).join(' ')+'\n  vertex '+c.map(n).join(' ')+'\n endloop\nendfacet\n'}
 function fromParts(parts,name){var out='solid '+(name||'drawforge')+'\n';(parts||[]).forEach(function(p){var o=p.outer,i;for(i=0;i<o.length;i++){var a=o[i],b=o[(i+1)%o.length];out+=facet([a.x,a.y,p.z0],[b.x,b.y,p.z0],[b.x,b.y,p.z1]);out+=facet([a.x,a.y,p.z0],[b.x,b.y,p.z1],[a.x,a.y,p.z1])}for(i=1;i<o.length-1;i++){out+=facet([o[0].x,o[0].y,p.z0],[o[i+1].x,o[i+1].y,p.z0],[o[i].x,o[i].y,p.z0]);out+=facet([o[0].x,o[0].y,p.z1],[o[i].x,o[i].y,p.z1],[o[i+1].x,o[i+1].y,p.z1])}p.holes.forEach(function(h){var bottom=h.through?p.z0:Math.max(p.z0,p.z1-h.depth),r=h.ring;for(var k=0;k<r.length;k++){var a=r[k],b=r[(k+1)%r.length];out+=facet([a.x,a.y,bottom],[b.x,b.y,p.z1],[b.x,b.y,bottom]);out+=facet([a.x,a.y,bottom],[a.x,a.y,p.z1],[b.x,b.y,p.z1])}})});return out+'endsolid '+(name||'drawforge')}
 return{normal:normal,facet:facet,fromParts:fromParts}
});
