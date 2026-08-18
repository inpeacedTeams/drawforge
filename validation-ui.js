"use strict";
(function(){
  if(!window.DrawForgeValidation)return;
  var V=window.DrawForgeValidation,lastIssues=[];

  function source(){return S.mode==='proj'?S.projections.front:S.sheet}
  function validate(){lastIssues=V.validateContours(source(),{tolerance:Math.max(.01,S.grid*.02)});return lastIssues}
  function issuePoints(){var out=[];for(var i=0;i<lastIssues.length;i++)for(var j=0;j<lastIssues[i].points.length;j++)out.push(lastIssues[i].points[j]);return out}
  function selectIssueElements(){
    var ids={};for(var i=0;i<lastIssues.length;i++)for(var j=0;j<lastIssues[i].elementIds.length;j++)ids[lastIssues[i].elementIds[j]]=true;
    S.selected=Object.keys(ids);refreshInspector();paint();
  }
  function drawIssues(){
    if(!lastIssues.length||!CW)return;
    var pts=issuePoints();ctx.save();ctx.translate(S.viewport.x,S.viewport.y);ctx.scale(S.viewport.z,S.viewport.z);
    for(var i=0;i<pts.length;i++){
      var p=pts[i],r=10/S.viewport.z;
      ctx.fillStyle='rgba(220,38,38,.16)';ctx.strokeStyle='#dc2626';ctx.lineWidth=2/S.viewport.z;ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x-r*.45,p.y-r*.45);ctx.lineTo(p.x+r*.45,p.y+r*.45);ctx.moveTo(p.x+r*.45,p.y-r*.45);ctx.lineTo(p.x-r*.45,p.y+r*.45);ctx.stroke();
    }
    ctx.restore();
  }

  var originalPaint=window.paint;
  window.paint=function(){originalPaint();drawIssues()};

  var originalOpen3D=window.open3D;
  window.open3D=function(){
    var issues=validate();
    if(issues.length){
      var s=V.summary(issues);selectIssueElements();
      toast(s.message+' Красные метки показывают места разрыва.');
      return;
    }
    lastIssues=[];originalOpen3D();
  };

  var originalAdd=window.add;
  window.add=function(el){lastIssues=[];return originalAdd(el)};
  var originalRemove=window.removeSelected;
  window.removeSelected=function(){lastIssues=[];return originalRemove()};
  var originalEdit=window.editProp;
  window.editProp=function(field,value){lastIssues=[];return originalEdit(field,value)};
})();
