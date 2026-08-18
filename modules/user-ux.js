"use strict";
(function(){
 function button(text,title,action){var b=document.createElement('button');b.className='btn';b.textContent=text;b.title=title;b.addEventListener('click',action);return b}
 var right=document.querySelector('.hdr-right');
 if(right){
  var help=document.getElementById('btnHelp');
  right.insertBefore(button('Новый','Очистить лист и начать новый проект',function(){if(!confirm('Начать новый проект? Текущий чертёж будет удалён.'))return;S.sheet=[];S.projections={front:[],top:[],side:[]};S.selected=[];S.nextId=1;if(window.clearLocalProject)clearLocalProject();pushHistory();paint();refreshInspector();toast('Новый проект создан')}),help);
  right.insertBefore(button('Повтор','Повторить отменённое действие',function(){redo()}),document.getElementById('btnComb'));
  right.insertBefore(button('Экспорт','SVG, DXF, PNG, JSON или STL',function(){openExport()}),document.getElementById('btnSheet'));
 }
 var panel=document.createElement('div');panel.id='errorPanel';panel.className='error-panel';panel.innerHTML='<b>Проверка чертежа</b><button aria-label="Закрыть">×</button><div class="error-list"></div>';document.getElementById('stage').appendChild(panel);panel.querySelector('button').onclick=function(){panel.classList.remove('on')};
 window.showDrawingIssues=function(issues){var list=panel.querySelector('.error-list');list.innerHTML='';(issues||[]).forEach(function(i,n){var row=document.createElement('div');row.textContent=(n+1)+'. '+i.message;list.appendChild(row)});panel.classList.toggle('on',!!(issues&&issues.length))};
 var style=document.createElement('style');style.textContent='.error-panel{display:none;position:absolute;left:14px;bottom:44px;width:min(430px,calc(100% - 28px));max-height:220px;overflow:auto;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px 38px 12px 14px;z-index:12;box-shadow:0 8px 28px rgba(31,41,55,.16);color:#9a3412;font-size:12px}.error-panel.on{display:block}.error-panel>button{position:absolute;right:10px;top:7px;border:0;background:transparent;font-size:20px;color:#9a3412;cursor:pointer}.error-list{margin-top:6px;display:grid;gap:5px}@media(max-width:900px){.app{grid-template-rows:auto 1fr}.hdr{min-height:54px;flex-wrap:wrap;padding:8px}.hdr-center{order:3;width:100%;justify-content:center}.hdr-right{overflow-x:auto;max-width:calc(100vw - 130px)}.ws{grid-template-columns:58px 1fr}.rpanel{display:none}.tools{padding:6px 3px}.ti span{font-size:8px}}';document.head.appendChild(style);
})();
