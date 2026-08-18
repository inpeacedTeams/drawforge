"use strict";
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DrawForgeValidation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  var DEFAULT_TOLERANCE=0.01;
  function distance(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
  function point(p){return{x:Number(p.x),y:Number(p.y)}}
  function issue(code,message,elementIds,points,meta){return{code:code,message:message,elementIds:elementIds||[],points:points||[],meta:meta||{}}}
  function samePoint(a,b,t){return distance(a,b)<=t}

  function endpointKey(nodes,p,tolerance){
    for(var i=0;i<nodes.length;i++)if(samePoint(nodes[i].point,p,tolerance))return i;
    nodes.push({point:point(p),edges:[],elementIds:[]});return nodes.length-1;
  }
  function lineGraph(lines,tolerance){
    var nodes=[],edges=[];
    for(var i=0;i<lines.length;i++){
      var el=lines[i],a=endpointKey(nodes,{x:el.x1,y:el.y1},tolerance),b=endpointKey(nodes,{x:el.x2,y:el.y2},tolerance);
      var ei=edges.push({a:a,b:b,id:el.id||null,index:i})-1;
      nodes[a].edges.push(ei);nodes[b].edges.push(ei);
      if(el.id!=null){nodes[a].elementIds.push(el.id);nodes[b].elementIds.push(el.id)}
    }
    return{nodes:nodes,edges:edges};
  }
  function graphComponents(graph){
    var seen={},out=[];
    for(var start=0;start<graph.nodes.length;start++){
      if(seen[start])continue;
      var queue=[start],nodeIds=[],edgeMap={};seen[start]=true;
      while(queue.length){
        var ni=queue.shift(),node=graph.nodes[ni];nodeIds.push(ni);
        for(var j=0;j<node.edges.length;j++){
          var ei=node.edges[j],edge=graph.edges[ei],other=edge.a===ni?edge.b:edge.a;edgeMap[ei]=true;
          if(!seen[other]){seen[other]=true;queue.push(other)}
        }
      }
      out.push({nodes:nodeIds,edges:Object.keys(edgeMap).map(Number)});
    }
    return out;
  }
  function validateLineContours(lines,options){
    options=options||{};var tolerance=Number(options.tolerance)||DEFAULT_TOLERANCE;
    if(!lines.length)return[];
    var graph=lineGraph(lines,tolerance),components=graphComponents(graph),issues=[];
    for(var i=0;i<components.length;i++){
      var c=components[i],odd=[],branch=[],ids={};
      for(var n=0;n<c.nodes.length;n++){
        var node=graph.nodes[c.nodes[n]],degree=node.edges.length;
        if(degree===1)odd.push(node.point);if(degree>2)branch.push(node.point);
        for(var q=0;q<node.elementIds.length;q++)ids[node.elementIds[q]]=true;
      }
      var elementIds=Object.keys(ids);
      if(c.edges.length<3)issues.push(issue('too_few_edges','Для замкнутого контура нужно минимум три отрезка.',elementIds,odd,{edgeCount:c.edges.length}));
      else if(odd.length)issues.push(issue('open_contour','Контур не замкнут: соедините отмеченные конечные точки.',elementIds,odd,{openEnds:odd.length,edgeCount:c.edges.length}));
      if(branch.length)issues.push(issue('branching_contour','В одной точке сходятся больше двух линий. Разделите контуры.',elementIds,branch,{branchCount:branch.length}));
    }
    return issues;
  }
  function validateOpenPolylines(elements){
    var out=[];
    for(var i=0;i<elements.length;i++){
      var el=elements[i];if(el.type!=='polyline'||el.closed||!el.points||el.points.length<2)continue;
      out.push(issue('open_polyline','Ломаная не замкнута. Замкните её или используйте инструмент «Контур».',el.id?[el.id]:[],[point(el.points[0]),point(el.points[el.points.length-1])],{pointCount:el.points.length}));
    }
    return out;
  }

  function segmentsOf(elements){
    var out=[];
    function add(a,b,id,owner,index){if(distance(a,b)>1e-9)out.push({a:point(a),b:point(b),id:id||null,owner:owner,index:index})}
    for(var i=0;i<elements.length;i++){
      var el=elements[i];if(!el||el.type==='dimension'||el.style==='dashed'||el.style==='center')continue;
      if(el.type==='line')add({x:el.x1,y:el.y1},{x:el.x2,y:el.y2},el.id,el,i);
      else if(el.type==='rect'){
        var p=[{x:el.x,y:el.y},{x:el.x+el.w,y:el.y},{x:el.x+el.w,y:el.y+el.h},{x:el.x,y:el.y+el.h}];
        for(var r=0;r<4;r++)add(p[r],p[(r+1)%4],el.id,el,r);
      }else if(el.points&&el.points.length>1){
        for(var j=0;j<el.points.length-1;j++)add(el.points[j],el.points[j+1],el.id,el,j);
        if(el.closed||el.type==='polygon')add(el.points[el.points.length-1],el.points[0],el.id,el,el.points.length-1);
      }
    }
    return out;
  }
  function cross(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
  function segmentIntersection(s1,s2,tolerance){
    var p=s1.a,r={x:s1.b.x-s1.a.x,y:s1.b.y-s1.a.y},q=s2.a,s={x:s2.b.x-s2.a.x,y:s2.b.y-s2.a.y};
    var den=r.x*s.y-r.y*s.x;if(Math.abs(den)<=tolerance)return null;
    var qp={x:q.x-p.x,y:q.y-p.y},t=(qp.x*s.y-qp.y*s.x)/den,u=(qp.x*r.y-qp.y*r.x)/den;
    if(t<-tolerance||t>1+tolerance||u<-tolerance||u>1+tolerance)return null;
    var hit={x:p.x+t*r.x,y:p.y+t*r.y};
    var endpoint1=samePoint(hit,s1.a,tolerance)||samePoint(hit,s1.b,tolerance),endpoint2=samePoint(hit,s2.a,tolerance)||samePoint(hit,s2.b,tolerance);
    if(endpoint1&&endpoint2)return null;
    return hit;
  }
  function validateIntersections(elements,options){
    options=options||{};var tolerance=Number(options.tolerance)||DEFAULT_TOLERANCE,segs=segmentsOf(elements),out=[],seen={};
    for(var i=0;i<segs.length;i++)for(var j=i+1;j<segs.length;j++){
      var a=segs[i],b=segs[j];
      if(a.owner===b.owner&&Math.abs(a.index-b.index)<=1)continue;
      var hit=segmentIntersection(a,b,tolerance);if(!hit)continue;
      var key=Math.round(hit.x/tolerance)+':'+Math.round(hit.y/tolerance);if(seen[key])continue;seen[key]=true;
      out.push(issue('self_intersection','Линии пересекаются внутри контура. Уберите пересечение или разделите фигуры.',[a.id,b.id].filter(Boolean),[hit],{}));
    }
    return out;
  }
  function bounds(elements){
    var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity,any=false;
    function take(x,y){any=true;x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y)}
    for(var i=0;i<(elements||[]).length;i++){
      var el=elements[i];if(!el||el.type==='dimension')continue;
      if(el.type==='line'){take(el.x1,el.y1);take(el.x2,el.y2)}
      else if(el.type==='rect'){take(el.x,el.y);take(el.x+el.w,el.y+el.h)}
      else if(el.type==='circle'){take(el.cx-el.r,el.cy-el.r);take(el.cx+el.r,el.cy+el.r)}
      else if(el.points)for(var j=0;j<el.points.length;j++)take(el.points[j].x,el.points[j].y);
    }
    return any?{w:x2-x1,h:y2-y1,x1:x1,y1:y1,x2:x2,y2:y2}:null;
  }
  function validateProjections(projections,options){
    options=options||{};var tolerance=Number(options.dimensionTolerance);if(!isFinite(tolerance))tolerance=1;
    var front=bounds(projections&&projections.front),top=bounds(projections&&projections.top),side=bounds(projections&&projections.side),out=[];
    if(!front){out.push(issue('missing_front','Нет фронтальной проекции. Без неё нельзя определить форму детали.',[],[],{projection:'front'}));return out}
    if(!top&&!side)out.push(issue('missing_depth_view','Добавьте вид сверху или вид сбоку, чтобы определить глубину детали.',[],[],{projection:'top'}));
    function mismatch(a,b,label,views){if(a&&b&&Math.abs(a-b)>tolerance)out.push(issue('projection_mismatch',label+': размеры отличаются на '+Math.round(Math.abs(a-b)*10)/10+' мм.',[],[],{views:views,first:a,second:b}))}
    mismatch(front.w,top&&top.w,'Ширина фронтального вида и вида сверху не совпадает',['front','top']);
    mismatch(front.h,side&&side.h,'Высота фронтального вида и вида сбоку не совпадает',['front','side']);
    mismatch(top&&top.h,side&&side.w,'Глубина на виде сверху и виде сбоку не совпадает',['top','side']);
    return out;
  }
  function validateContours(elements,options){
    elements=Array.isArray(elements)?elements:[];
    var lines=elements.filter(function(el){return el&&el.type==='line'&&(!el.style||el.style==='solid')});
    return validateOpenPolylines(elements).concat(validateLineContours(lines,options)).concat(validateIntersections(elements,options));
  }
  function summary(issues){
    if(!issues||!issues.length)return{ok:true,title:'Чертёж готов',message:'Ошибок геометрии не найдено.'};
    var open=issues.filter(function(x){return x.code==='open_contour'||x.code==='open_polyline'}).length;
    var crosses=issues.filter(function(x){return x.code==='self_intersection'}).length;
    var projections=issues.filter(function(x){return x.code==='projection_mismatch'||x.code.indexOf('missing_')===0}).length;
    var parts=[];if(open)parts.push('разрывов: '+open);if(crosses)parts.push('пересечений: '+crosses);if(projections)parts.push('ошибок проекций: '+projections);
    return{ok:false,title:'Найдены ошибки чертежа',message:(parts.length?parts.join(', ')+'. ':issues[0].message+' ')+issues[0].message};
  }
  return{validateContours:validateContours,validateLineContours:validateLineContours,validateIntersections:validateIntersections,validateProjections:validateProjections,bounds:bounds,summary:summary,DEFAULT_TOLERANCE:DEFAULT_TOLERANCE};
});
