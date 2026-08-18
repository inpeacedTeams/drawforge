"use strict";
(function(){
 if(!window.DrawForgeStorage||!window.DrawForgeProjectState||!window.S)return;
 var P=DrawForgeProjectState;
 function state(){return{sheet:S.sheet,projections:S.projections,mode:S.mode,viewport:S.viewport,nextId:S.nextId,unit:S.unit,autoDims:S.autoDims}}
 function apply(p){if(!p||p.error)return false;S.sheet=p.sheet;S.projections=p.projections;S.mode=p.mode;S.viewport=p.viewport;S.nextId=p.nextId;S.unit=p.unit;S.autoDims=p.autoDims;return true}
 var store=DrawForgeStorage.create({adapter:localStorage,key:'drawforge.project',legacyKeys:['df15'],serialize:P.serialize,restore:P.restore});
 window.saveLocal=function(){try{store.save(state());return true}catch(error){console.warn('DrawForge save failed',error);return false}};
 window.loadLocal=function(){var p=store.load();if(p&&p.error){console.warn('DrawForge project is damaged',p.message);return false}return apply(p)};
 window.clearLocalProject=function(){store.clear();toast('Сохранённый проект удалён')};
 window.DrawForgeModules=window.DrawForgeModules||{};window.DrawForgeModules.storage=store;
 /* Legacy app already performed the first load. Migrate it immediately to the versioned key. */
 window.saveLocal();
})();
