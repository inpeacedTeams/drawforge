"use strict";
(function(){if(!window.DrawForgeGeometry3D||!window.DrawForgeSTL)return;var G=window.DrawForgeGeometry3D,STL=window.DrawForgeSTL;
 function source(){return S.mode==='proj'?S.projections.front:S.sheet}
 window.buildParts=function(depth){return G.buildParts(source(),depth)};
 window.makeFaces=function(parts){return G.makeFaces(parts)};
 window.makeSTL=function(){var depth=Math.max(1,parseFloat($('#depthVal').value)||40);return STL.fromParts(G.buildParts(source(),depth),'drawforge')};
 window.DrawForgeModules=window.DrawForgeModules||{};window.DrawForgeModules.geometry3d=G;window.DrawForgeModules.stl=STL;
})();
