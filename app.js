"use strict";
var $=function(s){return document.querySelector(s)};
var $$=function(s){return document.querySelectorAll(s)};
var S={mode:'sheet',tool:'select',proj:'front',sheet:[],projections:{front:[],top:[],side:[]},selected:[],viewport:{x:0,y:0,z:1},drawing:null,panning:false,snap:true,grid:10,history:[],hi:-1,nextId:1,is3D:false,inited:false,autoDims:false,unit:'mm'};
var TIPS={select:'Кликните на фигуру, чтобы выбрать её и увидеть размеры.',pan:'Зажмите и тяните, чтобы двигать лист.',line:'Кликните начало, затем конец линии.',rect:'Нажмите и тяните. Точные размеры задайте справа.',circle:'Кликните центр, затем задайте радиус.',polyline:'Кликайте точки, двойной клик завершает.',polygon:'Кликайте вершины, двойной клик замыкает контур.',dimension:'Кликните две точки, размер посчитается сам.',erase:'Кликните на объект, чтобы удалить его.'};
var DPR=Math.min(window.devicePixelRatio||1,2);
var cnv=$('#c2d'),ctx=cnv.getContext('2d'),CW=0,CH=0;

function curList(){return S.mode==='sheet'?S.sheet:S.projections[S.proj]}
function setList(a){if(S.mode==='sheet'){S.sheet=a}else{S.projections[S.proj]=a}}
function everything(){return S.sheet.concat(S.projections.front,S.projections.top,S.projections.side)}
function copy(o){return JSON.parse(JSON.stringify(o))}
function toast(t){var el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('on')},2600)}
function fmtVal(mm,unit){unit=unit||S.unit;return unit==='cm'?(mm/10).toFixed(1)+' см':Math.round(mm)+' мм'}

function resizeAll(){
  var r=$('#stage').getBoundingClientRect();
  CW=Math.max(1,Math.round(r.width));CH=Math.max(1,Math.round(r.height));
  cnv.width=CW*DPR;cnv.height=CH*DPR;cnv.style.width=CW+'px';cnv.style.height=CH+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!S.inited){S.viewport.x=CW/2;S.viewport.y=CH/2;S.inited=true}
  paint();
  if($('#combView').classList.contains('on'))paintCombined();
  if(S.is3D)fit3D();
  if(TOUR.active)placeTour();
}
window.addEventListener('resize',resizeAll);

function toWorld(x,y){return{x:(x-S.viewport.x)/S.viewport.z,y:(y-S.viewport.y)/S.viewport.z}}
function toScreen(x,y){return{x:x*S.viewport.z+S.viewport.x,y:y*S.viewport.z+S.viewport.y}}
function snapPt(p){if(!S.snap)return p;var g=S.grid;return{x:Math.round(p.x/g)*g,y:Math.round(p.y/g)*g}}
function pushHistory(){S.history=S.history.slice(0,S.hi+1);S.history.push(copy({s:S.sheet,p:S.projections}));S.hi=S.history.length-1}
function undo(){if(S.hi<=0)return;S.hi--;var h=copy(S.history[S.hi]);S.sheet=h.s;S.projections=h.p;S.selected=[];refreshInspector();paint();toast('Отменено')}
function redo(){if(S.hi>=S.history.length-1)return;S.hi++;var h=copy(S.history[S.hi]);S.sheet=h.s;S.projections=h.p;S.selected=[];refreshInspector();paint();toast('Повторено')}

function paint(){
  if(!CW)return;
  ctx.clearRect(0,0,CW,CH);ctx.fillStyle='#f5f7fa';ctx.fillRect(0,0,CW,CH);
  paintGrid();
  ctx.save();ctx.translate(S.viewport.x,S.viewport.y);ctx.scale(S.viewport.z,S.viewport.z);
  var list=curList(),i;
  for(i=0;i<list.length;i++)paintShape(list[i],S.selected.indexOf(list[i].id)>=0,false);
  if(S.drawing)paintShape(S.drawing,false,true);
  if(S.autoDims)paintDims(ctx,autoDims(list),1/S.viewport.z);
  ctx.restore();
  refreshBadges();
}
function paintGrid(){
  var s=10*S.viewport.z,m=s*5,x,y;
  ctx.save();
  ctx.strokeStyle='#ebeef2';ctx.lineWidth=.5;ctx.beginPath();
  for(x=S.viewport.x%s;x<CW;x+=s){ctx.moveTo(x,0);ctx.lineTo(x,CH)}
  for(y=S.viewport.y%s;y<CH;y+=s){ctx.moveTo(0,y);ctx.lineTo(CW,y)}
  ctx.stroke();
  ctx.strokeStyle='#d6dce4';ctx.lineWidth=.8;ctx.beginPath();
  for(x=S.viewport.x%m;x<CW;x+=m){ctx.moveTo(x,0);ctx.lineTo(x,CH)}
  for(y=S.viewport.y%m;y<CH;y+=m){ctx.moveTo(0,y);ctx.lineTo(CW,y)}
  ctx.stroke();
  ctx.strokeStyle='#bac4d0';ctx.lineWidth=1.2;ctx.beginPath();
  ctx.moveTo(S.viewport.x,0);ctx.lineTo(S.viewport.x,CH);ctx.moveTo(0,S.viewport.y);ctx.lineTo(CW,S.viewport.y);
  ctx.stroke();ctx.restore();
}
function handle(x,y){ctx.save();ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.arc(x,y,4/S.viewport.z,0,Math.PI*2);ctx.fill();ctx.restore()}
function paintShape(el,sel,preview){
  var z=S.viewport.z,col=sel?'#7c3aed':(preview?'#0ea5e9':'#1a2030'),i;
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=(sel?2.5:1.8)/z;ctx.lineCap='round';ctx.lineJoin='round';
  if(el.type==='line'){ctx.beginPath();ctx.moveTo(el.x1,el.y1);ctx.lineTo(el.x2,el.y2);ctx.stroke();if(sel){handle(el.x1,el.y1);handle(el.x2,el.y2)}}
  if(el.type==='rect'){ctx.beginPath();ctx.rect(el.x,el.y,el.w,el.h);ctx.stroke();if(sel){handle(el.x,el.y);handle(el.x+el.w,el.y);handle(el.x+el.w,el.y+el.h);handle(el.x,el.y+el.h)}}
  if(el.type==='circle'){ctx.beginPath();ctx.arc(el.cx,el.cy,el.r,0,Math.PI*2);ctx.stroke();if(sel)handle(el.cx,el.cy)}
  if(el.type==='polyline'||el.type==='polygon'){
    if(el.points&&el.points.length>1){ctx.beginPath();ctx.moveTo(el.points[0].x,el.points[0].y);
      for(i=1;i<el.points.length;i++)ctx.lineTo(el.points[i].x,el.points[i].y);
      if(el.closed||el.type==='polygon')ctx.closePath();ctx.stroke()}
    if(sel&&el.points)for(i=0;i<el.points.length;i++)handle(el.points[i].x,el.points[i].y);
    if(preview&&el.ghost&&el.points){var last=el.points[el.points.length-1];
      ctx.save();ctx.setLineDash([5/z,4/z]);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(el.ghost.x,el.ghost.y);ctx.stroke();ctx.restore()}
  }
  if(el.type==='dimension'){
    var o=15/z;ctx.save();ctx.strokeStyle='#16a34a';ctx.fillStyle='#16a34a';ctx.lineWidth=1/z;
    ctx.setLineDash([3/z,2/z]);ctx.beginPath();
    ctx.moveTo(el.x1,el.y1);ctx.lineTo(el.x1,el.y1-o*1.5);ctx.moveTo(el.x2,el.y2);ctx.lineTo(el.x2,el.y2-o*1.5);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(el.x1,el.y1-o);ctx.lineTo(el.x2,el.y2-o);ctx.stroke();
    var d=Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2));
    ctx.font='bold '+(10/z)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(fmtVal(d),(el.x1+el.x2)/2,(el.y1+el.y2)/2-o-3/z);ctx.restore()
  }
}
function refreshBadges(){
  var b=$$('.ptab .badge');
  for(var i=0;i<b.length;i++){var key=b[i].parentNode.getAttribute('data-p');
    if(S.projections[key].length>0)b[i].classList.add('has');else b[i].classList.remove('has')}
}

function autoDims(list){
  var out=[],i;
  for(i=0;i<list.length;i++){
    var el=list[i];
    if(el.type==='dimension')continue;
    if(el.type==='rect'){
      var x1=Math.min(el.x,el.x+el.w),x2=Math.max(el.x,el.x+el.w);
      var y1=Math.min(el.y,el.y+el.h),y2=Math.max(el.y,el.y+el.h);
      out.push({t:'h',a:x1,b:x2,at:y2,val:x2-x1});
      out.push({t:'v',a:y1,b:y2,at:x2,val:y2-y1});
    }else if(el.type==='circle'){
      out.push({t:'dia',cx:el.cx,cy:el.cy,r:el.r,val:el.r*2});
    }else if(el.type==='line'){
      out.push({t:'len',x1:el.x1,y1:el.y1,x2:el.x2,y2:el.y2,val:Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2))});
    }else if(el.points&&el.points.length>1){
      var b=shapeBounds(el);
      out.push({t:'h',a:b.x1,b:b.x2,at:b.y2,val:b.x2-b.x1});
      out.push({t:'v',a:b.y1,b:b.y2,at:b.x2,val:b.y2-b.y1});
    }
  }
  return out;
}
function arrow(g,x,y,ang,size){
  g.beginPath();g.moveTo(x,y);
  g.lineTo(x+Math.cos(ang+0.38)*size,y+Math.sin(ang+0.38)*size);
  g.lineTo(x+Math.cos(ang-0.38)*size,y+Math.sin(ang-0.38)*size);
  g.closePath();g.fill();
}
function paintDims(g,dims,k,unit){
  if(!dims.length)return;
  var off=20*k,ar=5*k,i;
  g.save();
  g.strokeStyle='#0f766e';g.fillStyle='#0f766e';g.lineWidth=1*k;
  g.font='bold '+(11*k)+'px system-ui';
  for(i=0;i<dims.length;i++){
    var d=dims[i],txt=fmtVal(d.val,unit);
    if(d.t==='h'){
      var y=d.at+off;
      g.save();g.setLineDash([3*k,2.5*k]);g.beginPath();
      g.moveTo(d.a,d.at+3*k);g.lineTo(d.a,y+4*k);g.moveTo(d.b,d.at+3*k);g.lineTo(d.b,y+4*k);g.stroke();g.restore();
      g.beginPath();g.moveTo(d.a,y);g.lineTo(d.b,y);g.stroke();
      arrow(g,d.a,y,0,ar);arrow(g,d.b,y,Math.PI,ar);
      g.textAlign='center';g.textBaseline='bottom';
      g.fillText(txt,(d.a+d.b)/2,y-3*k);
    }else if(d.t==='v'){
      var x=d.at+off;
      g.save();g.setLineDash([3*k,2.5*k]);g.beginPath();
      g.moveTo(d.at+3*k,d.a);g.lineTo(x+4*k,d.a);g.moveTo(d.at+3*k,d.b);g.lineTo(x+4*k,d.b);g.stroke();g.restore();
      g.beginPath();g.moveTo(x,d.a);g.lineTo(x,d.b);g.stroke();
      arrow(g,x,d.a,Math.PI/2,ar);arrow(g,x,d.b,-Math.PI/2,ar);
      g.textAlign='left';g.textBaseline='middle';
      g.fillText(txt,x+6*k,(d.a+d.b)/2);
    }else if(d.t==='dia'){
      var ex=d.cx+Math.cos(-0.7)*(d.r+off*0.9),ey=d.cy+Math.sin(-0.7)*(d.r+off*0.9);
      g.beginPath();g.moveTo(d.cx+Math.cos(-0.7)*d.r*0.25,d.cy+Math.sin(-0.7)*d.r*0.25);g.lineTo(ex,ey);g.stroke();
      g.textAlign='left';g.textBaseline='bottom';
      g.fillText('\u2300 '+txt,ex+3*k,ey-2*k);
    }else if(d.t==='len'){
      var mx=(d.x1+d.x2)/2,my=(d.y1+d.y2)/2;
      var dx=d.x2-d.x1,dy=d.y2-d.y1,L=Math.sqrt(dx*dx+dy*dy)||1;
      var nx=-dy/L,ny=dx/L;
      g.textAlign='center';g.textBaseline='middle';
      g.fillText(txt,mx+nx*10*k,my+ny*10*k);
    }
  }
  g.restore();
}
function toggleAutoDims(){
  S.autoDims=!S.autoDims;
  $('#btnDims').classList.toggle('on',S.autoDims);
  $('#btnCombDims').classList.toggle('on',S.autoDims);
  paint();
  if($('#combView').classList.contains('on'))paintCombined();
  toast(S.autoDims?'Разметка размеров включена':'Разметка выключена');
}
function toggleUnit(){
  S.unit=S.unit==='mm'?'cm':'mm';
  var name=S.unit==='mm'?'мм':'см';
  $('#btnUnit').textContent=name;$('#sUnit').textContent=name;
  paint();refreshInspector();
  if($('#combView').classList.contains('on'))paintCombined();
  if(S.is3D)updateInfo3D();
  toast('Единицы: '+(S.unit==='mm'?'миллиметры':'сантиметры'));
}

var mouseDown=false,dragTarget=null,dragFrom=null;
cnv.addEventListener('mousedown',function(e){
  var p=snapPt(toWorld(e.offsetX,e.offsetY));
  if(S.tool==='pan'||e.button===1){S.panning=true;return}
  if(e.button!==0)return;
  mouseDown=true;
  if(S.tool==='select'){var h=pick(p);if(h){S.selected=[h.id];dragTarget=h;dragFrom={x:p.x,y:p.y}}else{S.selected=[]}refreshInspector();paint();return}
  if(S.tool==='erase'){var t=pick(p);if(t){setList(curList().filter(function(x){return x.id!==t.id}));pushHistory();paint();toast('Удалено')}return}
  if(S.tool==='line')S.drawing={type:'line',x1:p.x,y1:p.y,x2:p.x,y2:p.y};
  if(S.tool==='rect')S.drawing={type:'rect',x:p.x,y:p.y,w:0,h:0};
  if(S.tool==='circle')S.drawing={type:'circle',cx:p.x,cy:p.y,r:0};
  if(S.tool==='dimension')S.drawing={type:'dimension',x1:p.x,y1:p.y,x2:p.x,y2:p.y};
  if(S.tool==='polyline'||S.tool==='polygon'){
    if(!S.drawing)S.drawing={type:S.tool,points:[{x:p.x,y:p.y}],closed:S.tool==='polygon'};
    else S.drawing.points.push({x:p.x,y:p.y})}
  paint();
});
cnv.addEventListener('mousemove',function(e){
  var p=snapPt(toWorld(e.offsetX,e.offsetY));
  $('#sX').textContent=p.x.toFixed(1);$('#sY').textContent=p.y.toFixed(1);
  var sp=toScreen(p.x,p.y),marker=$('#sdot');
  if(S.snap&&Math.sqrt(Math.pow(e.offsetX-sp.x,2)+Math.pow(e.offsetY-sp.y,2))<14){marker.style.left=sp.x+'px';marker.style.top=sp.y+'px';marker.classList.add('on')}
  else marker.classList.remove('on');
  if(S.panning){S.viewport.x+=e.movementX;S.viewport.y+=e.movementY;paint();return}
  if(dragTarget&&mouseDown){shift(dragTarget,p.x-dragFrom.x,p.y-dragFrom.y);dragFrom={x:p.x,y:p.y};paint();return}
  if(!S.drawing)return;
  var lab=$('#mlabel'),d=S.drawing;
  lab.classList.add('on');lab.style.left=(e.offsetX+14)+'px';lab.style.top=(e.offsetY-20)+'px';
  if(d.type==='line'||d.type==='dimension'){d.x2=p.x;d.y2=p.y;lab.textContent=fmtVal(Math.sqrt(Math.pow(p.x-d.x1,2)+Math.pow(p.y-d.y1,2)))}
  if(d.type==='rect'){d.w=p.x-d.x;d.h=p.y-d.y;lab.textContent=fmtVal(Math.abs(d.w))+' × '+fmtVal(Math.abs(d.h))}
  if(d.type==='circle'){d.r=Math.sqrt(Math.pow(p.x-d.cx,2)+Math.pow(p.y-d.cy,2));lab.textContent='R '+fmtVal(d.r)}
  if(d.type==='polyline'||d.type==='polygon')d.ghost={x:p.x,y:p.y};
  paint();
});
cnv.addEventListener('mouseup',function(){
  S.panning=false;mouseDown=false;dragTarget=null;$('#mlabel').classList.remove('on');
  var d=S.drawing;if(!d)return;
  if(d.type==='line'&&Math.sqrt(Math.pow(d.x2-d.x1,2)+Math.pow(d.y2-d.y1,2))>2)add(d);
  if(d.type==='rect'){if(d.w<0){d.x+=d.w;d.w=-d.w}if(d.h<0){d.y+=d.h;d.h=-d.h}if(d.w>2&&d.h>2)add(d)}
  if(d.type==='circle'&&d.r>2)add(d);
  if(d.type==='dimension'&&Math.sqrt(Math.pow(d.x2-d.x1,2)+Math.pow(d.y2-d.y1,2))>2)add(d);
  if(['line','rect','circle','dimension'].indexOf(d.type)>=0)S.drawing=null;
  paint();
});
cnv.addEventListener('dblclick',function(){
  var d=S.drawing;
  if(d&&(d.type==='polyline'||d.type==='polygon')){delete d.ghost;if(d.points.length>2)add(d);S.drawing=null;paint()}
});
cnv.addEventListener('wheel',function(e){
  e.preventDefault();
  var f=e.deltaY<0?1.12:.9,oz=S.viewport.z,nz=Math.max(.08,Math.min(20,oz*f));
  var wx=(e.offsetX-S.viewport.x)/oz,wy=(e.offsetY-S.viewport.y)/oz;
  S.viewport.z=nz;S.viewport.x=e.offsetX-wx*nz;S.viewport.y=e.offsetY-wy*nz;
  $('#sZ').textContent=Math.round(nz*100)+'%';paint();
},{passive:false});

function add(el){el.id='e'+(S.nextId++);curList().push(copy(el));S.selected=[el.id];pushHistory();refreshInspector();paint()}
function shift(el,dx,dy){
  if(el.type==='line'||el.type==='dimension'){el.x1+=dx;el.y1+=dy;el.x2+=dx;el.y2+=dy}
  else if(el.type==='rect'){el.x+=dx;el.y+=dy}
  else if(el.type==='circle'){el.cx+=dx;el.cy+=dy}
  else if(el.points){for(var i=0;i<el.points.length;i++){el.points[i].x+=dx;el.points[i].y+=dy}}
}
function segDist(p,x1,y1,x2,y2){
  var dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;
  if(!l)return Math.sqrt(Math.pow(p.x-x1,2)+Math.pow(p.y-y1,2));
  var t=((p.x-x1)*dx+(p.y-y1)*dy)/l;t=Math.max(0,Math.min(1,t));
  return Math.sqrt(Math.pow(p.x-(x1+t*dx),2)+Math.pow(p.y-(y1+t*dy),2));
}
function pick(p){
  var tol=8/S.viewport.z,list=curList(),i,j,el;
  for(i=list.length-1;i>=0;i--){el=list[i];
    if(el.type==='line'||el.type==='dimension'){if(segDist(p,el.x1,el.y1,el.x2,el.y2)<tol)return el}
    if(el.type==='rect'){
      if(segDist(p,el.x,el.y,el.x+el.w,el.y)<tol||segDist(p,el.x+el.w,el.y,el.x+el.w,el.y+el.h)<tol||
         segDist(p,el.x+el.w,el.y+el.h,el.x,el.y+el.h)<tol||segDist(p,el.x,el.y+el.h,el.x,el.y)<tol)return el}
    if(el.type==='circle'){if(Math.abs(Math.sqrt(Math.pow(p.x-el.cx,2)+Math.pow(p.y-el.cy,2))-el.r)<tol)return el}
    if(el.points){
      for(j=0;j<el.points.length-1;j++)if(segDist(p,el.points[j].x,el.points[j].y,el.points[j+1].x,el.points[j+1].y)<tol)return el;
      if((el.closed||el.type==='polygon')&&el.points.length>2){var L=el.points[el.points.length-1];
        if(segDist(p,L.x,L.y,el.points[0].x,el.points[0].y)<tol)return el}}
  }
  return null;
}

function refreshInspector(){
  var box=$('#inspector');
  if(!S.selected.length){box.innerHTML='<div class="empty">Выберите объект или начните рисовать.</div>';return}
  var list=curList(),el=null;
  for(var i=0;i<list.length;i++)if(list[i].id===S.selected[0])el=list[i];
  if(!el){box.innerHTML='<div class="empty">Выберите объект.</div>';return}
  var names={line:'Линия',rect:'Прямоугольник',circle:'Окружность',polyline:'Ломаная',polygon:'Контур',dimension:'Размер'};
  function row(label,val,field){return '<div class="row"><div class="lbl">'+label+'</div><input class="inp" type="number" step="1" value="'+Number(val).toFixed(1)+'" onchange="editProp(\''+field+'\',this.value)"></div>'}
  var h='<div class="sec"><div class="sec-t">'+(names[el.type]||el.type)+'</div><div class="card">';
  if(el.type==='line'){h+=row('X начала',el.x1,'x1')+row('Y начала',el.y1,'y1')+row('X конца',el.x2,'x2')+row('Y конца',el.y2,'y2');
    h+='<div class="row"><div class="lbl">Длина</div><div style="font:12px var(--mono)">'+fmtVal(Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2)))+'</div></div>'}
  if(el.type==='rect'){h+=row('X',el.x,'x')+row('Y',el.y,'y')+row('Ширина',el.w,'w')+row('Высота',el.h,'h');
    h+='<div class="row"><div class="lbl">Размер</div><div style="font:12px var(--mono)">'+fmtVal(Math.abs(el.w))+' × '+fmtVal(Math.abs(el.h))+'</div></div>'}
  if(el.type==='circle'){h+=row('Центр X',el.cx,'cx')+row('Центр Y',el.cy,'cy')+row('Радиус',el.r,'r');
    h+='<div class="row"><div class="lbl">Диаметр</div><div style="font:12px var(--mono)">'+fmtVal(el.r*2)+'</div></div>'}
  if(el.type==='dimension')h+=row('X1',el.x1,'x1')+row('Y1',el.y1,'y1')+row('X2',el.x2,'x2')+row('Y2',el.y2,'y2');
  if(el.points)h+='<div class="row"><div class="lbl">Вершин</div><div style="font:12px var(--mono)">'+el.points.length+'</div></div>';
  h+='</div></div><div class="sec"><button class="btn" style="width:100%" onclick="removeSelected()">Удалить объект</button></div>';
  box.innerHTML=h;
}
function editProp(field,value){
  var list=curList();
  for(var i=0;i<list.length;i++)if(list[i].id===S.selected[0]){list[i][field]=parseFloat(value);break}
  pushHistory();paint();refreshInspector();
}
function removeSelected(){
  setList(curList().filter(function(e){return S.selected.indexOf(e.id)<0}));
  S.selected=[];pushHistory();refreshInspector();paint();toast('Удалено');
}

function startWith(mode,withTour){
  $('#welcome').classList.add('off');
  setMode(mode);
  setTimeout(function(){
    resizeAll();
    if(withTour)startTour();
    else if(!localStorage.getItem('df12_tour'))startTour();
  },60);
}
function setMode(mode){
  S.mode=mode;
  $('#welcome').classList.add('off');
  $('#mSheet').classList.toggle('on',mode==='sheet');
  $('#mProj').classList.toggle('on',mode==='proj');
  $('#ptabs').classList.toggle('on',mode==='proj');
  $('#btnComb').style.display=mode==='proj'?'':'none';
  S.selected=[];refreshInspector();resizeAll();
}
function switchProj(key){
  S.proj=key;
  var tabs=$$('.ptab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('on',tabs[i].getAttribute('data-p')===key);
  S.selected=[];refreshInspector();paint();
}
function setTool(t){
  S.tool=t;S.drawing=null;
  var items=$$('.ti');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('on',items[i].getAttribute('data-t')===t);
  $('#tipBox').textContent=TIPS[t]||'';paint();
}

function boundsOf(list){
  if(!list||!list.length)return null;
  var x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
  for(var i=0;i<list.length;i++){var b=shapeBounds(list[i]);
    x1=Math.min(x1,b.x1);y1=Math.min(y1,b.y1);x2=Math.max(x2,b.x2);y2=Math.max(y2,b.y2)}
  return{x1:x1,y1:y1,x2:x2,y2:y2,w:x2-x1,h:y2-y1};
}
function shapeBounds(el){
  if(el.type==='line'||el.type==='dimension')return{x1:Math.min(el.x1,el.x2),y1:Math.min(el.y1,el.y2),x2:Math.max(el.x1,el.x2),y2:Math.max(el.y1,el.y2)};
  if(el.type==='rect')return{x1:Math.min(el.x,el.x+el.w),y1:Math.min(el.y,el.y+el.h),x2:Math.max(el.x,el.x+el.w),y2:Math.max(el.y,el.y+el.h)};
  if(el.type==='circle')return{x1:el.cx-el.r,y1:el.cy-el.r,x2:el.cx+el.r,y2:el.cy+el.r};
  if(el.points&&el.points.length){var xs=[],ys=[];for(var i=0;i<el.points.length;i++){xs.push(el.points[i].x);ys.push(el.points[i].y)}
    return{x1:Math.min.apply(null,xs),y1:Math.min.apply(null,ys),x2:Math.max.apply(null,xs),y2:Math.max.apply(null,ys)}}
  return{x1:0,y1:0,x2:0,y2:0};
}

function layoutCombined(){
  var fb=boundsOf(S.projections.front),tb=boundsOf(S.projections.top),sb=boundsOf(S.projections.side),gap=60;
  var pad=S.autoDims?42:0;
  var fw=fb?fb.w:0,fh=fb?fb.h:0,tw=tb?tb.w:0,th=tb?tb.h:0,sw2=sb?sb.w:0,sh2=sb?sb.h:0;
  var fy=th?th+gap+pad:0;
  var sx=fw+gap+pad;
  var W=Math.max(tw+pad,fw+(sw2?gap+pad+sw2+pad:pad)),H=fy+Math.max(fh,sh2)+pad;
  return{fb:fb,tb:tb,sb:sb,gap:gap,fw:fw,fh:fh,tw:tw,th:th,sw2:sw2,sh2:sh2,fy:fy,sx:sx,W:Math.max(W,1),H:Math.max(H,1)};
}
function openCombined(){$('#combView').classList.add('on');setTimeout(paintCombined,0)}
function closeCombined(){$('#combView').classList.remove('on')}
function paintCombined(){
  var cc=$('#combCanvas'),host=cc.parentNode;
  var sw=Math.max(1,host.clientWidth),sh=Math.max(1,host.clientHeight);
  cc.width=sw*DPR;cc.height=sh*DPR;cc.style.width=sw+'px';cc.style.height=sh+'px';
  var g=cc.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
  g.fillStyle='#f5f7fa';g.fillRect(0,0,sw,sh);
  var L=layoutCombined();
  if(!L.fb&&!L.tb&&!L.sb){g.fillStyle='#9aa8b8';g.font='14px system-ui';g.textAlign='center';g.fillText('Нарисуйте хотя бы одну проекцию',sw/2,sh/2);return}
  var scale=Math.min((sw-150)/L.W,(sh-160)/L.H,2.5),k=1/scale;
  g.save();g.translate((sw-L.W*scale)/2,(sh-L.H*scale)/2);g.scale(scale,scale);
  g.strokeStyle='#ecf0f4';g.lineWidth=.4*k;
  for(var x=0;x<=L.W;x+=10){g.beginPath();g.moveTo(x,0);g.lineTo(x,L.H);g.stroke()}
  for(var y=0;y<=L.H;y+=10){g.beginPath();g.moveTo(0,y);g.lineTo(L.W,y);g.stroke()}
  if(L.tb)paintBlock(g,S.projections.top,L.tb,0,0,'Вид сверху',k);
  if(L.fb)paintBlock(g,S.projections.front,L.fb,0,L.fy,'Фронтальная проекция',k);
  if(L.sb)paintBlock(g,S.projections.side,L.sb,L.sx,L.fy,'Вид сбоку',k);
  g.strokeStyle='#aeb9c7';g.lineWidth=1*k;g.setLineDash([5*k,4*k]);
  if(L.tb&&L.fb){var cx=Math.min(L.fw,L.tw)/2;g.beginPath();g.moveTo(cx,L.th);g.lineTo(cx,L.fy);g.stroke()}
  if(L.fb&&L.sb){g.beginPath();g.moveTo(L.fw,L.fy+L.fh/2);g.lineTo(L.sx,L.fy+Math.min(L.fh,L.sh2)/2);g.stroke()}
  g.setLineDash([]);g.restore();
}
function paintBlock(g,list,b,ox,oy,label,k){
  g.save();g.translate(ox-b.x1,oy-b.y1);
  g.fillStyle='#7b8794';g.font='bold '+(11*k)+'px system-ui';g.textAlign='start';g.textBaseline='alphabetic';
  g.fillText(label,b.x1,b.y1-9*k);
  g.strokeStyle='#d4dae2';g.lineWidth=1*k;g.setLineDash([4*k,3*k]);
  g.strokeRect(b.x1-4*k,b.y1-4*k,b.w+8*k,b.h+8*k);g.setLineDash([]);
  for(var i=0;i<list.length;i++){var el=list[i],j;
    g.strokeStyle='#1a2030';g.lineWidth=1.6*k;g.lineCap='round';g.lineJoin='round';
    if(el.type==='line'){g.beginPath();g.moveTo(el.x1,el.y1);g.lineTo(el.x2,el.y2);g.stroke()}
    if(el.type==='rect'){g.beginPath();g.rect(el.x,el.y,el.w,el.h);g.stroke()}
    if(el.type==='circle'){g.beginPath();g.arc(el.cx,el.cy,el.r,0,Math.PI*2);g.stroke()}
    if(el.points&&el.points.length>1){g.beginPath();g.moveTo(el.points[0].x,el.points[0].y);
      for(j=1;j<el.points.length;j++)g.lineTo(el.points[j].x,el.points[j].y);
      if(el.closed||el.type==='polygon')g.closePath();g.stroke()}
    if(el.type==='dimension'){
      g.save();g.strokeStyle='#16a34a';g.fillStyle='#16a34a';g.lineWidth=1*k;var o=12*k;
      g.setLineDash([3*k,2*k]);g.beginPath();
      g.moveTo(el.x1,el.y1);g.lineTo(el.x1,el.y1-o*1.4);g.moveTo(el.x2,el.y2);g.lineTo(el.x2,el.y2-o*1.4);g.stroke();
      g.setLineDash([]);g.beginPath();g.moveTo(el.x1,el.y1-o);g.lineTo(el.x2,el.y2-o);g.stroke();
      var d=Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2));
      g.font='bold '+(9*k)+'px system-ui';g.textAlign='center';
      g.fillText(fmtVal(d),(el.x1+el.x2)/2,(el.y1+el.y2)/2-o-2*k);g.textAlign='start';g.restore()}
  }
  if(S.autoDims)paintDims(g,autoDims(list),k);
  g.restore();
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function niceScale(fit){
  var series=[10,5,2,1,0.5,0.2,0.1,0.05,0.02,0.01],i;
  for(i=0;i<series.length;i++)if(series[i]<=fit)return series[i];
  return fit;
}
function scaleLabel(s){
  if(Math.abs(s-1)<1e-9)return '1:1';
  if(s>1)return (Math.round(s*100)/100)+':1';
  return '1:'+Math.round(1/s);
}
function svgShapes(list){
  var out='',i,j,el;
  for(i=0;i<list.length;i++){
    el=list[i];
    if(el.type==='line')out+='<line x1="'+el.x1+'" y1="'+el.y1+'" x2="'+el.x2+'" y2="'+el.y2+'"/>';
    else if(el.type==='rect')out+='<rect x="'+Math.min(el.x,el.x+el.w)+'" y="'+Math.min(el.y,el.y+el.h)+'" width="'+Math.abs(el.w)+'" height="'+Math.abs(el.h)+'"/>';
    else if(el.type==='circle')out+='<circle cx="'+el.cx+'" cy="'+el.cy+'" r="'+el.r+'"/>';
    else if(el.points&&el.points.length>1){
      var pts=[];for(j=0;j<el.points.length;j++)pts.push(el.points[j].x+','+el.points[j].y);
      out+=(el.closed||el.type==='polygon')?'<polygon points="'+pts.join(' ')+'"/>':'<polyline points="'+pts.join(' ')+'"/>';
    }
  }
  return out;
}
function svgDims(dims,k,unit){
  if(!dims.length)return '';
  var out='',off=20*k,ar=5*k,fs=11*k,i;
  function tri(x,y,ang){
    return '<polygon points="'+x+','+y+' '+(x+Math.cos(ang+0.38)*ar)+','+(y+Math.sin(ang+0.38)*ar)+' '+(x+Math.cos(ang-0.38)*ar)+','+(y+Math.sin(ang-0.38)*ar)+'" fill="#0f766e" stroke="none"/>';
  }
  for(i=0;i<dims.length;i++){
    var d=dims[i],txt=esc(fmtVal(d.val,unit));
    if(d.t==='h'){
      var y=d.at+off;
      out+='<line x1="'+d.a+'" y1="'+(d.at+3*k)+'" x2="'+d.a+'" y2="'+(y+4*k)+'" stroke-dasharray="'+(3*k)+' '+(2.5*k)+'"/>';
      out+='<line x1="'+d.b+'" y1="'+(d.at+3*k)+'" x2="'+d.b+'" y2="'+(y+4*k)+'" stroke-dasharray="'+(3*k)+' '+(2.5*k)+'"/>';
      out+='<line x1="'+d.a+'" y1="'+y+'" x2="'+d.b+'" y2="'+y+'"/>';
      out+=tri(d.a,y,0)+tri(d.b,y,Math.PI);
      out+='<text x="'+((d.a+d.b)/2)+'" y="'+(y-3*k)+'" font-size="'+fs+'" text-anchor="middle" fill="#0f766e" stroke="none" font-weight="600">'+txt+'</text>';
    }else if(d.t==='v'){
      var x=d.at+off;
      out+='<line x1="'+(d.at+3*k)+'" y1="'+d.a+'" x2="'+(x+4*k)+'" y2="'+d.a+'" stroke-dasharray="'+(3*k)+' '+(2.5*k)+'"/>';
      out+='<line x1="'+(d.at+3*k)+'" y1="'+d.b+'" x2="'+(x+4*k)+'" y2="'+d.b+'" stroke-dasharray="'+(3*k)+' '+(2.5*k)+'"/>';
      out+='<line x1="'+x+'" y1="'+d.a+'" x2="'+x+'" y2="'+d.b+'"/>';
      out+=tri(x,d.a,Math.PI/2)+tri(x,d.b,-Math.PI/2);
      out+='<text x="'+(x+6*k)+'" y="'+((d.a+d.b)/2+fs*0.35)+'" font-size="'+fs+'" fill="#0f766e" stroke="none" font-weight="600">'+txt+'</text>';
    }else if(d.t==='dia'){
      var sx=d.cx+Math.cos(-0.7)*d.r*0.25, sy=d.cy+Math.sin(-0.7)*d.r*0.25;
      var ex=d.cx+Math.cos(-0.7)*(d.r+off*0.9), ey=d.cy+Math.sin(-0.7)*(d.r+off*0.9);
      out+='<line x1="'+sx+'" y1="'+sy+'" x2="'+ex+'" y2="'+ey+'"/>';
      out+='<text x="'+(ex+3*k)+'" y="'+(ey-2*k)+'" font-size="'+fs+'" fill="#0f766e" stroke="none" font-weight="600">&#8960; '+txt+'</text>';
    }else if(d.t==='len'){
      var mx=(d.x1+d.x2)/2,my=(d.y1+d.y2)/2,dx=d.x2-d.x1,dy=d.y2-d.y1,Ln=Math.sqrt(dx*dx+dy*dy)||1;
      out+='<text x="'+(mx-dy/Ln*10*k)+'" y="'+(my+dx/Ln*10*k)+'" font-size="'+fs+'" text-anchor="middle" fill="#0f766e" stroke="none" font-weight="600">'+txt+'</text>';
    }
  }
  return '<g stroke="#0f766e" stroke-width="'+(0.9*k)+'" fill="none">'+out+'</g>';
}
function buildSheetSVG(opt){
  var PW=297,PH=210,ml=20,mo=5;
  var fx=ml,fy=mo,fw=PW-ml-mo,fh=PH-mo*2;
  var stampW=145,stampH=32,stampX=fx+fw-stampW,stampY=fy+fh-stampH;
  var areaX=fx+6,areaY=fy+10,areaW=fw-12,areaH=fh-stampH-20;
  var L=layoutCombined();
  var s=niceScale(Math.min(areaW/L.W,areaH/L.H));
  var k=1/s;
  var ox=areaX+(areaW-L.W*s)/2,oy=areaY+(areaH-L.H*s)/2;
  var unit=opt.unit,dims=opt.dims;
  function block(list,b,bx,by,label){
    if(!list||!list.length)return '';
    var g='<g transform="translate('+(ox+bx*s)+','+(oy+by*s)+') scale('+s+') translate('+(-b.x1)+','+(-b.y1)+')">';
    g+='<g fill="none" stroke="#111827" stroke-width="'+(0.5*k)+'" stroke-linejoin="round" stroke-linecap="round">'+svgShapes(list)+'</g>';
    g+='<text x="'+b.x1+'" y="'+(b.y1-9*k)+'" font-size="'+(11*k)+'" fill="#6b7280" font-weight="600">'+esc(label)+'</text>';
    if(dims)g+=svgDims(autoDims(list),k,unit);
    g+='</g>';
    return g;
  }
  var body=block(S.projections.top,L.tb,0,0,'Вид сверху')
          +block(S.projections.front,L.fb,0,L.fy,'Фронтальная проекция')
          +block(S.projections.side,L.sb,L.sx,L.fy,'Вид сбоку');
  var links='';
  if(opt.links){
    var lg='<g stroke="#9aa5b1" stroke-width="0.25" stroke-dasharray="2 1.6" fill="none">';
    if(L.tb&&L.fb){var cx=ox+(Math.min(L.fw,L.tw)/2)*s;lg+='<line x1="'+cx+'" y1="'+(oy+L.th*s)+'" x2="'+cx+'" y2="'+(oy+L.fy*s)+'"/>'}
    if(L.fb&&L.sb){var cy=oy+(L.fy+L.fh/2)*s;lg+='<line x1="'+(ox+L.fw*s)+'" y1="'+cy+'" x2="'+(ox+L.sx*s)+'" y2="'+cy+'"/>'}
    links=lg+'</g>';
  }
  var now=new Date();
  var date=('0'+now.getDate()).slice(-2)+'.'+('0'+(now.getMonth()+1)).slice(-2)+'.'+now.getFullYear();
  var unitName=unit==='cm'?'сантиметры':'миллиметры';
  var stamp='<g stroke="#111827" fill="none" stroke-width="0.5">'
   +'<rect x="'+stampX+'" y="'+stampY+'" width="'+stampW+'" height="'+stampH+'"/>'
   +'<line x1="'+stampX+'" y1="'+(stampY+11)+'" x2="'+(stampX+stampW)+'" y2="'+(stampY+11)+'"/>'
   +'<line x1="'+stampX+'" y1="'+(stampY+21.5)+'" x2="'+(stampX+stampW)+'" y2="'+(stampY+21.5)+'"/>'
   +'<line x1="'+(stampX+95)+'" y1="'+(stampY+11)+'" x2="'+(stampX+95)+'" y2="'+(stampY+stampH)+'"/>'
   +'</g>'
   +'<text x="'+(stampX+4)+'" y="'+(stampY+7.6)+'" font-size="5.2" font-weight="700" fill="#111827">'+esc(opt.title||'Чертёж')+'</text>'
   +'<text x="'+(stampX+4)+'" y="'+(stampY+18)+'" font-size="3.6" fill="#4b5563">Выполнил: '+esc(opt.author||'—')+'</text>'
   +'<text x="'+(stampX+4)+'" y="'+(stampY+28)+'" font-size="3.6" fill="#4b5563">Единицы: '+unitName+'</text>'
   +'<text x="'+(stampX+99)+'" y="'+(stampY+18)+'" font-size="3.6" fill="#4b5563">Масштаб: '+scaleLabel(s)+'</text>'
   +'<text x="'+(stampX+99)+'" y="'+(stampY+28)+'" font-size="3.6" fill="#4b5563">Дата: '+date+'</text>';
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+PW+'mm" height="'+PH+'mm" viewBox="0 0 '+PW+' '+PH+'">'
   +'<rect width="'+PW+'" height="'+PH+'" fill="#ffffff"/>'
   +'<rect x="'+fx+'" y="'+fy+'" width="'+fw+'" height="'+fh+'" fill="none" stroke="#111827" stroke-width="0.7"/>'
   +'<text x="'+(fx+6)+'" y="'+(fy+6.5)+'" font-size="4.2" font-weight="700" fill="#1f2937">'+esc(opt.title||'Общий чертёж')+'</text>'
   +'<text x="'+(fx+fw-6)+'" y="'+(fy+6.5)+'" font-size="3.6" fill="#6b7280" text-anchor="end">DrawForge · М '+scaleLabel(s)+'</text>'
   +links+body+stamp+'</svg>';
  return {svg:svg,scale:s};
}
function openSheetExport(){
  var L=layoutCombined();
  if(!L.fb&&!L.tb&&!L.sb){toast('Сначала нарисуйте хотя бы одну проекцию');return}
  $('#shUnit').value=S.unit;$('#shDims').checked=true;
  $('#mSheetExp').classList.add('on');
}
function closeSheetExport(){$('#mSheetExp').classList.remove('on')}
function downloadSheet(){
  var fmt=$('#shFmt').value;
  var opt={title:$('#shTitle').value||'Чертёж детали',author:$('#shAuthor').value||'',unit:$('#shUnit').value,dims:$('#shDims').checked,links:$('#shLinks').checked};
  var res=buildSheetSVG(opt);
  closeSheetExport();
  if(fmt==='svg'){download(res.svg,'obshiy-chertezh.svg','image/svg+xml');toast('SVG сохранён, масштаб '+scaleLabel(res.scale));return}
  if(fmt==='png'){svgToPng(res.svg,'obshiy-chertezh.png');return}
  printSVG(res.svg);
}
function svgToPng(svg,name){
  var img=new Image();
  var blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  img.onload=function(){
    var c=document.createElement('canvas');
    c.width=2480;c.height=1754;
    var g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
    g.drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(url);
    var a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=name;a.click();
    toast('PNG сохранён');
  };
  img.onerror=function(){URL.revokeObjectURL(url);toast('Не получилось сделать PNG, попробуйте SVG')};
  img.src=url;
}
function printSVG(svg){
  var w=window.open('','_blank');
  if(!w){toast('Браузер заблокировал окно печати. Разрешите всплывающие окна или скачайте SVG');return}
  w.document.write('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Общий чертёж</title>'
   +'<style>@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:100%;height:auto}</style>'
   +'</head><body>'+svg+'</body></html>');
  w.document.close();w.focus();
  setTimeout(function(){w.print()},350);
  toast('Открыл окно печати: выберите «Сохранить как PDF»');
}

function closedShapes(list){
  var out=[],lines=[],i;
  for(i=0;i<list.length;i++){var el=list[i];
    if(el.type==='rect')out.push({kind:'rect',el:el});
    else if(el.type==='circle')out.push({kind:'circle',el:el});
    else if(el.type==='polygon'||(el.type==='polyline'&&el.closed))out.push({kind:'poly',el:el});
    else if(el.type==='line')lines.push(el)}
  if(lines.length>=3){var lp=lineLoops(lines);for(i=0;i<lp.length;i++)out.push({kind:'loop',pts:lp[i]})}
  return out;
}
function lineLoops(lines){
  var tol=4,pts=[],edges=[],adj={},res=[],seen={},i;
  function idx(x,y){for(var k=0;k<pts.length;k++)if(Math.sqrt(Math.pow(pts[k].x-x,2)+Math.pow(pts[k].y-y,2))<tol)return k;pts.push({x:x,y:y});return pts.length-1}
  for(i=0;i<lines.length;i++){var a=idx(lines[i].x1,lines[i].y1),b=idx(lines[i].x2,lines[i].y2);if(a!==b)edges.push([a,b])}
  for(i=0;i<edges.length;i++){var e=edges[i];
    if(!adj[e[0]])adj[e[0]]=[];if(!adj[e[1]])adj[e[1]]=[];
    adj[e[0]].push(e[1]);adj[e[1]].push(e[0])}
  function walk(start,cur,path,vis){
    if(path.length>2&&cur===start){
      var key=path.slice().sort(function(a,b){return a-b}).join(',');
      if(!seen[key]){seen[key]=1;res.push(path.map(function(k){return{x:pts[k].x,y:pts[k].y}}))}
      return}
    if(path.length>10)return;
    var nb=adj[cur]||[];
    for(var n=0;n<nb.length;n++){var next=nb[n];
      if(next===start&&path.length>2){walk(start,start,path,vis);continue}
      if(vis[next])continue;
      vis[next]=1;path.push(next);walk(start,next,path,vis);path.pop();vis[next]=0}
  }
  for(i=0;i<pts.length;i++)if((adj[i]||[]).length>=2){var v={};v[i]=1;walk(i,i,[i],v)}
  if(res.length>1){res.sort(function(a,b){return polyArea(b)-polyArea(a)});return[res[0]]}
  return res;
}
function polyArea(p){return Math.abs(signedArea(p))}
function signedArea(p){var a=0;for(var i=0;i<p.length;i++){var j=(i+1)%p.length;a+=p[i].x*p[j].y-p[j].x*p[i].y}return a/2}
function orientCCW(p){return signedArea(p)<0?p.slice().reverse():p}
function orientCW(p){return signedArea(p)>0?p.slice().reverse():p}
function shapeBox(s){
  if(s.kind==='rect')return{x1:Math.min(s.el.x,s.el.x+s.el.w),y1:Math.min(s.el.y,s.el.y+s.el.h),x2:Math.max(s.el.x,s.el.x+s.el.w),y2:Math.max(s.el.y,s.el.y+s.el.h)};
  if(s.kind==='circle')return{x1:s.el.cx-s.el.r,y1:s.el.cy-s.el.r,x2:s.el.cx+s.el.r,y2:s.el.cy+s.el.r};
  var p=s.kind==='loop'?s.pts:s.el.points,xs=[],ys=[];
  for(var i=0;i<p.length;i++){xs.push(p[i].x);ys.push(p[i].y)}
  return{x1:Math.min.apply(null,xs),y1:Math.min.apply(null,ys),x2:Math.max.apply(null,xs),y2:Math.max.apply(null,ys)};
}
function isInside(circle,outer){var b=shapeBox(outer);return circle.el.cx>b.x1&&circle.el.cx<b.x2&&circle.el.cy>b.y1&&circle.el.cy<b.y2}
function contourOf(s){
  var i,out=[];
  if(s.kind==='rect'){var d=s.el;return[{x:d.x,y:-d.y},{x:d.x+d.w,y:-d.y},{x:d.x+d.w,y:-(d.y+d.h)},{x:d.x,y:-(d.y+d.h)}]}
  if(s.kind==='circle'){var c=s.el,n=64;for(i=0;i<n;i++){var a=i/n*Math.PI*2;out.push({x:c.cx+Math.cos(a)*c.r,y:-(c.cy+Math.sin(a)*c.r)})}return out}
  var p=s.kind==='loop'?s.pts:(s.el.points||[]);
  if(p.length<3)return null;
  for(i=0;i<p.length;i++)out.push({x:p[i].x,y:-p[i].y});
  return out;
}
function buildSolids(){
  var src=S.mode==='proj'?S.projections.front:S.sheet;
  var shapes=closedShapes(src),outers=[],circles=[],used={},solids=[],i,k;
  for(i=0;i<shapes.length;i++){if(shapes[i].kind==='circle')circles.push(shapes[i]);else outers.push(shapes[i])}
  for(i=0;i<outers.length;i++){
    var c=contourOf(outers[i]);if(!c)continue;
    var holes=[];
    for(k=0;k<circles.length;k++)if(isInside(circles[k],outers[i])){holes.push(orientCW(contourOf(circles[k])));used[k]=1}
    solids.push({outer:orientCCW(c),holes:holes})}
  for(k=0;k<circles.length;k++){if(used[k])continue;var cc=contourOf(circles[k]);if(cc)solids.push({outer:orientCCW(cc),holes:[]})}
  return solids;
}

var VIEWS={
  iso:{az:0.7854,el:0.6155,name:'Изометрия'},
  front:{az:0,el:0,name:'Спереди'},
  top:{az:0,el:1.5708,name:'Сверху'},
  side:{az:-1.5708,el:0,name:'Сбоку (справа)'}
};
var V={faces:[],az:VIEWS.iso.az,el:VIEWS.iso.el,scale:1,cx:0,cy:0,drag:false,px:0,py:0,wire:false,zoom:1,size:{x:0,y:0,z:0},bodies:0,holes:0};
var v3=$('#v3canvas'),v3ctx=v3.getContext('2d'),VW=1,VH=1;
function makeFaces(solids,depth){
  var faces=[],i;
  function wall(ring){
    for(var k=0;k<ring.length;k++){
      var a=ring[k],b=ring[(k+1)%ring.length];
      var dx=b.x-a.x,dy=b.y-a.y,L=Math.sqrt(dx*dx+dy*dy)||1;
      faces.push({rings:[[[a.x,a.y,0],[b.x,b.y,0],[b.x,b.y,depth],[a.x,a.y,depth]]],n:[dy/L,-dx/L,0]});
    }
  }
  for(i=0;i<solids.length;i++){
    var s=solids[i],back=[],front=[],k;
    back.push(s.outer.map(function(p){return[p.x,p.y,0]}));
    front.push(s.outer.map(function(p){return[p.x,p.y,depth]}));
    for(k=0;k<s.holes.length;k++){
      back.push(s.holes[k].map(function(p){return[p.x,p.y,0]}));
      front.push(s.holes[k].map(function(p){return[p.x,p.y,depth]}));
    }
    faces.push({rings:back,n:[0,0,-1]});
    faces.push({rings:front,n:[0,0,1]});
    wall(s.outer);
    for(k=0;k<s.holes.length;k++)wall(s.holes[k]);
  }
  return faces;
}
function rotate(p){
  var ca=Math.cos(V.az),sa=Math.sin(V.az),ce=Math.cos(V.el),se=Math.sin(V.el);
  var x1=p[0]*ca+p[2]*sa;
  var z1=-p[0]*sa+p[2]*ca;
  var y2=p[1]*ce-z1*se;
  var z2=p[1]*se+z1*ce;
  return[x1,y2,z2];
}
function project(p){var q=rotate(p);return[V.cx+q[0]*V.scale,V.cy-q[1]*V.scale]}
function fit3D(){
  var host=v3.parentNode;
  VW=Math.max(1,host.clientWidth);VH=Math.max(1,host.clientHeight);
  v3.width=VW*DPR;v3.height=VH*DPR;v3.style.width=VW+'px';v3.style.height=VH+'px';
  v3ctx.setTransform(DPR,0,0,DPR,0,0);
  recenter();draw3D();
}
function recenter(){
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;
  for(var i=0;i<V.faces.length;i++){var rings=V.faces[i].rings;
    for(var r=0;r<rings.length;r++)for(var k=0;k<rings[r].length;k++){
      var q=rotate(rings[r][k]);
      if(q[0]<minx)minx=q[0];if(q[0]>maxx)maxx=q[0];
      if(q[1]<miny)miny=q[1];if(q[1]>maxy)maxy=q[1]}}
  if(minx>maxx)return;
  var w=Math.max(1,maxx-minx),h=Math.max(1,maxy-miny);
  V.scale=Math.min((VW-170)/w,(VH-180)/h)*V.zoom;
  V.cx=VW/2-((minx+maxx)/2)*V.scale;
  V.cy=VH/2+((miny+maxy)/2)*V.scale;
}
function draw3D(){
  var g=v3ctx;g.clearRect(0,0,VW,VH);
  var bg=g.createLinearGradient(0,0,0,VH);bg.addColorStop(0,'#141b28');bg.addColorStop(1,'#0d1118');
  g.fillStyle=bg;g.fillRect(0,0,VW,VH);
  var step=Math.max(10,Math.round(Math.max(V.size.x,V.size.z)/4/10)*10),half=step*6,floor=-V.size.y/2-1,i,a,b;
  g.strokeStyle='rgba(125,160,205,.12)';g.lineWidth=1;
  for(i=-6;i<=6;i++){
    a=project([i*step,floor,-half]);b=project([i*step,floor,half]);
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
    a=project([-half,floor,i*step]);b=project([half,floor,i*step]);
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
  }
  var L=[-0.3,0.62,0.72],Ln=Math.sqrt(L[0]*L[0]+L[1]*L[1]+L[2]*L[2]);
  L[0]/=Ln;L[1]/=Ln;L[2]/=Ln;
  var list=[];
  for(i=0;i<V.faces.length;i++){
    var f=V.faces[i],n=rotate(f.n);
    if(!V.wire&&n[2]<=0.0001)continue;
    var sum=0,cnt=0;
    var rings=f.rings.map(function(r){return r.map(function(p){var q=rotate(p);sum+=q[2];cnt++;return q})});
    var lit=n[0]*L[0]+n[1]*L[1]+n[2]*L[2];
    list.push({rings:rings,d:sum/Math.max(1,cnt),shade:Math.max(0.12,lit)});
  }
  list.sort(function(x,y){return x.d-y.d});
  for(i=0;i<list.length;i++){
    var fc=list[i];
    g.beginPath();
    for(var r=0;r<fc.rings.length;r++){
      var ring=fc.rings[r];
      for(var k=0;k<ring.length;k++){
        var sx=V.cx+ring[k][0]*V.scale, sy=V.cy-ring[k][1]*V.scale;
        if(k===0)g.moveTo(sx,sy);else g.lineTo(sx,sy)}
      g.closePath()}
    if(V.wire){g.strokeStyle='rgba(155,208,255,.8)';g.lineWidth=1;g.stroke()}
    else{
      var t=Math.min(1,0.28+fc.shade*0.85);
      g.fillStyle='rgb('+Math.round(34+t*114)+','+Math.round(92+t*114)+','+Math.round(146+t*100)+')';
      g.fill('evenodd');
      g.strokeStyle='rgba(9,18,32,.55)';g.lineWidth=1;g.stroke()}
  }
}
function open3D(){
  var info=$('#buildInfo');
  if(S.mode==='proj'){
    var fs=closedShapes(S.projections.front);
    if(!fs.length){toast('Нарисуйте замкнутую фигуру во фронтальной проекции: она задаёт форму детали.');return}
    var tb=boundsOf(S.projections.top),sb=boundsOf(S.projections.side),src='значения ниже';
    if(tb){src='вида сверху ('+fmtVal(tb.h)+')';$('#depthVal').value=Math.max(1,Math.round(tb.h))}
    else if(sb){src='вида сбоку ('+fmtVal(sb.w)+')';$('#depthVal').value=Math.max(1,Math.round(sb.w))}
    info.innerHTML='<b>Режим «По проекциям»</b><br>Форму берём из фронтальной проекции: фигур '+fs.length+'.<br>Глубину из '+src+'.';
  }else{
    var ss=closedShapes(S.sheet);
    if(!ss.length){toast('Нет замкнутых фигур. Нарисуйте прямоугольник, контур или замкните линии.');return}
    info.innerHTML='<b>Режим «Один лист»</b><br>Найдено замкнутых фигур: '+ss.length+'.';
  }
  $('#m3d').classList.add('on');
}
function close3DModal(){$('#m3d').classList.remove('on')}
function buildModel(){
  close3DModal();closeCombined();
  var depth=Math.max(1,parseFloat($('#depthVal').value)||40);
  var solids=buildSolids();
  if(!solids.length){toast('Не нашёл замкнутый контур для объёма');return}
  V.faces=makeFaces(solids,depth);V.zoom=1;V.wire=false;
  $('#btnWire').classList.remove('on');
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9,i,k;
  for(i=0;i<solids.length;i++)for(k=0;k<solids[i].outer.length;k++){
    var p=solids[i].outer[k];
    if(p.x<minx)minx=p.x;if(p.x>maxx)maxx=p.x;
    if(p.y<miny)miny=p.y;if(p.y>maxy)maxy=p.y}
  V.size={x:maxx-minx,y:maxy-miny,z:depth};
  V.bodies=solids.length;V.holes=0;
  for(i=0;i<solids.length;i++)V.holes+=solids[i].holes.length;
  var ox=(minx+maxx)/2,oy=(miny+maxy)/2,oz=depth/2;
  for(i=0;i<V.faces.length;i++){var rings=V.faces[i].rings;
    for(var r=0;r<rings.length;r++)for(k=0;k<rings[r].length;k++){
      rings[r][k][0]-=ox;rings[r][k][1]-=oy;rings[r][k][2]-=oz}}
  S.is3D=true;
  $('#viewer').classList.add('on');
  updateInfo3D();
  setView('iso');
  requestAnimationFrame(function(){fit3D();toast('3D-модель построена')});
}
function updateInfo3D(){
  $('#v3info').innerHTML='<b>Габариты модели</b><br>Ширина '+fmtVal(V.size.x)+' · Высота '+fmtVal(V.size.y)+' · Глубина '+fmtVal(V.size.z)
   +'<br>Тел: '+V.bodies+' · отверстий: '+V.holes
   +'<br>Тяните мышью — поворот, колёсико — приближение';
}
function closeViewer(){S.is3D=false;$('#viewer').classList.remove('on');resizeAll()}
function markView(key){
  var b=$$('.v3views .btn');
  for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-view')===key);
  $('#v3name').textContent=key&&VIEWS[key]?VIEWS[key].name:'Свободный поворот';
}
function setView(key){
  var v=VIEWS[key];if(!v)return;
  V.az=v.az;V.el=v.el;V.zoom=1;
  markView(key);recenter();draw3D();
}
function resetView(){setView('iso')}
function toggleWire(){V.wire=!V.wire;$('#btnWire').classList.toggle('on',V.wire);draw3D()}
v3.addEventListener('mousedown',function(e){V.drag=true;V.px=e.clientX;V.py=e.clientY;v3.classList.add('grabbing')});
window.addEventListener('mouseup',function(){V.drag=false;v3.classList.remove('grabbing')});
window.addEventListener('mousemove',function(e){
  if(!V.drag||!S.is3D)return;
  V.az-=(e.clientX-V.px)*0.008;
  V.el=Math.max(-1.5,Math.min(1.5,V.el-(e.clientY-V.py)*0.008));
  V.px=e.clientX;V.py=e.clientY;
  markView(null);recenter();draw3D();
});
v3.addEventListener('wheel',function(e){
  e.preventDefault();
  V.zoom=Math.max(0.3,Math.min(6,V.zoom*(e.deltaY<0?1.12:0.9)));
  recenter();draw3D();
},{passive:false});

function openExport(){$('#mExp').classList.add('on')}
function closeExport(){$('#mExp').classList.remove('on')}
function doExport(){
  var f=$('#expFmt').value;closeExport();var all=everything();
  if(f==='json')download(JSON.stringify({sheet:S.sheet,projections:S.projections},null,2),'drawforge.json','application/json');
  if(f==='svg')download(makeSVG(all),'drawforge.svg','image/svg+xml');
  if(f==='dxf')download(makeDXF(all),'drawforge.dxf','application/dxf');
  if(f==='png')exportPNG(all);
  if(f==='stl')download(makeSTL(),'drawforge.stl','application/octet-stream');
  toast('Файл скачан');
}
function download(content,name,type){
  var b=new Blob([content],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(u)},600);
}
function makeSVG(list){
  var b=boundsOf(list)||{x1:-100,y1:-100,w:200,h:200};
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(b.x1-20)+' '+(b.y1-20)+' '+(b.w+40)+' '+(b.h+40)+'">'
   +'<g fill="none" stroke="#111827" stroke-width="1.4">'+svgShapes(list)+'</g></svg>';
}
function makeDXF(list){
  var d='0\nSECTION\n2\nENTITIES\n';
  for(var i=0;i<list.length;i++){var el=list[i];
    if(el.type==='line')d+='0\nLINE\n8\n0\n10\n'+el.x1+'\n20\n'+el.y1+'\n11\n'+el.x2+'\n21\n'+el.y2+'\n';
    if(el.type==='circle')d+='0\nCIRCLE\n8\n0\n10\n'+el.cx+'\n20\n'+el.cy+'\n40\n'+el.r+'\n';
    if(el.type==='rect')d+='0\nLWPOLYLINE\n8\n0\n90\n4\n70\n1\n10\n'+el.x+'\n20\n'+el.y+'\n10\n'+(el.x+el.w)+'\n20\n'+el.y+'\n10\n'+(el.x+el.w)+'\n20\n'+(el.y+el.h)+'\n10\n'+el.x+'\n20\n'+(el.y+el.h)+'\n'}
  return d+'0\nENDSEC\n0\nEOF';
}
function facet(a,b,c){return'facet normal 0 0 0\n outer loop\n  vertex '+a[0]+' '+a[1]+' '+a[2]+'\n  vertex '+b[0]+' '+b[1]+' '+b[2]+'\n  vertex '+c[0]+' '+c[1]+' '+c[2]+'\n endloop\nendfacet\n'}
function makeSTL(){
  var depth=Math.max(1,parseFloat($('#depthVal').value)||40),solids=buildSolids(),s='solid drawforge\n',i,k;
  for(i=0;i<solids.length;i++){var o=solids[i].outer;
    for(k=1;k<o.length-1;k++){
      s+=facet([o[0].x,o[0].y,0],[o[k].x,o[k].y,0],[o[k+1].x,o[k+1].y,0]);
      s+=facet([o[0].x,o[0].y,depth],[o[k+1].x,o[k+1].y,depth],[o[k].x,o[k].y,depth])}
    for(k=0;k<o.length;k++){var a=o[k],b=o[(k+1)%o.length];
      s+=facet([a.x,a.y,0],[b.x,b.y,0],[b.x,b.y,depth]);
      s+=facet([a.x,a.y,0],[b.x,b.y,depth],[a.x,a.y,depth])}}
  return s+'endsolid drawforge';
}
function exportPNG(list){
  var t=document.createElement('canvas');t.width=1600;t.height=1200;
  var g=t.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1600,1200);
  var b=boundsOf(list)||{x1:-100,y1:-100,x2:100,y2:100};
  var sc=Math.min(1400/Math.max(1,b.x2-b.x1),1000/Math.max(1,b.y2-b.y1));
  g.translate(800,600);g.scale(sc,sc);g.translate(-(b.x1+b.x2)/2,-(b.y1+b.y2)/2);
  g.strokeStyle='#000';g.lineWidth=1.5/sc;g.lineCap='round';
  for(var i=0;i<list.length;i++){var el=list[i],j;
    if(el.type==='line'){g.beginPath();g.moveTo(el.x1,el.y1);g.lineTo(el.x2,el.y2);g.stroke()}
    if(el.type==='rect'){g.beginPath();g.rect(el.x,el.y,el.w,el.h);g.stroke()}
    if(el.type==='circle'){g.beginPath();g.arc(el.cx,el.cy,el.r,0,Math.PI*2);g.stroke()}
    if(el.points&&el.points.length>1){g.beginPath();g.moveTo(el.points[0].x,el.points[0].y);
      for(j=1;j<el.points.length;j++)g.lineTo(el.points[j].x,el.points[j].y);
      if(el.closed||el.type==='polygon')g.closePath();g.stroke()}}
  var link=document.createElement('a');link.href=t.toDataURL('image/png');link.download='drawforge.png';link.click();
}

var TOUR={active:false,i:0,steps:[]};
var TOUR_STEPS=[
  {sel:null,title:'Знакомимся с программой',
   text:'За минуту покажу, где что находится. Можно листать кнопками «Далее» и «Назад», а выйти в любой момент кнопкой «Пропустить обучение».',
   tip:'Стрелки на клавиатуре тоже листают шаги.'},
  {sel:'#modeGroup',title:'Два способа работы',
   text:'«Один лист» это чистый лист, где вы рисуете что угодно. «По проекциям» это работа по правилам черчения: отдельно вид спереди, сверху и сбоку.',
   mode:'proj'},
  {sel:'#toolsBar',title:'Инструменты',
   text:'Линия, прямоугольник, окружность, ломаная и контур. Ниже инструмент «Размер», чтобы подписать расстояние, и «Удалить», чтобы стереть лишнее.',
   tip:'Быстрые клавиши: L линия, R прямоугольник, C окружность, V выбор.'},
  {sel:'#stage',title:'Ваш лист',
   text:'Здесь вы чертите. Точки прилипают к сетке, поэтому линии получаются ровными. Колёсико мыши приближает, зажатое колёсико двигает лист.',
   tool:'rect',
   tip:'Пока тянете фигуру, рядом с курсором видно её размер.'},
  {sel:'#ptabs',title:'Три проекции',
   text:'Каждая вкладка это отдельный вид одной детали. Начните с фронтальной, потом нарисуйте вид сверху и вид сбоку. Зелёная точка на вкладке значит, что там уже есть чертёж.',
   mode:'proj'},
  {sel:'#rpanel',title:'Точные размеры',
   text:'Выберите фигуру, и справа появятся её числа. Впишите ширину 100 и высоту 50, и фигура сразу станет именно такой. Мышкой на глаз рисовать не обязательно.'},
  {sel:'#btnDims',title:'Разметка размеров',
   text:'Одна кнопка проставляет размеры на всём чертеже: ширину, высоту и диаметры отверстий со стрелками. Кнопка рядом переключает миллиметры и сантиметры.'},
  {sel:'#btnComb',title:'Показать вместе',
   text:'Собирает все проекции на одном листе по правилам: вид сверху над фронтальной, вид сбоку справа. Оттуда же можно скачать красивый чертёж на листе А4 в PDF, SVG или PNG.',
   mode:'proj'},
  {sel:'#btn3d',title:'Создать 3D',
   text:'Программа берёт замкнутый контур фронтальной проекции, добавляет глубину из вида сверху и строит объёмную деталь. Модель можно вращать мышкой и смотреть спереди, сверху и сбоку.',
   tip:'Круг внутри прямоугольника превратится в отверстие.'},
  {sel:'#btnExport',title:'Сохранить работу',
   text:'Экспорт отдаёт чертёж в SVG, DXF, PNG или JSON, а модель в STL для 3D-печати. Ctrl+S сохраняет проект в браузере, Ctrl+Z отменяет действие.'},
  {sel:'#btnHelp',title:'Готово',
   text:'Обучение всегда можно запустить снова этой кнопкой со знаком вопроса. Дальше пробуйте сами: нарисуйте прямоугольник и нажмите «Создать 3D».',
   tip:'Порядок работы: начертить, задать размеры, показать вместе, создать 3D.'}
];
function tourAvailable(step){
  if(!step.sel)return true;
  var el=document.querySelector(step.sel);
  if(!el)return false;
  var r=el.getBoundingClientRect();
  return r.width>0&&r.height>0;
}
function startTour(){
  closeCombined();
  if(S.is3D)closeViewer();
  $('#mExp').classList.remove('on');$('#m3d').classList.remove('on');$('#mSheetExp').classList.remove('on');
  $('#welcome').classList.add('off');
  TOUR.active=true;TOUR.i=0;TOUR.steps=TOUR_STEPS;
  $('#tourDim').classList.add('on');
  $('#tourCard').classList.add('on');
  $('#tourSkip').classList.add('on');
  renderDots();
  showStep(0);
}
function endTour(done){
  TOUR.active=false;
  $('#tourDim').classList.remove('on');
  $('#tourHole').classList.remove('on');
  $('#tourCard').classList.remove('on');
  $('#tourSkip').classList.remove('on');
  localStorage.setItem('df12_tour','1');
  toast(done?'Обучение пройдено. Удачи с чертежом':'Обучение закрыто. Кнопка со знаком вопроса вернёт его');
}
function renderDots(){
  var box=$('#tourDots'),h='';
  for(var i=0;i<TOUR.steps.length;i++)h+='<i'+(i===TOUR.i?' class="on"':'')+'></i>';
  box.innerHTML=h;
}
function showStep(i){
  TOUR.i=Math.max(0,Math.min(TOUR.steps.length-1,i));
  var st=TOUR.steps[TOUR.i];
  if(st.mode&&S.mode!==st.mode)setMode(st.mode);
  if(st.tool)setTool(st.tool);
  $('#tourStep').textContent='Шаг '+(TOUR.i+1)+' из '+TOUR.steps.length;
  $('#tourTitle').textContent=st.title;
  $('#tourText').textContent=st.text;
  var tip=$('#tourTip');
  if(st.tip){tip.textContent=st.tip;tip.style.display=''}else tip.style.display='none';
  $('#tourPrev').style.display=TOUR.i===0?'none':'';
  $('#tourNext').textContent=TOUR.i===TOUR.steps.length-1?'Начать работу':'Далее';
  renderDots();
  requestAnimationFrame(placeTour);
}
function placeTour(){
  if(!TOUR.active)return;
  var st=TOUR.steps[TOUR.i],hole=$('#tourHole'),card=$('#tourCard');
  var vw=window.innerWidth,vh=window.innerHeight;
  var cw=card.offsetWidth||330,chh=card.offsetHeight||190,m=14;
  var target=st.sel?document.querySelector(st.sel):null;
  if(target&&!tourAvailable(st))target=null;
  if(!target){
    hole.classList.remove('on');
    card.style.left=Math.round((vw-cw)/2)+'px';
    card.style.top=Math.round((vh-chh)/2)+'px';
    return;
  }
  var r=target.getBoundingClientRect(),pad=8;
  var hx=Math.max(4,r.left-pad),hy=Math.max(4,r.top-pad);
  var hw=Math.min(vw-hx-4,r.width+pad*2),hh=Math.min(vh-hy-4,r.height+pad*2);
  hole.style.left=hx+'px';hole.style.top=hy+'px';
  hole.style.width=hw+'px';hole.style.height=hh+'px';
  hole.classList.add('on');
  var left,top;
  var spaceBelow=vh-(hy+hh),spaceRight=vw-(hx+hw),spaceLeft=hx;
  if(spaceBelow>chh+m*2){
    top=hy+hh+m;left=hx+hw/2-cw/2;
  }else if(spaceRight>cw+m*2){
    left=hx+hw+m;top=hy+hh/2-chh/2;
  }else if(spaceLeft>cw+m*2){
    left=hx-cw-m;top=hy+hh/2-chh/2;
  }else{
    left=hx+hw/2-cw/2;top=Math.max(m,hy-chh-m);
  }
  left=Math.max(m,Math.min(vw-cw-m,left));
  top=Math.max(m,Math.min(vh-chh-m,top));
  card.style.left=Math.round(left)+'px';
  card.style.top=Math.round(top)+'px';
}
function tourNext(){
  if(TOUR.i>=TOUR.steps.length-1){endTour(true);return}
  showStep(TOUR.i+1);
}
function tourPrev(){showStep(TOUR.i-1)}

document.addEventListener('keydown',function(e){
  if(TOUR.active){
    if(e.key==='Escape'){endTour(false);return}
    if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();tourNext();return}
    if(e.key==='ArrowLeft'){e.preventDefault();tourPrev();return}
    return;
  }
  var tag=document.activeElement?document.activeElement.tagName:'';
  if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
  if(S.is3D){
    if(e.key==='Escape')closeViewer();
    if(e.key==='1')setView('front');
    if(e.key==='2')setView('top');
    if(e.key==='3')setView('side');
    if(e.key==='0')setView('iso');
    return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveLocal();toast('Сохранено');return}
  if(e.key==='Delete'||e.key==='Backspace'){removeSelected();return}
  if(e.key==='Escape'){
    if($('#combView').classList.contains('on')){closeCombined();return}
    S.drawing=null;S.selected=[];refreshInspector();paint();return}
  var map={v:'select',l:'line',r:'rect',c:'circle',p:'polyline',g:'polygon',d:'dimension'};
  if(map[e.key])setTool(map[e.key]);
});
function saveLocal(){localStorage.setItem('df12',JSON.stringify({s:S.sheet,p:S.projections,mode:S.mode,vp:S.viewport,nid:S.nextId,unit:S.unit,dims:S.autoDims}))}
function loadLocal(){
  var raw=localStorage.getItem('df12');if(!raw)return;
  try{var d=JSON.parse(raw);
    S.sheet=d.s||[];S.projections=d.p||S.projections;S.mode=d.mode||'sheet';
    S.viewport=d.vp||S.viewport;S.nextId=d.nid||1;S.unit=d.unit||'mm';S.autoDims=!!d.dims}catch(err){}
}

loadLocal();pushHistory();
$('#mSheet').classList.toggle('on',S.mode==='sheet');
$('#mProj').classList.toggle('on',S.mode==='proj');
$('#ptabs').classList.toggle('on',S.mode==='proj');
$('#btnComb').style.display=S.mode==='proj'?'':'none';
$('#btnDims').classList.toggle('on',S.autoDims);
$('#btnCombDims').classList.toggle('on',S.autoDims);
$('#btnUnit').textContent=S.unit==='mm'?'мм':'см';
$('#sUnit').textContent=S.unit==='mm'?'мм':'см';
markView('iso');
refreshInspector();
resizeAll();
if(S.sheet.length||S.projections.front.length||S.projections.top.length||S.projections.side.length)$('#welcome').classList.add('off');
