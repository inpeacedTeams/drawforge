"use strict";
(function(){if(!window.DrawForgeExport)return;var E=window.DrawForgeExport;
 function project(){return{version:1,sheet:S.sheet,projections:S.projections,mode:S.mode,unit:S.unit}}
 window.makeSVG=function(list){return E.svg(list)};window.makeDXF=function(list){return E.dxf(list)};
 var legacy=window.doExport;window.doExport=function(){
  var format=$('#expFmt').value;if(format==='png'||format==='stl')return legacy();
  closeExport();var payload=format==='json'?project():everything(),f=E.file(format,payload);download(f.content,f.name,f.type);toast('Файл скачан');
 };
 window.DrawForgeModules=window.DrawForgeModules||{};window.DrawForgeModules.export=E;
})();
