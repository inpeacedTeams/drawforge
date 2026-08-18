"use strict";
(function(){
  if(!window.DrawForgeValidation)return;
  var V=window.DrawForgeValidation,lastIssues=[];
  function source(){return S.mode==='proj'?S.projections.front:S.sheet}
  function validate(){
    var tolerance=Math.max(.01,S.grid*.02);
    lastIssues=V.validateContours(source(),{tolerance:tolerance});
    if(S.mode==='proj')lastIssues=lastIssues.concat(V.validateProjections(S.projections,{dimensionTolerance:Math.max(1,S.grid*.1)}));
    return lastIssues;
  }
  function markedPoints(){var out=[];for(var i=0;i<lastIssues.length;i++)for(var j=0;j<lastIssues[i].points.length;j++)out.push({point:lastIssues[i].points[j],code:lastIssues[i].code});return out}
  function selectIssueElements(){
    var ids={};for(var i=0;i<lastIssues.length;i++)for(var j=0;j<lastIssues[i].elementIds.length;j++)ids[lastIssues[i].elementIds[j]]=true;
    S.selected=Object.keys(ids);refreshInspector();paint();
  }
  function markProjectionTabs(){
    var bad={};for(var i=0;i<lastIssues.length;i++){var views=lastIssues[i].meta&&lastIssues[i].meta.views;if(views)for(var j=0;j<views.length;j++)bad[views[j]]=true;var p=lastIssues[i].meta&&lastIssues[i].meta.projection;if(p)bad[p]=true}
    var tabs=$$('.ptab');for(var k=0;k<tabs.length;k++){var key=tabs[k].getAttribute('data-p');tabs[k].style.boxShadow=bad[key]?'inset 0 0 0 2px #dc2626':'';tabs[k].title=bad[key]?'В этой проекции найдена ошибка':''}
  }
  function clearProjectionTabs(){var tabs=$$('.ptab');for(var i=0;i<tabs.length;i++){tabs[i].style.boxShadow='';tabs[i].title=''}}
  function drawIssues(){
    if(!lastIssues.length||!CW)return;
    var pts=markedPoints();ctx.save();ctx.translate(S.viewport.x,S.viewport.y);ctx.scale(S.viewport.z,S.viewport.z);
    for(var i=0;i<pts.length;i++){
      var item=pts[i],p=item.point,r=10/S.viewport.z,c=item.code==='self_intersection'?'#f97316':'#dc2626';
      ctx.fillStyle=item.code==='self_intersection'?'rgba(249,115,22,.18)':'rgba(220,38,38,.16)';ctx.strokeStyle=c;ctx.lineWidth=2/S.viewport.z;ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x-r*.45,p.y-r*.45);ctx.lineTo(p.x+r*.45,p.y+r*.45);ctx.moveTo(p.x+r*.45,p.y-r*.45);ctx.lineTo(p.x-r*.45,p.y+r*.45);ctx.stroke();
    }
    ctx.restore();
  }
  var originalPaint=window.paint;window.paint=function(){originalPaint();drawIssues()};
  var originalOpen3D=window.open3D;window.open3D=function(){
    var issues=validate();
    if(issues.length){var s=V.summary(issues);selectIssueElements();markProjectionTabs();toast(s.message+' Красные метки: разрывы, оранжевые: пересечения.');return}
    lastIssues=[];clearProjectionTabs();originalOpen3D();
  };
  function clear(){lastIssues=[];clearProjectionTabs()}
  var originalAdd=window.add;window.add=function(el){clear();return originalAdd(el)};
  var originalRemove=window.removeSelected;window.removeSelected=function(){clear();return originalRemove()};
  var originalEdit=window.editProp;window.editProp=function(field,value){clear();return originalEdit(field,value)};
  var originalSwitch=window.switchProj;window.switchProj=function(key){return originalSwitch(key)};
})();
