"use strict";
(function(){
 if(!window.DrawForgeHistory||!window.S)return;
 var history=DrawForgeHistory.create({limit:60});
 function state(){return{s:S.sheet,p:S.projections}}
 function apply(value,label){if(!value)return false;S.sheet=value.s||[];S.projections=value.p||S.projections;S.selected=[];refreshInspector();paint();toast(label);return true}
 history.reset(state());
 window.pushHistory=function(){history.snapshot(state());S.history=[];S.hi=history.inspect().index};
 window.undo=function(){apply(history.undo(),'Отменено')};
 window.redo=function(){apply(history.redo(),'Повторено')};
 window.DrawForgeModules=window.DrawForgeModules||{};window.DrawForgeModules.history=history;
})();
