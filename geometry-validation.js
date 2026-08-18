"use strict";

/* DrawForge geometry diagnostics.
 * Pure functions only: this file does not touch the UI and can be tested separately.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DrawForgeValidation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  var DEFAULT_TOLERANCE=0.01;

  function distance(a,b){
    var dx=a.x-b.x,dy=a.y-b.y;
    return Math.sqrt(dx*dx+dy*dy);
  }

  function clonePoint(p){return{x:Number(p.x),y:Number(p.y)}}

  function endpointKey(nodes,p,tolerance){
    for(var i=0;i<nodes.length;i++)if(distance(nodes[i].point,p)<=tolerance)return i;
    nodes.push({point:clonePoint(p),edges:[],elementIds:[]});
    return nodes.length-1;
  }

  function lineGraph(lines,tolerance){
    var nodes=[],edges=[];
    for(var i=0;i<lines.length;i++){
      var el=lines[i];
      var a=endpointKey(nodes,{x:el.x1,y:el.y1},tolerance);
      var b=endpointKey(nodes,{x:el.x2,y:el.y2},tolerance);
      var edge={a:a,b:b,id:el.id||null,index:i};
      var ei=edges.push(edge)-1;
      nodes[a].edges.push(ei);nodes[b].edges.push(ei);
      if(el.id!=null){nodes[a].elementIds.push(el.id);nodes[b].elementIds.push(el.id)}
    }
    return{nodes:nodes,edges:edges};
  }

  function graphComponents(graph){
    var seenNodes={},components=[];
    for(var start=0;start<graph.nodes.length;start++){
      if(seenNodes[start])continue;
      var queue=[start],nodeIds=[],edgeMap={};seenNodes[start]=true;
      while(queue.length){
        var ni=queue.shift(),node=graph.nodes[ni];nodeIds.push(ni);
        for(var j=0;j<node.edges.length;j++){
          var ei=node.edges[j],edge=graph.edges[ei],other=edge.a===ni?edge.b:edge.a;
          edgeMap[ei]=true;
          if(!seenNodes[other]){seenNodes[other]=true;queue.push(other)}
        }
      }
      components.push({nodes:nodeIds,edges:Object.keys(edgeMap).map(Number)});
    }
    return components;
  }

  function issue(code,message,elementIds,points,meta){
    return{code:code,message:message,elementIds:elementIds||[],points:points||[],meta:meta||{}};
  }

  function validateLineContours(lines,options){
    options=options||{};
    var tolerance=Number(options.tolerance)||DEFAULT_TOLERANCE;
    if(!lines.length)return[];
    var graph=lineGraph(lines,tolerance),components=graphComponents(graph),issues=[];
    for(var i=0;i<components.length;i++){
      var component=components[i],odd=[],branch=[],ids={};
      for(var n=0;n<component.nodes.length;n++){
        var node=graph.nodes[component.nodes[n]],degree=node.edges.length;
        if(degree===1)odd.push(node.point);
        if(degree>2)branch.push(node.point);
        for(var q=0;q<node.elementIds.length;q++)ids[node.elementIds[q]]=true;
      }
      var elementIds=Object.keys(ids);
      if(component.edges.length<3){
        issues.push(issue('too_few_edges','Для замкнутого контура нужно минимум три отрезка.',elementIds,odd,{edgeCount:component.edges.length}));
      }else if(odd.length){
        issues.push(issue('open_contour','Контур не замкнут: соедините отмеченные конечные точки.',elementIds,odd,{openEnds:odd.length,edgeCount:component.edges.length}));
      }
      if(branch.length){
        issues.push(issue('branching_contour','В одной точке сходятся больше двух линий. Разделите пересекающиеся контуры.',elementIds,branch,{branchCount:branch.length}));
      }
    }
    return issues;
  }

  function validateOpenPolylines(elements){
    var issues=[];
    for(var i=0;i<elements.length;i++){
      var el=elements[i];
      if(el.type!=='polyline'||el.closed||!el.points||el.points.length<2)continue;
      issues.push(issue('open_polyline','Ломаная не замкнута. Замкните её или используйте инструмент «Контур».',el.id?[el.id]:[],[clonePoint(el.points[0]),clonePoint(el.points[el.points.length-1])],{pointCount:el.points.length}));
    }
    return issues;
  }

  function validateContours(elements,options){
    elements=Array.isArray(elements)?elements:[];
    var solidLines=elements.filter(function(el){return el&&el.type==='line'&&(!el.style||el.style==='solid')});
    return validateOpenPolylines(elements).concat(validateLineContours(solidLines,options));
  }

  function summary(issues){
    if(!issues||!issues.length)return{ok:true,title:'Контуры готовы',message:'Ошибок замыкания не найдено.'};
    var open=issues.filter(function(x){return x.code==='open_contour'||x.code==='open_polyline'}).length;
    return{ok:false,title:'Найдены ошибки контура',message:open?'Незамкнутых контуров: '+open+'. Исправьте отмеченные места перед построением 3D.':issues[0].message};
  }

  return{validateContours:validateContours,validateLineContours:validateLineContours,summary:summary,DEFAULT_TOLERANCE:DEFAULT_TOLERANCE};
});
