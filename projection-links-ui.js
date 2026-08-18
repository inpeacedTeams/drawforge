"use strict";
(function(){if(!window.DrawForgeProjectionLinks)return;var L=window.DrawForgeProjectionLinks,inside=false;
 function syncNow(before){if(inside||S.mode!=='proj')return;var after=boundsOf(S.projections[S.proj]);if(!before||!after)return;if(Math.abs(before.w-after.w)<.001&&Math.abs(before.h-after.h)<.001)return;inside=true;var changed=L.sync(S.projections,S.proj,after,boundsOf);inside=false;if(changed.length){pushHistory();refreshBadges();paint();toast('Связанные размеры обновлены: '+changed.map(function(x){return x==='front'?'фронтальная':x==='top'?'вид сверху':'вид сбоку'}).join(', '))}}
 var edit=window.editProp;window.editProp=function(field,value){var before=S.mode==='proj'?boundsOf(S.projections[S.proj]):null;var result=edit(field,value);syncNow(before);return result};
 var dia=window.setDia;window.setDia=function(value){var before=S.mode==='proj'?boundsOf(S.projections[S.proj]):null;var result=dia(value);syncNow(before);return result};
 var len=window.setLineLen;window.setLineLen=function(value){var before=S.mode==='proj'?boundsOf(S.projections[S.proj]):null;var result=len(value);syncNow(before);return result};
})();
