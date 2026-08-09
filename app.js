"use strict";
var $=function(s){return document.querySelector(s)};
var $$=function(s){return document.querySelectorAll(s)};
var S={mode:'sheet',tool:'select',proj:'front',sheet:[],projections:{front:[],top:[],side:[]},
  selected:[],viewport:{x:0,y:0,z:1},drawing:null,panning:false,snap:true,ortho:false,shift:false,
  grid:10,history:[],hi:-1,nextId:1,is3D:false,inited:false,autoDims:false,unit:'mm',clip:null};
var TIPS={select:'Кликните на фигуру, чтобы выбрать её. Стрелками двигайте, Ctrl+D дублирует.',
 pan:'Зажмите и тяните, чтобы двигать лист.',
 line:'Кликните начало, затем конец. Введите длину с клавиатуры для точной линии.',
 rect:'Нажмите и тяните. Или введите с клавиатуры: 100 50.',
 circle:'Кликните центр, затем радиус. Можно ввести с клавиатуры: 25 или d50.',
 hole:'Отверстие: кликните центр и задайте радиус. В 3D оно вырежет материал.',
 polyline:'Кликайте точки, двойной клик завершает.',
 polygon:'Кликайте вершины, двойной клик замыкает контур.',
 dimension:'Кликните две точки, размер посчитается сам.',
 erase:'Кликните на объект, чтобы удалить его.'};
var DPR=Math.min(window.devicePixelRatio||1,2);
var cnv=$('#c2d'),ctx=cnv.getContext('2d'),CW=0,CH=0;
var DASH={solid:null,dashed:[6,3.5],center:[13,3,3,3]};

function curList(){return S.mode==='sheet'?S.sheet:S.projections[S.proj]}
function setList(a){if(S.mode==='sheet'){S.sheet=a}else{S.projections[S.proj]=a}}
function everything(){return S.sheet.concat(S.projections.front,S.projections.top,S.projections.side)}
function copy(o){return JSON.parse(JSON.stringify(o))}
function toast(t){var el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('on')},3200)}
function fmtVal(mm,unit){unit=unit||S.unit;return unit==='cm'?(mm/10).toFixed(1)+' см':Math.round(mm)+' мм'}
function selEl(){var l=curList();for(var i=0;i<l.length;i++)if(l[i].id===S.selected[0])return l[i];return null}
function textW(t,fs){return String(t).length*fs*0.54}

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
function pushHistory(){S.history=S.history.slice(0,S.hi+1);S.history.push(copy({s:S.sheet,p:S.projections}));S.hi=S.history.length-1;if(S.history.length>60){S.history.shift();S.hi--}}
function undo(){if(S.hi<=0)return;S.hi--;var h=copy(S.history[S.hi]);S.sheet=h.s;S.projections=h.p;S.selected=[];refreshInspector();paint();toast('Отменено')}
function redo(){if(S.hi>=S.history.length-1)return;S.hi++;var h=copy(S.history[S.hi]);S.sheet=h.s;S.projections=h.p;S.selected=[];refreshInspector();paint();toast('Повторено')}

/* ============ ПРИВЯЗКИ ============ */
function snapCandidates(){
  var list=curList(),out=[],i,j,el;
  for(i=0;i<list.length;i++){
    el=list[i];
    if(el.type==='line'||el.type==='dimension'){
      out.push({x:el.x1,y:el.y1,t:'конец'});out.push({x:el.x2,y:el.y2,t:'конец'});
      out.push({x:(el.x1+el.x2)/2,y:(el.y1+el.y2)/2,t:'середина'});
    }else if(el.type==='rect'){
      var x0=el.x,y0=el.y,x1=el.x+el.w,y1=el.y+el.h;
      out.push({x:x0,y:y0,t:'угол'});out.push({x:x1,y:y0,t:'угол'});
      out.push({x:x1,y:y1,t:'угол'});out.push({x:x0,y:y1,t:'угол'});
      out.push({x:(x0+x1)/2,y:(y0+y1)/2,t:'центр'});
      out.push({x:(x0+x1)/2,y:y0,t:'середина'});out.push({x:(x0+x1)/2,y:y1,t:'середина'});
      out.push({x:x0,y:(y0+y1)/2,t:'середина'});out.push({x:x1,y:(y0+y1)/2,t:'середина'});
    }else if(el.type==='circle'){
      out.push({x:el.cx,y:el.cy,t:'центр'});
      out.push({x:el.cx+el.r,y:el.cy,t:'квадрант'});out.push({x:el.cx-el.r,y:el.cy,t:'квадрант'});
      out.push({x:el.cx,y:el.cy+el.r,t:'квадрант'});out.push({x:el.cx,y:el.cy-el.r,t:'квадрант'});
    }else if(el.points){
      for(j=0;j<el.points.length;j++){
        out.push({x:el.points[j].x,y:el.points[j].y,t:'вершина'});
        var nx=el.points[(j+1)%el.points.length];
        if(j<el.points.length-1||el.closed||el.type==='polygon')
          out.push({x:(el.points[j].x+nx.x)/2,y:(el.points[j].y+nx.y)/2,t:'середина'});
      }
    }
  }
  return out;
}
function snapPoint(raw){
  if(!S.snap)return{x:raw.x,y:raw.y,t:null};
  var best=null,tol=14/S.viewport.z,c=snapCandidates(),i,d;
  for(i=0;i<c.length;i++){
    d=Math.sqrt(Math.pow(c[i].x-raw.x,2)+Math.pow(c[i].y-raw.y,2));
    if(d<tol&&(!best||d<best.d))best={x:c[i].x,y:c[i].y,t:c[i].t,d:d};
  }
  if(best)return best;
  var g=S.grid;
  return{x:Math.round(raw.x/g)*g,y:Math.round(raw.y/g)*g,t:null};
}
function applyOrtho(from,p){
  if(!(S.ortho||S.shift))return p;
  var dx=p.x-from.x,dy=p.y-from.y;
  var a=Math.atan2(dy,dx),len=Math.sqrt(dx*dx+dy*dy);
  var step=Math.PI/4,sn=Math.round(a/step)*step;
  return{x:from.x+Math.cos(sn)*len,y:from.y+Math.sin(sn)*len,t:p.t};
}
function toggleSnap(){S.snap=!S.snap;$('#tSnap').classList.toggle('on',S.snap);toast(S.snap?'Привязка включена':'Привязка выключена')}
function toggleOrtho(){S.ortho=!S.ortho;$('#tOrtho').classList.toggle('on',S.ortho);toast(S.ortho?'Ортогональный режим: линии строго под 45°':'Ортогональный режим выключен')}

/* ============ ОТРИСОВКА ============ */
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
  if(s>3.5){
    ctx.strokeStyle='#ebeef2';ctx.lineWidth=.5;ctx.beginPath();
    for(x=S.viewport.x%s;x<CW;x+=s){ctx.moveTo(x,0);ctx.lineTo(x,CH)}
    for(y=S.viewport.y%s;y<CH;y+=s){ctx.moveTo(0,y);ctx.lineTo(CW,y)}
    ctx.stroke();
  }
  ctx.strokeStyle='#d6dce4';ctx.lineWidth=.8;ctx.beginPath();
  for(x=S.viewport.x%m;x<CW;x+=m){ctx.moveTo(x,0);ctx.lineTo(x,CH)}
  for(y=S.viewport.y%m;y<CH;y+=m){ctx.moveTo(0,y);ctx.lineTo(CW,y)}
  ctx.stroke();
  ctx.strokeStyle='#bac4d0';ctx.lineWidth=1.2;ctx.beginPath();
  ctx.moveTo(S.viewport.x,0);ctx.lineTo(S.viewport.x,CH);ctx.moveTo(0,S.viewport.y);ctx.lineTo(CW,S.viewport.y);
  ctx.stroke();ctx.restore();
}
function handle(x,y){ctx.save();ctx.setLineDash([]);ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.arc(x,y,4/S.viewport.z,0,Math.PI*2);ctx.fill();ctx.restore()}
function styleFor(el){if(el.style&&DASH[el.style])return DASH[el.style];return null}
function roleColor(el){
  if(el.role==='hole')return '#b45309';
  if(el.role==='boss')return '#16a34a';
  return '#1a2030';
}
function paintShape(el,sel,preview){
  var z=S.viewport.z,i;
  var col=sel?'#7c3aed':(preview?'#0ea5e9':roleColor(el));
  ctx.strokeStyle=col;ctx.fillStyle=col;
  ctx.lineWidth=(sel?2.5:(el.style==='center'?1.1:1.8))/z;
  ctx.lineCap='butt';ctx.lineJoin='round';
  var d=styleFor(el);
  ctx.setLineDash(d?d.map(function(v){return v/z}):[]);
  if(el.type==='line'){ctx.beginPath();ctx.moveTo(el.x1,el.y1);ctx.lineTo(el.x2,el.y2);ctx.stroke();if(sel){handle(el.x1,el.y1);handle(el.x2,el.y2)}}
  if(el.type==='rect'){ctx.beginPath();ctx.rect(el.x,el.y,el.w,el.h);ctx.stroke();
    if(sel){handle(el.x,el.y);handle(el.x+el.w,el.y);handle(el.x+el.w,el.y+el.h);handle(el.x,el.y+el.h)}}
  if(el.type==='circle'){
    ctx.beginPath();ctx.arc(el.cx,el.cy,el.r,0,Math.PI*2);ctx.stroke();
    ctx.save();ctx.setLineDash([9/z,2.5/z,2.5/z,2.5/z]);ctx.lineWidth=.9/z;ctx.strokeStyle=sel?'#7c3aed':'#8b95a3';
    var e=el.r+4;ctx.beginPath();ctx.moveTo(el.cx-e,el.cy);ctx.lineTo(el.cx+e,el.cy);ctx.moveTo(el.cx,el.cy-e);ctx.lineTo(el.cx,el.cy+e);ctx.stroke();ctx.restore();
    if(sel){handle(el.cx,el.cy);handle(el.cx+el.r,el.cy)}
  }
  if(el.type==='polyline'||el.type==='polygon'){
    if(el.points&&el.points.length>1){ctx.beginPath();ctx.moveTo(el.points[0].x,el.points[0].y);
      for(i=1;i<el.points.length;i++)ctx.lineTo(el.points[i].x,el.points[i].y);
      if(el.closed||el.type==='polygon')ctx.closePath();ctx.stroke()}
    if(sel&&el.points)for(i=0;i<el.points.length;i++)handle(el.points[i].x,el.points[i].y);
    if(preview&&el.ghost&&el.points){var last=el.points[el.points.length-1];
      ctx.save();ctx.setLineDash([5/z,4/z]);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(el.ghost.x,el.ghost.y);ctx.stroke();ctx.restore()}
  }
  ctx.setLineDash([]);
  if(el.type==='dimension'){
    var o=15/z;ctx.save();ctx.strokeStyle='#0f766e';ctx.fillStyle='#0f766e';ctx.lineWidth=1/z;
    ctx.setLineDash([3/z,2/z]);ctx.beginPath();
    ctx.moveTo(el.x1,el.y1);ctx.lineTo(el.x1,el.y1-o*1.5);ctx.moveTo(el.x2,el.y2);ctx.lineTo(el.x2,el.y2-o*1.5);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(el.x1,el.y1-o);ctx.lineTo(el.x2,el.y2-o);ctx.stroke();
    var dd=Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2));
    ctx.font='bold '+(10/z)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(fmtVal(dd),(el.x1+el.x2)/2,(el.y1+el.y2)/2-o-3/z);ctx.restore()
  }
}
function refreshBadges(){
  var b=$$('.ptab .badge');
  for(var i=0;i<b.length;i++){var key=b[i].parentNode.getAttribute('data-p');
    if(S.projections[key].length>0)b[i].classList.add('has');else b[i].classList.remove('has')}
}

/* ============ РАЗМЕРЫ ============ */
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
      g.textAlign='center';g.textBaseline='middle';
      g.fillText(txt,mx+(-dy/L)*10*k,my+(dx/L)*10*k);
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
}

/* ============ БЫСТРЫЙ ВВОД ============ */
function showQuick(x,y){
  var q=$('#quick'),d=S.drawing;if(!d)return;
  var lbl='Размер';
  if(d.type==='rect')lbl='Ширина и высота, например 100 50';
  else if(d.type==='circle')lbl='Радиус, например 25 · диаметр d50';
  else if(d.type==='line')lbl='Длина, например 120 · с углом 120<45';
  else if(d.type==='dimension')lbl='Длина размера';
  else return;
  $('#quickLbl').textContent=lbl;
  q.style.left=Math.min(CW-260,x+16)+'px';q.style.top=Math.max(6,y-46)+'px';
  q.classList.add('on');
}
function hideQuick(){$('#quick').classList.remove('on');$('#quickInp').value=''}
function applyQuick(){
  var v=$('#quickInp').value.trim(),d=S.drawing;
  if(!d||!v){hideQuick();return}
  var nums=v.replace(',','.').toLowerCase();
  if(d.type==='rect'){
    var m=nums.split(/[\s x×*]+/).filter(function(s){return s.length});
    var w=parseFloat(m[0]),h=m.length>1?parseFloat(m[1]):parseFloat(m[0]);
    if(!(w>0)||!(h>0)){toast('Введите ширину и высоту, например 100 50');return}
    var sx=d.w<0?-1:1,sy=d.h<0?-1:1;
    d.w=w*sx;d.h=h*sy;
    if(d.w<0){d.x+=d.w;d.w=-d.w}if(d.h<0){d.y+=d.h;d.h=-d.h}
    commitDrawing();
  }else if(d.type==='circle'){
    var dia=nums.charAt(0)==='d',r=parseFloat(dia?nums.slice(1):nums);
    if(!(r>0)){toast('Введите радиус, например 25, или диаметр d50');return}
    d.r=dia?r/2:r;commitDrawing();
  }else if(d.type==='line'||d.type==='dimension'){
    var parts=nums.split('<'),len=parseFloat(parts[0]);
    if(!(len>0)){toast('Введите длину, например 120');return}
    var ang;
    if(parts.length>1)ang=-parseFloat(parts[1])*Math.PI/180;
    else ang=Math.atan2(d.y2-d.y1,d.x2-d.x1)||0;
    d.x2=d.x1+Math.cos(ang)*len;d.y2=d.y1+Math.sin(ang)*len;
    commitDrawing();
  }
}
function commitDrawing(){
  var d=S.drawing;if(!d)return;
  add(d);S.drawing=null;hideQuick();mouseDown=false;paint();
}
$('#quickInp').addEventListener('keydown',function(e){
  e.stopPropagation();
  if(e.key==='Enter'){e.preventDefault();applyQuick()}
  if(e.key==='Escape'){S.drawing=null;hideQuick();paint()}
});

/* ============ МЫШЬ ============ */
var mouseDown=false,dragTarget=null,dragFrom=null,startPt=null;
cnv.addEventListener('mousedown',function(e){
  var raw=toWorld(e.offsetX,e.offsetY),p=snapPoint(raw);
  if(S.tool==='pan'||e.button===1){S.panning=true;return}
  if(e.button!==0)return;
  mouseDown=true;startPt={x:p.x,y:p.y};
  if(S.tool==='select'){
    var h=pick(p);
    if(h){S.selected=[h.id];dragTarget=h;dragFrom={x:p.x,y:p.y}}else{S.selected=[]}
    refreshInspector();paint();return}
  if(S.tool==='erase'){var t=pick(p);if(t){setList(curList().filter(function(x){return x.id!==t.id}));pushHistory();paint();toast('Удалено')}return}
  if(S.tool==='line')S.drawing={type:'line',x1:p.x,y1:p.y,x2:p.x,y2:p.y,style:'solid'};
  if(S.tool==='rect')S.drawing={type:'rect',x:p.x,y:p.y,w:0,h:0,style:'solid',role:'body'};
  if(S.tool==='circle')S.drawing={type:'circle',cx:p.x,cy:p.y,r:0,style:'solid',role:'auto'};
  if(S.tool==='hole')S.drawing={type:'circle',cx:p.x,cy:p.y,r:0,style:'solid',role:'hole',through:true};
  if(S.tool==='dimension')S.drawing={type:'dimension',x1:p.x,y1:p.y,x2:p.x,y2:p.y};
  if(S.tool==='polyline'||S.tool==='polygon'){
    if(!S.drawing)S.drawing={type:S.tool,points:[{x:p.x,y:p.y}],closed:S.tool==='polygon',style:'solid',role:'body'};
    else S.drawing.points.push({x:p.x,y:p.y})}
  if(S.drawing&&['rect','circle','line','dimension'].indexOf(S.drawing.type)>=0)showQuick(e.offsetX,e.offsetY);
  paint();
});
cnv.addEventListener('mousemove',function(e){
  var raw=toWorld(e.offsetX,e.offsetY),p=snapPoint(raw);
  if(S.drawing&&startPt&&(S.drawing.type==='line'||S.drawing.type==='dimension'))p=applyOrtho(startPt,p);
  $('#sX').textContent=Math.round(p.x);$('#sY').textContent=Math.round(p.y);
  var sp=toScreen(p.x,p.y),dot=$('#snapdot'),tip=$('#snaptip');
  if(S.snap){
    var near=Math.sqrt(Math.pow(e.offsetX-sp.x,2)+Math.pow(e.offsetY-sp.y,2))<16;
    if(near){
      dot.style.left=sp.x+'px';dot.style.top=sp.y+'px';
      dot.innerHTML=p.t
        ?'<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="#0f766e" stroke-width="2"/></svg>'
        :'<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="none" stroke="#2563eb" stroke-width="2"/></svg>';
      dot.classList.add('on');
      if(p.t){tip.textContent=p.t;tip.style.left=(sp.x+13)+'px';tip.style.top=(sp.y-24)+'px';tip.classList.add('on')}
      else tip.classList.remove('on');
    }else{dot.classList.remove('on');tip.classList.remove('on')}
  }else{dot.classList.remove('on');tip.classList.remove('on')}
  if(S.panning){S.viewport.x+=e.movementX;S.viewport.y+=e.movementY;paint();return}
  if(dragTarget&&mouseDown){shift(dragTarget,p.x-dragFrom.x,p.y-dragFrom.y);dragFrom={x:p.x,y:p.y};paint();refreshInspector();return}
  if(!S.drawing)return;
  var lab=$('#mlabel'),d=S.drawing;
  lab.classList.add('on');lab.style.left=(e.offsetX+16)+'px';lab.style.top=(e.offsetY+14)+'px';
  if(d.type==='line'||d.type==='dimension'){d.x2=p.x;d.y2=p.y;
    var L=Math.sqrt(Math.pow(p.x-d.x1,2)+Math.pow(p.y-d.y1,2));
    var A=Math.round(-Math.atan2(p.y-d.y1,p.x-d.x1)*180/Math.PI);
    lab.textContent=fmtVal(L)+'  ∠'+((A%360+360)%360)+'°'}
  if(d.type==='rect'){d.w=p.x-d.x;d.h=p.y-d.y;lab.textContent=fmtVal(Math.abs(d.w))+' × '+fmtVal(Math.abs(d.h))}
  if(d.type==='circle'){d.r=Math.sqrt(Math.pow(p.x-d.cx,2)+Math.pow(p.y-d.cy,2));lab.textContent='R '+fmtVal(d.r)+'  ⌀ '+fmtVal(d.r*2)}
  if(d.type==='polyline'||d.type==='polygon'){
    if(startPt&&d.points.length)p=applyOrtho(d.points[d.points.length-1],p);
    d.ghost={x:p.x,y:p.y}}
  paint();
});
cnv.addEventListener('mouseup',function(){
  S.panning=false;dragTarget=null;$('#mlabel').classList.remove('on');
  var d=S.drawing;
  if(!d){mouseDown=false;if(S.selected.length)pushHistory();return}
  if(['polyline','polygon'].indexOf(d.type)>=0){mouseDown=false;return}
  var big=false;
  if(d.type==='line'||d.type==='dimension')big=Math.sqrt(Math.pow(d.x2-d.x1,2)+Math.pow(d.y2-d.y1,2))>2;
  if(d.type==='rect'){if(d.w<0){d.x+=d.w;d.w=-d.w}if(d.h<0){d.y+=d.h;d.h=-d.h}big=d.w>2&&d.h>2}
  if(d.type==='circle')big=d.r>1;
  if(big){add(d);S.drawing=null;hideQuick()}
  else{$('#quickInp').focus()}
  mouseDown=false;paint();
});
cnv.addEventListener('dblclick',function(){
  var d=S.drawing;
  if(d&&(d.type==='polyline'||d.type==='polygon')){delete d.ghost;if(d.points.length>2)add(d);S.drawing=null;paint()}
});
cnv.addEventListener('wheel',function(e){
  e.preventDefault();
  var f=e.deltaY<0?1.12:.9,oz=S.viewport.z,nz=Math.max(.05,Math.min(30,oz*f));
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
  var tol=9/S.viewport.z,list=curList(),i,j,el;
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

/* ============ ИНСПЕКТОР ============ */
function isClosed(el){return el.type==='rect'||el.type==='circle'||el.type==='polygon'||(el.type==='polyline'&&el.closed)}
function effRole(el){
  if(el.role&&el.role!=='auto')return el.role;
  if(el.type==='circle'&&hostFor(el))return 'hole';
  return 'body';
}
function refreshInspector(){
  var box=$('#inspector');
  if(!S.selected.length){box.innerHTML='<div class="empty">Выберите объект или начните рисовать. Здесь задаются точные размеры и параметры 3D.</div>';return}
  var el=selEl();
  if(!el){box.innerHTML='<div class="empty">Выберите объект.</div>';return}
  var names={line:'Линия',rect:'Прямоугольник',circle:'Окружность',polyline:'Ломаная',polygon:'Контур',dimension:'Размер'};
  function row(label,val,field){return '<div class="row"><div class="lbl">'+label+'</div><input class="inp" type="number" step="1" value="'+Number(val).toFixed(1)+'" onchange="editProp(\''+field+'\',this.value)"></div>'}
  var h='<div class="sec"><div class="sec-t">'+(names[el.type]||el.type)+'</div><div class="card">';
  if(el.type==='line'){h+=row('X начала',el.x1,'x1')+row('Y начала',el.y1,'y1')+row('X конца',el.x2,'x2')+row('Y конца',el.y2,'y2');
    var L=Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2));
    h+='<div class="row"><div class="lbl">Длина</div><input class="inp" type="number" step="1" value="'+L.toFixed(1)+'" onchange="setLineLen(this.value)"></div>'}
  if(el.type==='rect'){h+=row('X',el.x,'x')+row('Y',el.y,'y')+row('Ширина',el.w,'w')+row('Высота',el.h,'h');
    h+='<div class="row"><div class="lbl">Размер</div><div style="font:12px var(--mono)">'+fmtVal(Math.abs(el.w))+' × '+fmtVal(Math.abs(el.h))+'</div></div>'}
  if(el.type==='circle'){h+=row('Центр X',el.cx,'cx')+row('Центр Y',el.cy,'cy')+row('Радиус',el.r,'r');
    h+='<div class="row"><div class="lbl">Диаметр</div><input class="inp" type="number" step="1" value="'+(el.r*2).toFixed(1)+'" onchange="setDia(this.value)"></div>'}
  if(el.type==='dimension')h+=row('X1',el.x1,'x1')+row('Y1',el.y1,'y1')+row('X2',el.x2,'x2')+row('Y2',el.y2,'y2');
  if(el.points)h+='<div class="row"><div class="lbl">Вершин</div><div style="font:12px var(--mono)">'+el.points.length+'</div></div>';
  h+='</div></div>';
  if(el.type!=='dimension'){
    h+='<div class="sec"><div class="sec-t">Тип линии</div><div class="card"><div class="rolebar">'
     +'<button class="rolebtn'+((!el.style||el.style==='solid')?' on':'')+'" onclick="setStyle(\'solid\')">Основная</button>'
     +'<button class="rolebtn'+(el.style==='dashed'?' on':'')+'" onclick="setStyle(\'dashed\')">Невидимая</button>'
     +'<button class="rolebtn'+(el.style==='center'?' on':'')+'" onclick="setStyle(\'center\')">Осевая</button>'
     +'</div></div></div>';
  }
  if(isClosed(el)){
    var r=effRole(el),host=hostFor(el);
    h+='<div class="sec"><div class="sec-t">Что это в 3D</div><div class="card">';
    h+='<div class="rolebar">'
     +'<button class="rolebtn'+(r==='body'?' on':'')+'" onclick="setRole(\'body\')">Тело</button>'
     +'<button class="rolebtn hole'+(r==='hole'?' on':'')+'" onclick="setRole(\'hole\')">Отверстие</button>'
     +'<button class="rolebtn boss'+(r==='boss'?' on':'')+'" onclick="setRole(\'boss\')">Выступ</button>'
     +'</div>';
    if(r==='hole'&&!host)h+='<div class="hint" style="color:#b45309">Отверстие должно быть внутри тела. Нарисуйте прямоугольник или контур вокруг него.</div>';
    if(r==='hole'){
      h+='<div class="row" style="margin-top:8px"><label class="check"><input type="checkbox" '+(el.through!==false?'checked':'')+' onchange="setThrough(this.checked)"> Сквозное отверстие</label></div>';
      if(el.through===false)
        h+='<div class="row"><div class="lbl">Глубина</div><input class="inp" type="number" step="1" placeholder="напр. 20" value="'+(el.depth||'')+'" onchange="setDepth(this.value)"><span style="font-size:11px;color:var(--muted)">мм</span></div>';
    }else{
      h+='<div class="row" style="margin-top:8px"><div class="lbl">'+(r==='boss'?'Высота':'Толщина')+'</div><input class="inp" type="number" step="1" placeholder="как у детали" value="'+(el.depth||'')+'" onchange="setDepth(this.value)"><span style="font-size:11px;color:var(--muted)">мм</span></div>';
      h+='<div class="hint">Пусто значит на всю толщину детали.</div>';
    }
    h+='</div></div>';
  }
  h+='<div class="sec"><div class="row">'
   +'<button class="btn" style="flex:1" onclick="duplicateSel()">Дублировать</button>'
   +'<button class="btn" style="flex:1" onclick="removeSelected()">Удалить</button></div></div>';
  box.innerHTML=h;
}
function editProp(field,value){var el=selEl();if(!el)return;el[field]=parseFloat(value)||0;pushHistory();paint();refreshInspector()}
function setLineLen(v){var el=selEl();if(!el)return;var L=parseFloat(v);if(!(L>0))return;
  var a=Math.atan2(el.y2-el.y1,el.x2-el.x1);el.x2=el.x1+Math.cos(a)*L;el.y2=el.y1+Math.sin(a)*L;
  pushHistory();paint();refreshInspector()}
function setDia(v){var el=selEl();if(!el)return;var d=parseFloat(v);if(!(d>0))return;el.r=d/2;pushHistory();paint();refreshInspector()}
function setStyle(s){var el=selEl();if(!el)return;el.style=s;pushHistory();paint();refreshInspector()}
function setRole(r){var el=selEl();if(!el)return;el.role=r;if(r==='hole'&&el.through===undefined)el.through=true;pushHistory();paint();refreshInspector();
  toast(r==='hole'?'Теперь это отверстие: в 3D оно вырежет материал':r==='boss'?'Теперь это выступ: в 3D он добавит материал':'Теперь это тело детали')}
function setThrough(v){var el=selEl();if(!el)return;el.through=v;pushHistory();refreshInspector()}
function setDepth(v){var el=selEl();if(!el)return;var d=parseFloat(v);el.depth=(d>0)?d:null;pushHistory();refreshInspector()}
function duplicateSel(){var el=selEl();if(!el)return;var c=copy(el);delete c.id;shift(c,20,20);add(c);toast('Копия создана')}
function removeSelected(){
  if(!S.selected.length)return;
  setList(curList().filter(function(e){return S.selected.indexOf(e.id)<0}));
  S.selected=[];pushHistory();refreshInspector();paint();toast('Удалено');
}

/* ============ РЕЖИМЫ ============ */
function startWith(mode,withTour){
  $('#welcome').classList.add('off');setMode(mode);
  setTimeout(function(){resizeAll();if(withTour)startTour();else if(!localStorage.getItem('df16_tour'))startTour()},60);
}
function setMode(mode){
  S.mode=mode;$('#welcome').classList.add('off');
  $('#mSheet').classList.toggle('on',mode==='sheet');
  $('#mProj').classList.toggle('on',mode==='proj');
  $('#ptabs').classList.toggle('on',mode==='proj');
  $('#btnComb').style.display=mode==='proj'?'':'none';
  S.selected=[];S.drawing=null;hideQuick();refreshInspector();resizeAll();
}
function switchProj(key){
  S.proj=key;var tabs=$$('.ptab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('on',tabs[i].getAttribute('data-p')===key);
  S.selected=[];S.drawing=null;hideQuick();refreshInspector();paint();
}
function setTool(t){
  S.tool=t;S.drawing=null;hideQuick();
  var items=$$('.ti');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('on',items[i].getAttribute('data-t')===t);
  $('#tipBox').textContent=TIPS[t]||'';paint();
}

/* ============ ГРАНИЦЫ ============ */
function boundsOf(list){
  if(!list||!list.length)return null;
  var x1=1e9,y1=1e9,x2=-1e9,y2=-1e9,any=false;
  for(var i=0;i<list.length;i++){
    if(list[i].type==='dimension')continue;
    var b=shapeBounds(list[i]);any=true;
    x1=Math.min(x1,b.x1);y1=Math.min(y1,b.y1);x2=Math.max(x2,b.x2);y2=Math.max(y2,b.y2)}
  if(!any)return null;
  return{x1:x1,y1:y1,x2:x2,y2:y2,w:Math.max(x2-x1,1),h:Math.max(y2-y1,1)};
}
function shapeBounds(el){
  if(el.type==='line'||el.type==='dimension')return{x1:Math.min(el.x1,el.x2),y1:Math.min(el.y1,el.y2),x2:Math.max(el.x1,el.x2),y2:Math.max(el.y1,el.y2)};
  if(el.type==='rect')return{x1:Math.min(el.x,el.x+el.w),y1:Math.min(el.y,el.y+el.h),x2:Math.max(el.x,el.x+el.w),y2:Math.max(el.y,el.y+el.h)};
  if(el.type==='circle')return{x1:el.cx-el.r,y1:el.cy-el.r,x2:el.cx+el.r,y2:el.cy+el.r};
  if(el.points&&el.points.length){var xs=[],ys=[];for(var i=0;i<el.points.length;i++){xs.push(el.points[i].x);ys.push(el.points[i].y)}
    return{x1:Math.min.apply(null,xs),y1:Math.min.apply(null,ys),x2:Math.max.apply(null,xs),y2:Math.max.apply(null,ys)}}
  return{x1:0,y1:0,x2:0,y2:0};
}

/* ============ ГЕОМЕТРИЯ ДЛЯ 3D ============ */
function polyOf(el){
  var i,out=[];
  if(el.type==='rect')return[{x:el.x,y:el.y},{x:el.x+el.w,y:el.y},{x:el.x+el.w,y:el.y+el.h},{x:el.x,y:el.y+el.h}];
  if(el.type==='circle'){var n=72;for(i=0;i<n;i++){var a=i/n*Math.PI*2;out.push({x:el.cx+Math.cos(a)*el.r,y:el.cy+Math.sin(a)*el.r})}return out}
  if(el.points&&el.points.length>2)return el.points.map(function(p){return{x:p.x,y:p.y}});
  return null;
}
function signedArea(p){var a=0;for(var i=0;i<p.length;i++){var j=(i+1)%p.length;a+=p[i].x*p[j].y-p[j].x*p[i].y}return a/2}
function polyArea(p){return Math.abs(signedArea(p))}
function centroid(p){var x=0,y=0;for(var i=0;i<p.length;i++){x+=p[i].x;y+=p[i].y}return{x:x/p.length,y:y/p.length}}
function pointInPoly(pt,poly){
  var inside=false,i,j;
  for(i=0,j=poly.length-1;i<poly.length;j=i++){
    var xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    if(((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi+1e-12)+xi))inside=!inside;
  }
  return inside;
}
function closedEls(list){var out=[],i;for(i=0;i<list.length;i++)if(isClosed(list[i]))out.push(list[i]);return out}
function hostFor(el){
  var list=curList(),cands=closedEls(list),me=polyOf(el);
  if(!me)return null;
  var c=centroid(me),myA=polyArea(me),host=null,i;
  for(i=0;i<cands.length;i++){
    var o=cands[i];if(o.id===el.id)continue;
    if(o.role==='hole')continue;
    var op=polyOf(o);if(!op)continue;
    if(polyArea(op)<=myA)continue;
    if(!pointInPoly(c,op))continue;
    if(!host||polyArea(op)<polyArea(polyOf(host)))host=o;
  }
  return host;
}
function flip(p){return p.map(function(q){return{x:q.x,y:-q.y}})}
function ccw(p){return signedArea(p)<0?p.slice().reverse():p}
function cw(p){return signedArea(p)>0?p.slice().reverse():p}
function buildParts(globalDepth){
  var src=S.mode==='proj'?S.projections.front:S.sheet;
  var els=closedEls(src),items=[],i,k;
  for(i=0;i<els.length;i++){
    var poly=polyOf(els[i]);if(!poly)continue;
    items.push({el:els[i],poly:poly,area:polyArea(poly),c:centroid(poly)});
  }
  for(i=0;i<items.length;i++){
    var it=items[i],host=null;
    for(k=0;k<items.length;k++){
      var o=items[k];if(o===it)continue;
      if(o.area<=it.area)continue;
      if(!pointInPoly(it.c,o.poly))continue;
      if(!host||o.area<host.area)host=o;
    }
    it.host=host;
  }
  for(i=0;i<items.length;i++){
    var t=items[i],r=t.el.role;
    if(!r||r==='auto')r=(t.el.type==='circle'&&t.host)?'hole':'body';
    if((r==='hole'||r==='boss')&&!t.host)r='body';
    t.role=r;
  }
  var parts=[],map={};
  for(i=0;i<items.length;i++){
    if(items[i].role!=='body')continue;
    var d=items[i].el.depth||globalDepth;
    var part={outer:ccw(flip(items[i].poly)),holes:[],z0:0,z1:d,src:items[i]};
    parts.push(part);map[items[i].el.id]=part;
  }
  for(i=0;i<items.length;i++){
    var hI=items[i];if(hI.role!=='hole')continue;
    var hostPart=hostPartOf(hI,map);
    if(!hostPart)continue;
    var through=hI.el.through!==false;
    var hd=through?(hostPart.z1-hostPart.z0):Math.min(hI.el.depth||(hostPart.z1-hostPart.z0),hostPart.z1-hostPart.z0);
    hostPart.holes.push({ring:cw(flip(hI.poly)),depth:hd,through:through||hd>=(hostPart.z1-hostPart.z0)-0.001});
  }
  for(i=0;i<items.length;i++){
    var bI=items[i];if(bI.role!=='boss')continue;
    var hp=hostPartOf(bI,map);
    var base=hp?hp.z1:globalDepth;
    var bh=bI.el.depth||Math.max(6,globalDepth*0.4);
    parts.push({outer:ccw(flip(bI.poly)),holes:[],z0:base,z1:base+bh,src:bI});
  }
  return parts;
}
function hostPartOf(item,map){
  var h=item.host,guard=0;
  while(h&&guard++<12){if(map[h.el.id])return map[h.el.id];h=h.host}
  return null;
}

/* ============ 3D ============ */
var VIEWS={iso:{az:0.7854,el:0.6155,name:'Изометрия'},front:{az:0,el:0,name:'Спереди'},
  top:{az:0,el:1.5708,name:'Сверху'},side:{az:-1.5708,el:0,name:'Сбоку (справа)'}};
var V={faces:[],clips:[],az:VIEWS.iso.az,el:VIEWS.iso.el,scale:1,cx:0,cy:0,drag:false,px:0,py:0,wire:false,zoom:1,
  size:{x:0,y:0,z:0},bodies:0,holes:0,bosses:0};
var v3=$('#v3canvas'),v3ctx=v3.getContext('2d'),VW=1,VH=1;
function ring3(ring,z){return ring.map(function(p){return[p.x,p.y,z]})}
/* Заглянуть внутрь отверстия можно только через его устье, поэтому стенки
   рисуем с обрезкой по контуру устья: иначе глубокий канал вылезает поверх
   боковой грани детали. Рёбра стенок не обводим, иначе видны полосы. */
function makeFaces(parts){
  var faces=[],clips=[],i,k;
  function wall(ring,z0,z1,cf,cb){
    for(var j=0;j<ring.length;j++){
      var a=ring[j],b=ring[(j+1)%ring.length];
      var dx=b.x-a.x,dy=b.y-a.y,L=Math.sqrt(dx*dx+dy*dy)||1;
      var f={rings:[[[a.x,a.y,z0],[b.x,b.y,z0],[b.x,b.y,z1],[a.x,a.y,z1]]],n:[dy/L,-dx/L,0]};
      if(cf!==undefined){f.inner=true;f.cf=cf;f.cb=cb}
      faces.push(f);
    }
  }
  for(i=0;i<parts.length;i++){
    var p=parts[i],through=[];
    for(k=0;k<p.holes.length;k++)if(p.holes[k].through)through.push(p.holes[k]);
    var back=[ring3(p.outer,p.z0)];
    for(k=0;k<through.length;k++)back.push(ring3(through[k].ring,p.z0));
    faces.push({rings:back,n:[0,0,-1]});
    var front=[ring3(p.outer,p.z1)];
    for(k=0;k<p.holes.length;k++)front.push(ring3(p.holes[k].ring,p.z1));
    faces.push({rings:front,n:[0,0,1]});
    wall(p.outer,p.z0,p.z1);
    for(k=0;k<p.holes.length;k++){
      var h=p.holes[k],bot=h.through?p.z0:Math.max(p.z0,p.z1-h.depth);
      var cf=clips.length;clips.push(ring3(h.ring,p.z1));
      var cb=-1;
      if(h.through){cb=clips.length;clips.push(ring3(h.ring,p.z0))}
      wall(h.ring,bot,p.z1,cf,cb);
      if(!h.through&&bot>p.z0+0.001)faces.push({rings:[ring3(h.ring,bot)],n:[0,0,1],floor:true,inner:true,cf:cf,cb:-1});
    }
  }
  return{faces:faces,clips:clips};
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
  V.scale=Math.min((VW-180)/w,(VH-190)/h)*V.zoom;
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
  var camFront=rotate([0,0,1])[2]>0;
  var clipCache=[];
  function clipPoly(ci){
    if(clipCache[ci])return clipCache[ci];
    var src=V.clips[ci],out=[],j,q;
    for(j=0;j<src.length;j++){q=rotate(src[j]);out.push([V.cx+q[0]*V.scale,V.cy-q[1]*V.scale])}
    clipCache[ci]=out;return out;
  }
  var list=[];
  for(i=0;i<V.faces.length;i++){
    var f=V.faces[i],n=rotate(f.n);
    if(!V.wire&&n[2]<=0.0001)continue;
    var cp=null;
    if(f.inner&&!V.wire){
      var ci=camFront?f.cf:f.cb;
      if(!(ci>=0))continue;
      cp=clipPoly(ci);
    }
    var sum=0,cnt=0;
    var rings=f.rings.map(function(r){return r.map(function(p){var q=rotate(p);sum+=q[2];cnt++;return q})});
    var lit=n[0]*L[0]+n[1]*L[1]+n[2]*L[2];
    list.push({rings:rings,d:sum/Math.max(1,cnt),shade:Math.max(0.1,lit),floor:f.floor,inner:f.inner,clip:cp});
  }
  list.sort(function(x,y){return x.d-y.d});
  for(i=0;i<list.length;i++){
    var fc=list[i],ri,ki,cl;
    if(fc.clip){
      g.save();g.beginPath();cl=fc.clip;
      for(ki=0;ki<cl.length;ki++){if(ki===0)g.moveTo(cl[ki][0],cl[ki][1]);else g.lineTo(cl[ki][0],cl[ki][1])}
      g.closePath();g.clip();
    }
    g.beginPath();
    for(ri=0;ri<fc.rings.length;ri++){
      var ring=fc.rings[ri];
      for(ki=0;ki<ring.length;ki++){
        var sx=V.cx+ring[ki][0]*V.scale, sy=V.cy-ring[ki][1]*V.scale;
        if(ki===0)g.moveTo(sx,sy);else g.lineTo(sx,sy)}
      g.closePath()}
    if(V.wire){g.strokeStyle='rgba(155,208,255,.75)';g.lineWidth=1;g.stroke()}
    else{
      var t=Math.min(1,0.26+fc.shade*0.86);
      if(fc.floor)t*=0.72;
      if(fc.inner)t*=0.88;
      g.fillStyle='rgb('+Math.round(34+t*114)+','+Math.round(92+t*114)+','+Math.round(146+t*100)+')';
      g.fill('evenodd');
      if(!fc.inner){g.strokeStyle='rgba(9,18,32,.5)';g.lineWidth=1;g.stroke()}
    }
    if(fc.clip)g.restore();
  }
}
function featureList(){
  var src=S.mode==='proj'?S.projections.front:S.sheet;
  var els=closedEls(src),out=[],i;
  for(i=0;i<els.length;i++){
    var el=els[i],poly=polyOf(el);if(!poly)continue;
    out.push({el:el,role:effRole(el),area:polyArea(poly)});
  }
  out.sort(function(a,b){return b.area-a.area});
  return out;
}
function renderFeatures(){
  var f=featureList(),h='',i;
  if(!f.length){$('#featTable').innerHTML='<div class="hint">Пока нет замкнутых фигур.</div>';return}
  var names={rect:'Прямоугольник',circle:'Окружность',polygon:'Контур',polyline:'Контур'};
  var colors={body:'#2563eb',hole:'#b45309',boss:'#16a34a'};
  h+='<table class="ftable"><tr><th>Элемент</th><th style="width:118px">Роль</th><th style="width:96px">Глубина</th></tr>';
  for(i=0;i<f.length;i++){
    var el=f[i].el,r=f[i].role;
    var size=el.type==='circle'?('⌀ '+Math.round(el.r*2)):(el.type==='rect'?(Math.round(Math.abs(el.w))+'×'+Math.round(Math.abs(el.h))):(el.points.length+' точ.'));
    h+='<tr><td><span class="tagd"><span class="dotm" style="background:'+colors[r]+'"></span>'+(names[el.type]||el.type)+' <span style="color:#6b7a8d;font-family:var(--mono);font-size:11.5px">'+size+'</span></span></td>'
     +'<td><select onchange="featRole(\''+el.id+'\',this.value)">'
     +'<option value="body"'+(r==='body'?' selected':'')+'>Тело</option>'
     +'<option value="hole"'+(r==='hole'?' selected':'')+'>Отверстие</option>'
     +'<option value="boss"'+(r==='boss'?' selected':'')+'>Выступ</option></select></td>'
     +'<td><input type="number" placeholder="'+(r==='hole'&&el.through!==false?'насквозь':'вся')+'" value="'+(el.depth||'')+'" onchange="featDepth(\''+el.id+'\',this.value)"></td></tr>';
  }
  h+='</table>';
  $('#featTable').innerHTML=h;
}
function findById(id){
  var src=S.mode==='proj'?S.projections.front:S.sheet;
  for(var i=0;i<src.length;i++)if(src[i].id===id)return src[i];
  return null;
}
function featRole(id,v){var el=findById(id);if(!el)return;el.role=v;if(v==='hole'&&el.through===undefined)el.through=true;renderFeatures();paint()}
function featDepth(id,v){var el=findById(id);if(!el)return;var d=parseFloat(v);el.depth=(d>0)?d:null;
  if(el.role==='hole')el.through=!(d>0);renderFeatures()}
function open3D(){
  var src=S.mode==='proj'?S.projections.front:S.sheet;
  var els=closedEls(src);
  if(!els.length){toast('Нет замкнутых фигур. Нарисуйте прямоугольник или контур: он станет телом детали, а окружность внутри него превратится в отверстие.');return}
  var info=$('#buildInfo');
  if(S.mode==='proj'){
    var tb=boundsOf(S.projections.top),sb=boundsOf(S.projections.side),srcTxt='значения ниже';
    if(tb){srcTxt='вида сверху ('+fmtVal(tb.h)+')';$('#depthVal').value=Math.max(1,Math.round(tb.h))}
    else if(sb){srcTxt='вида сбоку ('+fmtVal(sb.w)+')';$('#depthVal').value=Math.max(1,Math.round(sb.w))}
    info.innerHTML='<b>Режим «По проекциям»</b><br>Форма берётся из фронтальной проекции, толщина из '+srcTxt+'.';
  }else{
    info.innerHTML='<b>Режим «Один лист»</b><br>Каждая замкнутая фигура становится элементом детали. Роль и глубину можно поменять в таблице.';
  }
  renderFeatures();$('#m3d').classList.add('on');
}
function close3DModal(){$('#m3d').classList.remove('on')}
function reopen3D(){closeViewer();setTimeout(open3D,120)}
function buildModel(){
  close3DModal();closeCombined();
  var depth=Math.max(1,parseFloat($('#depthVal').value)||40);
  var parts=buildParts(depth);
  if(!parts.length){toast('Не нашёл ни одного тела. Проверьте роли элементов: хотя бы одна фигура должна быть телом.');return}
  var res=makeFaces(parts);
  V.faces=res.faces;V.clips=res.clips;V.zoom=1;V.wire=false;
  $('#btnWire').classList.remove('on');
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9,minz=1e9,maxz=-1e9,i,k;
  for(i=0;i<parts.length;i++){
    for(k=0;k<parts[i].outer.length;k++){
      var p=parts[i].outer[k];
      if(p.x<minx)minx=p.x;if(p.x>maxx)maxx=p.x;
      if(p.y<miny)miny=p.y;if(p.y>maxy)maxy=p.y;
    }
    if(parts[i].z0<minz)minz=parts[i].z0;
    if(parts[i].z1>maxz)maxz=parts[i].z1;
  }
  V.size={x:maxx-minx,y:maxy-miny,z:maxz-minz};
  V.bodies=0;V.holes=0;V.bosses=0;
  for(i=0;i<parts.length;i++){V.holes+=parts[i].holes.length;
    if(parts[i].src&&parts[i].src.role==='boss')V.bosses++;else V.bodies++}
  var ox=(minx+maxx)/2,oy=(miny+maxy)/2,oz=(minz+maxz)/2;
  for(i=0;i<V.faces.length;i++){var rings=V.faces[i].rings;
    for(var r=0;r<rings.length;r++)for(k=0;k<rings[r].length;k++){
      rings[r][k][0]-=ox;rings[r][k][1]-=oy;rings[r][k][2]-=oz}}
  for(i=0;i<V.clips.length;i++){var cr=V.clips[i];
    for(k=0;k<cr.length;k++){cr[k][0]-=ox;cr[k][1]-=oy;cr[k][2]-=oz}}
  S.is3D=true;$('#viewer').classList.add('on');
  updateInfo3D();setView('iso');
  requestAnimationFrame(function(){fit3D();toast(V.holes?('Модель готова: отверстий '+V.holes):'3D-модель построена')});
}
function updateInfo3D(){
  $('#v3info').innerHTML='<b>Габариты модели</b><br>Ширина '+fmtVal(V.size.x)+' · Высота '+fmtVal(V.size.y)+' · Толщина '+fmtVal(V.size.z)
   +'<br>Тел: '+V.bodies+' · выступов: '+V.bosses+' · отверстий: '+V.holes
   +'<br>Тяните мышью — поворот, колёсико — приближение';
}
function closeViewer(){S.is3D=false;$('#viewer').classList.remove('on');resizeAll()}
function markView(key){
  var b=$$('.v3views .btn');
  for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-view')===key);
  $('#v3name').textContent=key&&VIEWS[key]?VIEWS[key].name:'Свободный поворот';
}
function setView(key){var v=VIEWS[key];if(!v)return;V.az=v.az;V.el=v.el;V.zoom=1;markView(key);recenter();draw3D()}
function resetView(){setView('iso')}
function toggleWire(){V.wire=!V.wire;$('#btnWire').classList.toggle('on',V.wire);draw3D()}
v3.addEventListener('mousedown',function(e){V.drag=true;V.px=e.clientX;V.py=e.clientY;v3.classList.add('grabbing')});
window.addEventListener('mouseup',function(){V.drag=false;v3.classList.remove('grabbing')});
window.addEventListener('mousemove',function(e){
  if(!V.drag||!S.is3D)return;
  V.az-=(e.clientX-V.px)*0.008;
  V.el=Math.max(-1.5,Math.min(1.5,V.el-(e.clientY-V.py)*0.008));
  V.px=e.clientX;V.py=e.clientY;markView(null);recenter();draw3D();
});
v3.addEventListener('wheel',function(e){e.preventDefault();V.zoom=Math.max(0.3,Math.min(6,V.zoom*(e.deltaY<0?1.12:0.9)));recenter();draw3D()},{passive:false});

/* ============ ОБЩИЙ ЧЕРТЁЖ НА ЭКРАНЕ ============ */
function layoutCombined(){
  var fb=boundsOf(S.projections.front),tb=boundsOf(S.projections.top),sb=boundsOf(S.projections.side);
  var pad=S.autoDims?46:8;
  var fw=fb?fb.w:0,fh=fb?fb.h:0,tw=tb?tb.w:0,th=tb?tb.h:0,sw2=sb?sb.w:0,sh2=sb?sb.h:0;
  var gapV=80,gapH=Math.max(80,(fw+sw2)*0.18+60);
  var fy=th?th+gapV+pad:0,sx=fw+gapH;
  var W=Math.max(tw,fw+(sw2?gapH+sw2:0))+pad*2,H=fy+Math.max(fh,sh2)+pad*2;
  return{fb:fb,tb:tb,sb:sb,gapV:gapV,gapH:gapH,fw:fw,fh:fh,tw:tw,th:th,sw2:sw2,sh2:sh2,fy:fy,sx:sx,W:Math.max(W,1),H:Math.max(H,1)};
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
  var scale=Math.min((sw-180)/L.W,(sh-180)/L.H,2.5),k=1/scale;
  g.save();g.translate((sw-L.W*scale)/2,(sh-L.H*scale)/2);g.scale(scale,scale);
  g.strokeStyle='#ecf0f4';g.lineWidth=.4*k;
  for(var x=0;x<=L.W;x+=10){g.beginPath();g.moveTo(x,0);g.lineTo(x,L.H);g.stroke()}
  for(var y=0;y<=L.H;y+=10){g.beginPath();g.moveTo(0,y);g.lineTo(L.W,y);g.stroke()}
  var topX=L.tb?(L.fb?(L.fw-L.tw)/2:0):0;
  if(L.tb)paintBlock(g,S.projections.top,L.tb,topX,0,'Вид сверху',k,'center');
  if(L.fb)paintBlock(g,S.projections.front,L.fb,0,L.fy,'Фронтальная проекция',k,'left');
  if(L.sb)paintBlock(g,S.projections.side,L.sb,L.sx,L.fy,'Вид сбоку',k,'right');
  g.strokeStyle='#aeb9c7';g.lineWidth=1*k;g.setLineDash([5*k,4*k]);
  if(L.tb&&L.fb){var cx=topX+L.tw/2;g.beginPath();g.moveTo(cx,L.th);g.lineTo(cx,L.fy);g.stroke()}
  if(L.fb&&L.sb){g.beginPath();g.moveTo(L.fw,L.fy+L.fh/2);g.lineTo(L.sx,L.fy+Math.min(L.fh,L.sh2)/2);g.stroke()}
  g.setLineDash([]);g.restore();
}
function paintBlock(g,list,b,ox,oy,label,k,align){
  g.save();g.translate(ox-b.x1,oy-b.y1);
  g.fillStyle='#7b8794';g.font='bold '+(11*k)+'px system-ui';g.textBaseline='alphabetic';
  var lx=b.x1;
  if(align==='center'){g.textAlign='center';lx=b.x1+b.w/2}
  else if(align==='right'){g.textAlign='right';lx=b.x1+b.w}
  else g.textAlign='left';
  g.fillText(label,lx,b.y1-(S.autoDims?26*k:10*k));
  g.textAlign='left';
  g.strokeStyle='#d4dae2';g.lineWidth=1*k;g.setLineDash([4*k,3*k]);
  g.strokeRect(b.x1-4*k,b.y1-4*k,b.w+8*k,b.h+8*k);g.setLineDash([]);
  for(var i=0;i<list.length;i++){var el=list[i],j;
    if(el.type==='dimension')continue;
    g.strokeStyle='#1a2030';g.lineWidth=1.6*k;g.lineCap='butt';g.lineJoin='round';
    var d=styleFor(el);g.setLineDash(d?d.map(function(v){return v*k}):[]);
    if(el.type==='line'){g.beginPath();g.moveTo(el.x1,el.y1);g.lineTo(el.x2,el.y2);g.stroke()}
    if(el.type==='rect'){g.beginPath();g.rect(el.x,el.y,el.w,el.h);g.stroke()}
    if(el.type==='circle'){g.beginPath();g.arc(el.cx,el.cy,el.r,0,Math.PI*2);g.stroke();
      g.save();g.setLineDash([9*k,2.5*k,2.5*k,2.5*k]);g.lineWidth=.9*k;g.strokeStyle='#8b95a3';
      var e=el.r+4;g.beginPath();g.moveTo(el.cx-e,el.cy);g.lineTo(el.cx+e,el.cy);g.moveTo(el.cx,el.cy-e);g.lineTo(el.cx,el.cy+e);g.stroke();g.restore()}
    if(el.points&&el.points.length>1){g.beginPath();g.moveTo(el.points[0].x,el.points[0].y);
      for(j=1;j<el.points.length;j++)g.lineTo(el.points[j].x,el.points[j].y);
      if(el.closed||el.type==='polygon')g.closePath();g.stroke()}
    g.setLineDash([]);
  }
  if(S.autoDims)paintDims(g,autoDims(list),k);
  g.restore();
}

/* ============ ЛИСТ А4 ============ */
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function n2(v){return (Math.round(v*100)/100)}
function niceScale(fit){
  var series=[20,10,5,2,1,0.5,0.4,0.25,0.2,0.1,0.05,0.04,0.025,0.02,0.01,0.005,0.002,0.001],i;
  for(i=0;i<series.length;i++)if(series[i]<=fit)return series[i];
  return fit;
}
function scaleLabel(s){
  if(Math.abs(s-1)<1e-9)return '1:1';
  if(s>1)return (Math.round(s*100)/100)+':1';
  return '1:'+(Math.round(1/s*100)/100);
}
function dashAttr(el,s){
  var d=styleFor(el);if(!d)return '';
  return ' stroke-dasharray="'+d.map(function(v){return n2(v*Math.min(1,Math.max(s,0.25)))}).join(' ')+'"';
}
function paperShapes(list,b,px,py,s,axis){
  var out='',ax='',i,j,el;
  function X(v){return n2(px+(v-b.x1)*s)}
  function Y(v){return n2(py+(v-b.y1)*s)}
  for(i=0;i<list.length;i++){
    el=list[i];
    if(el.type==='dimension')continue;
    var da=dashAttr(el,s);
    if(el.type==='line')out+='<line x1="'+X(el.x1)+'" y1="'+Y(el.y1)+'" x2="'+X(el.x2)+'" y2="'+Y(el.y2)+'"'+da+'/>';
    else if(el.type==='rect'){
      var x0=Math.min(el.x,el.x+el.w),y0=Math.min(el.y,el.y+el.h);
      out+='<rect x="'+X(x0)+'" y="'+Y(y0)+'" width="'+n2(Math.abs(el.w)*s)+'" height="'+n2(Math.abs(el.h)*s)+'"'+da+'/>';
    }
    else if(el.type==='circle'){
      out+='<circle cx="'+X(el.cx)+'" cy="'+Y(el.cy)+'" r="'+n2(el.r*s)+'"'+da+'/>';
      if(axis){
        var e=el.r*s+2.2,cx=px+(el.cx-b.x1)*s,cy=py+(el.cy-b.y1)*s;
        ax+='<line x1="'+n2(cx-e)+'" y1="'+n2(cy)+'" x2="'+n2(cx+e)+'" y2="'+n2(cy)+'"/>';
        ax+='<line x1="'+n2(cx)+'" y1="'+n2(cy-e)+'" x2="'+n2(cx)+'" y2="'+n2(cy+e)+'"/>';
      }
    }
    else if(el.points&&el.points.length>1){
      var pts=[];for(j=0;j<el.points.length;j++)pts.push(X(el.points[j].x)+','+Y(el.points[j].y));
      out+=(el.closed||el.type==='polygon')?'<polygon points="'+pts.join(' ')+'"'+da+'/>':'<polyline points="'+pts.join(' ')+'"'+da+'/>';
    }
  }
  var res='<g fill="none" stroke="#111827" stroke-width="0.45" stroke-linejoin="round">'+out+'</g>';
  if(ax)res+='<g fill="none" stroke="#7b8794" stroke-width="0.22" stroke-dasharray="3 0.9 0.9 0.9">'+ax+'</g>';
  return res;
}
function paperDims(list,b,px,py,s,plan,unit){
  var F=3.2,AR=1.7,OFF=6.5,EXT=1.3,out='',i;
  var x1=px,x2=px+b.w*s,y1=py,y2=py+b.h*s;
  function tri(x,y,ang){
    return '<polygon points="'+n2(x)+','+n2(y)+' '+n2(x+Math.cos(ang+0.36)*AR)+','+n2(y+Math.sin(ang+0.36)*AR)+' '+n2(x+Math.cos(ang-0.36)*AR)+','+n2(y+Math.sin(ang-0.36)*AR)+'" fill="#0f766e" stroke="none"/>';
  }
  var hy=plan.h==='above'?(y1-OFF):(y2+OFF);
  var eFrom=plan.h==='above'?(y1-EXT):(y2+EXT);
  out+='<line x1="'+n2(x1)+'" y1="'+n2(eFrom)+'" x2="'+n2(x1)+'" y2="'+n2(hy+(plan.h==='above'?-1.2:1.2))+'" stroke-dasharray="1.4 1.1"/>';
  out+='<line x1="'+n2(x2)+'" y1="'+n2(eFrom)+'" x2="'+n2(x2)+'" y2="'+n2(hy+(plan.h==='above'?-1.2:1.2))+'" stroke-dasharray="1.4 1.1"/>';
  out+='<line x1="'+n2(x1)+'" y1="'+n2(hy)+'" x2="'+n2(x2)+'" y2="'+n2(hy)+'"/>';
  out+=tri(x1,hy,0)+tri(x2,hy,Math.PI);
  out+='<text x="'+n2((x1+x2)/2)+'" y="'+n2(hy-1.3)+'" font-size="'+F+'" text-anchor="middle" fill="#0f766e" stroke="none" font-weight="600">'+esc(fmtVal(b.w,unit))+'</text>';
  var vx=plan.v==='left'?(x1-OFF):(x2+OFF);
  var vFrom=plan.v==='left'?(x1-EXT):(x2+EXT);
  out+='<line x1="'+n2(vFrom)+'" y1="'+n2(y1)+'" x2="'+n2(vx+(plan.v==='left'?-1.2:1.2))+'" y2="'+n2(y1)+'" stroke-dasharray="1.4 1.1"/>';
  out+='<line x1="'+n2(vFrom)+'" y1="'+n2(y2)+'" x2="'+n2(vx+(plan.v==='left'?-1.2:1.2))+'" y2="'+n2(y2)+'" stroke-dasharray="1.4 1.1"/>';
  out+='<line x1="'+n2(vx)+'" y1="'+n2(y1)+'" x2="'+n2(vx)+'" y2="'+n2(y2)+'"/>';
  out+=tri(vx,y1,Math.PI/2)+tri(vx,y2,-Math.PI/2);
  out+='<text transform="translate('+n2(vx-1.3)+','+n2((y1+y2)/2)+') rotate(-90)" font-size="'+F+'" text-anchor="middle" fill="#0f766e" stroke="none" font-weight="600">'+esc(fmtVal(b.h,unit))+'</text>';
  for(i=0;i<list.length;i++){
    var el=list[i];
    if(el.type!=='circle')continue;
    var cx=px+(el.cx-b.x1)*s, cy=py+(el.cy-b.y1)*s, r=el.r*s;
    var a=-0.7, sx=cx+Math.cos(a)*r*0.3, sy=cy+Math.sin(a)*r*0.3;
    var ex=cx+Math.cos(a)*(r+5.5), ey=cy+Math.sin(a)*(r+5.5);
    out+='<line x1="'+n2(sx)+'" y1="'+n2(sy)+'" x2="'+n2(ex)+'" y2="'+n2(ey)+'"/>';
    out+='<text x="'+n2(ex+0.9)+'" y="'+n2(ey-1)+'" font-size="'+F+'" fill="#0f766e" stroke="none" font-weight="600">&#8960; '+esc(fmtVal(el.r*2,unit))+'</text>';
  }
  return '<g stroke="#0f766e" stroke-width="0.28" fill="none">'+out+'</g>';
}
function paperUserDims(list,b,px,py,s,unit){
  var out='',F=3.2,OFF=5,i;
  for(i=0;i<list.length;i++){
    var el=list[i];if(el.type!=='dimension')continue;
    var ax=px+(el.x1-b.x1)*s, ay=py+(el.y1-b.y1)*s;
    var bx=px+(el.x2-b.x1)*s, by=py+(el.y2-b.y1)*s;
    var d=Math.sqrt(Math.pow(el.x2-el.x1,2)+Math.pow(el.y2-el.y1,2));
    out+='<line x1="'+n2(ax)+'" y1="'+n2(ay-OFF)+'" x2="'+n2(bx)+'" y2="'+n2(by-OFF)+'"/>';
    out+='<line x1="'+n2(ax)+'" y1="'+n2(ay)+'" x2="'+n2(ax)+'" y2="'+n2(ay-OFF-1.2)+'" stroke-dasharray="1.4 1.1"/>';
    out+='<line x1="'+n2(bx)+'" y1="'+n2(by)+'" x2="'+n2(bx)+'" y2="'+n2(by-OFF-1.2)+'" stroke-dasharray="1.4 1.1"/>';
    out+='<text x="'+n2((ax+bx)/2)+'" y="'+n2((ay+by)/2-OFF-1.3)+'" font-size="'+F+'" text-anchor="middle" fill="#0f766e" stroke="none" font-weight="600">'+esc(fmtVal(d,unit))+'</text>';
  }
  if(!out)return '';
  return '<g stroke="#0f766e" stroke-width="0.28" fill="none">'+out+'</g>';
}
function sheetViews(){
  if(S.mode==='sheet'){
    var b=boundsOf(S.sheet);
    return b?[{key:'sheet',list:S.sheet,b:b,label:'Чертёж'}]:[];
  }
  var out=[];
  var tb=boundsOf(S.projections.top),fb=boundsOf(S.projections.front),sb=boundsOf(S.projections.side);
  if(tb)out.push({key:'top',list:S.projections.top,b:tb,label:'Вид сверху'});
  if(fb)out.push({key:'front',list:S.projections.front,b:fb,label:'Фронтальная проекция'});
  if(sb)out.push({key:'side',list:S.projections.side,b:sb,label:'Вид сбоку'});
  return out;
}
function buildSheetSVG(opt){
  var PW=297,PH=210,ml=20,mo=6;
  var fx=ml,fy=mo,fw=PW-ml-mo,fh=PH-mo*2;
  var stampW=152,stampH=30,stampX=fx+fw-stampW,stampY=fy+fh-stampH;
  var titleH=10;
  var areaX=fx+7,areaY=fy+titleH,areaW=fw-14,areaH=fh-titleH-stampH-5;
  var views=sheetViews();
  if(!views.length)return null;
  var get=function(k){for(var i=0;i<views.length;i++)if(views[i].key===k)return views[i];return null};
  var T=get('top'),F=get('front')||get('sheet'),SD=get('side');
  var tw=T?T.b.w:0,th=T?T.b.h:0;
  var fwv=F?F.b.w:0,fhv=F?F.b.h:0;
  var sw=SD?SD.b.w:0,sh=SD?SD.b.h:0;
  var dims=opt.dims,LF=3.4;
  var DIMT=dims?11:0,DIMB=dims?11:0,DIML=dims?13:0,DIMR=dims?13:0;
  var LBL_TOP=LF+1.6+(dims?DIMT:0);
  var LBL_ROW=LF+1.6;
  var lwT=T?textW(T.label,LF):0, lwF=F?textW(F.label,LF):0, lwS=SD?textW(SD.label,LF):0;
  function computeLayout(gapH){
    var denomW=Math.max(tw,fwv+sw);
    var extraW=DIML+DIMR+(sw?gapH:0);
    var denomH=(T?th:0)+Math.max(fhv,sh);
    var extraH=(T?LBL_TOP+22:0)+LBL_ROW+DIMB+(T?0:DIMT);
    var fit=Math.min((areaW-extraW)/Math.max(denomW,1),(areaH-extraH)/Math.max(denomH,1));
    return{fit:fit,denomW:denomW,extraW:extraW,denomH:denomH,extraH:extraH};
  }
  var GAP_V=22,gapH=22,L1=computeLayout(gapH);
  if(!(L1.fit>0))return null;
  var s=niceScale(L1.fit);
  if(SD&&F){
    var need=lwF+lwS+5-(fwv*s+sw*s);
    if(need>gapH){
      gapH=Math.min(need,areaW*0.5);
      var L2=computeLayout(gapH);
      if(L2.fit>0)s=niceScale(L2.fit);
    }
  }
  var LC=computeLayout(gapH);
  var usedW=LC.denomW*s+LC.extraW,usedH=LC.denomH*s+LC.extraH;
  var startX=areaX+Math.max(0,(areaW-usedW)/2)+DIML;
  var startY=areaY+Math.max(0,(areaH-usedH)/2);
  var rowW=fwv*s+(sw?gapH+sw*s:0);
  var blockW=LC.denomW*s+(sw?gapH:0);
  var frontX=startX+Math.max(0,(blockW-rowW)/2);
  var y=startY,topX=0,topY=0,frontY=0,sideX=0,sideY=0;
  if(T){
    topX=frontX+(fwv-tw)*s/2;if(topX<startX)topX=startX;
    topY=y+LBL_TOP;y=topY+th*s+GAP_V;
  }else{y+=DIMT}
  frontY=y+LBL_ROW;
  sideX=frontX+fwv*s+gapH;
  sideY=frontY;
  var body='';
  function block(v,px,py,plan,align){
    if(!v)return '';
    var g='<g>';
    g+=paperShapes(v.list,v.b,px,py,s,opt.axis);
    var lx=px,anchor='start';
    if(align==='center'){lx=px+v.b.w*s/2;anchor='middle'}
    else if(align==='right'){lx=px+v.b.w*s;anchor='end'}
    var ly=py-(plan.h==='above'&&dims?(DIMT+1.4):1.9);
    g+='<text x="'+n2(lx)+'" y="'+n2(ly)+'" font-size="'+LF+'" text-anchor="'+anchor+'" fill="#5b6472" font-weight="600" letter-spacing="0.3">'+esc(v.label)+'</text>';
    if(dims)g+=paperDims(v.list,v.b,px,py,s,plan,opt.unit);
    else g+=paperUserDims(v.list,v.b,px,py,s,opt.unit);
    return g+'</g>';
  }
  if(T)body+=block(T,topX,topY,{h:'above',v:'right'},'center');
  if(F)body+=block(F,frontX,frontY,{h:'below',v:'left'},SD?'left':'center');
  if(SD)body+=block(SD,sideX,sideY,{h:'below',v:'right'},'right');
  var links='';
  if(opt.links&&(T||SD)&&F){
    var lg='<g stroke="#9aa5b1" stroke-width="0.2" stroke-dasharray="1.8 1.4" fill="none">';
    if(T){var cx=topX+tw*s/2;lg+='<line x1="'+n2(cx)+'" y1="'+n2(topY+th*s)+'" x2="'+n2(cx)+'" y2="'+n2(frontY)+'"/>'}
    if(SD){var cy=frontY+Math.min(fhv,sh)*s/2;lg+='<line x1="'+n2(frontX+fwv*s)+'" y1="'+n2(cy)+'" x2="'+n2(sideX)+'" y2="'+n2(cy)+'"/>'}
    links=lg+'</g>';
  }
  var now=new Date();
  var date=('0'+now.getDate()).slice(-2)+'.'+('0'+(now.getMonth()+1)).slice(-2)+'.'+now.getFullYear();
  var unitName=opt.unit==='cm'?'сантиметры':'миллиметры';
  var col=stampX+92;
  var stamp='<g stroke="#111827" fill="none" stroke-width="0.4">'
   +'<rect x="'+stampX+'" y="'+stampY+'" width="'+stampW+'" height="'+stampH+'"/>'
   +'<line x1="'+stampX+'" y1="'+(stampY+11)+'" x2="'+(stampX+stampW)+'" y2="'+(stampY+11)+'"/>'
   +'<line x1="'+stampX+'" y1="'+(stampY+20.5)+'" x2="'+(stampX+stampW)+'" y2="'+(stampY+20.5)+'"/>'
   +'<line x1="'+col+'" y1="'+(stampY+11)+'" x2="'+col+'" y2="'+(stampY+stampH)+'"/></g>'
   +'<text x="'+(stampX+3.5)+'" y="'+(stampY+7.4)+'" font-size="5" font-weight="700" fill="#111827">'+esc(opt.title||'Чертёж')+'</text>'
   +'<text x="'+(stampX+3.5)+'" y="'+(stampY+17.2)+'" font-size="3.2" fill="#4b5563">Выполнил: '+esc(opt.author||'—')+'</text>'
   +'<text x="'+(stampX+3.5)+'" y="'+(stampY+26.6)+'" font-size="3.2" fill="#4b5563">Единицы: '+unitName+'</text>'
   +'<text x="'+(col+3.5)+'" y="'+(stampY+17.2)+'" font-size="3.2" fill="#4b5563">Масштаб: '+scaleLabel(s)+'</text>'
   +'<text x="'+(col+3.5)+'" y="'+(stampY+26.6)+'" font-size="3.2" fill="#4b5563">Дата: '+date+'</text>';
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+PW+'mm" height="'+PH+'mm" viewBox="0 0 '+PW+' '+PH+'" preserveAspectRatio="xMidYMid meet">'
   +'<rect x="0" y="0" width="'+PW+'" height="'+PH+'" fill="#ffffff"/>'
   +'<rect x="'+fx+'" y="'+fy+'" width="'+fw+'" height="'+fh+'" fill="none" stroke="#111827" stroke-width="0.6"/>'
   +'<text x="'+(fx+4)+'" y="'+(fy+6)+'" font-size="3.8" font-weight="700" fill="#1f2937">'+esc(opt.title||'Чертёж')+'</text>'
   +'<text x="'+(fx+fw-4)+'" y="'+(fy+6)+'" font-size="3.2" fill="#6b7280" text-anchor="end">DrawForge · М '+scaleLabel(s)+'</text>'
   +links+body+stamp+'</svg>';
  return {svg:svg,scale:s};
}
function sheetOptions(){
  return{title:$('#shTitle').value||'Чертёж детали',author:$('#shAuthor').value||'',
    unit:$('#shUnit').value,dims:$('#shDims').checked,links:$('#shLinks').checked,axis:$('#shAxis').checked};
}
function refreshPreview(){
  var res=buildSheetSVG(sheetOptions());
  $('#shPreview').innerHTML=res?res.svg:'<div style="padding:20px;text-align:center;color:#9aa8b8;font-size:13px">Пока нечего показывать</div>';
}
function openSheetExport(){
  if(!sheetViews().length){toast('Сначала нарисуйте хотя бы одну фигуру');return}
  $('#shUnit').value=S.unit;$('#mSheetExp').classList.add('on');refreshPreview();
}
function closeSheetExport(){$('#mSheetExp').classList.remove('on')}
function downloadSheet(){
  var fmt=$('#shFmt').value,res=buildSheetSVG(sheetOptions());
  if(!res){toast('Нечего экспортировать');return}
  closeSheetExport();
  if(fmt==='svg'){download(res.svg,'chertezh-a4.svg','image/svg+xml');toast('SVG сохранён, масштаб '+scaleLabel(res.scale));return}
  if(fmt==='png'){svgToPng(res.svg,'chertezh-a4.png');return}
  printSVG(res.svg);
}
function svgToPng(svg,name){
  var img=new Image();
  var blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  img.onload=function(){
    var c=document.createElement('canvas');c.width=3508;c.height=2480;
    var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
    g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    var a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=name;a.click();
    toast('PNG сохранён');
  };
  img.onerror=function(){URL.revokeObjectURL(url);toast('Не получилось сделать PNG, попробуйте SVG')};
  img.src=url;
}
function printSVG(svg){
  var w=window.open('','_blank');
  if(!w){toast('Браузер заблокировал окно печати. Разрешите всплывающие окна или скачайте SVG');return}
  w.document.write('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Чертёж А4</title>'
   +'<style>@page{size:297mm 210mm;margin:0}html,body{margin:0;padding:0;background:#fff}'
   +'svg{display:block;width:297mm;height:210mm}</style></head><body>'+svg+'</body></html>');
  w.document.close();w.focus();
  setTimeout(function(){w.print()},400);
  toast('Открыл окно печати: выберите «Сохранить как PDF», размер А4, альбомная');
}

/* ============ ЭКСПОРТ ============ */
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
  var b=boundsOf(list)||{x1:-100,y1:-100,w:200,h:200},out='',i,j,el;
  for(i=0;i<list.length;i++){
    el=list[i];if(el.type==='dimension')continue;
    if(el.type==='line')out+='<line x1="'+el.x1+'" y1="'+el.y1+'" x2="'+el.x2+'" y2="'+el.y2+'"/>';
    else if(el.type==='rect')out+='<rect x="'+Math.min(el.x,el.x+el.w)+'" y="'+Math.min(el.y,el.y+el.h)+'" width="'+Math.abs(el.w)+'" height="'+Math.abs(el.h)+'"/>';
    else if(el.type==='circle')out+='<circle cx="'+el.cx+'" cy="'+el.cy+'" r="'+el.r+'"/>';
    else if(el.points&&el.points.length>1){
      var pts=[];for(j=0;j<el.points.length;j++)pts.push(el.points[j].x+','+el.points[j].y);
      out+=(el.closed||el.type==='polygon')?'<polygon points="'+pts.join(' ')+'"/>':'<polyline points="'+pts.join(' ')+'"/>';
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(b.x1-20)+' '+(b.y1-20)+' '+(b.w+40)+' '+(b.h+40)+'">'
   +'<g fill="none" stroke="#111827" stroke-width="1.4">'+out+'</g></svg>';
}
function makeDXF(list){
  var d='0\nSECTION\n2\nENTITIES\n';
  for(var i=0;i<list.length;i++){var el=list[i];
    if(el.type==='line')d+='0\nLINE\n8\n0\n10\n'+el.x1+'\n20\n'+(-el.y1)+'\n11\n'+el.x2+'\n21\n'+(-el.y2)+'\n';
    if(el.type==='circle')d+='0\nCIRCLE\n8\n0\n10\n'+el.cx+'\n20\n'+(-el.cy)+'\n40\n'+el.r+'\n';
    if(el.type==='rect')d+='0\nLWPOLYLINE\n8\n0\n90\n4\n70\n1\n10\n'+el.x+'\n20\n'+(-el.y)+'\n10\n'+(el.x+el.w)+'\n20\n'+(-el.y)+'\n10\n'+(el.x+el.w)+'\n20\n'+(-(el.y+el.h))+'\n10\n'+el.x+'\n20\n'+(-(el.y+el.h))+'\n'}
  return d+'0\nENDSEC\n0\nEOF';
}
function facet(a,b,c){return'facet normal 0 0 0\n outer loop\n  vertex '+n2(a[0])+' '+n2(a[1])+' '+n2(a[2])+'\n  vertex '+n2(b[0])+' '+n2(b[1])+' '+n2(b[2])+'\n  vertex '+n2(c[0])+' '+n2(c[1])+' '+n2(c[2])+'\n endloop\nendfacet\n'}
function makeSTL(){
  var depth=Math.max(1,parseFloat($('#depthVal').value)||40);
  var parts=buildParts(depth),s='solid drawforge\n',i,k;
  for(i=0;i<parts.length;i++){
    var p=parts[i],o=p.outer;
    for(k=0;k<o.length;k++){
      var a=o[k],b=o[(k+1)%o.length];
      s+=facet([a.x,a.y,p.z0],[b.x,b.y,p.z0],[b.x,b.y,p.z1]);
      s+=facet([a.x,a.y,p.z0],[b.x,b.y,p.z1],[a.x,a.y,p.z1]);
    }
    for(k=1;k<o.length-1;k++){
      s+=facet([o[0].x,o[0].y,p.z0],[o[k].x,o[k].y,p.z0],[o[k+1].x,o[k+1].y,p.z0]);
      s+=facet([o[0].x,o[0].y,p.z1],[o[k+1].x,o[k+1].y,p.z1],[o[k].x,o[k].y,p.z1]);
    }
    for(var hI=0;hI<p.holes.length;hI++){
      var h=p.holes[hI],ring=h.ring,bot=h.through?p.z0:Math.max(p.z0,p.z1-h.depth);
      for(k=0;k<ring.length;k++){
        var a2=ring[k],b2=ring[(k+1)%ring.length];
        s+=facet([a2.x,a2.y,bot],[b2.x,b2.y,bot],[b2.x,b2.y,p.z1]);
        s+=facet([a2.x,a2.y,bot],[b2.x,b2.y,p.z1],[a2.x,a2.y,p.z1]);
      }
    }
  }
  return s+'endsolid drawforge';
}
function exportPNG(list){
  var t=document.createElement('canvas');t.width=1600;t.height=1200;
  var g=t.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1600,1200);
  var b=boundsOf(list)||{x1:-100,y1:-100,x2:100,y2:100};
  var sc=Math.min(1400/Math.max(1,b.x2-b.x1),1000/Math.max(1,b.y2-b.y1));
  g.translate(800,600);g.scale(sc,sc);g.translate(-(b.x1+b.x2)/2,-(b.y1+b.y2)/2);
  g.strokeStyle='#000';g.lineWidth=1.5/sc;
  for(var i=0;i<list.length;i++){var el=list[i],j;
    if(el.type==='dimension')continue;
    if(el.type==='line'){g.beginPath();g.moveTo(el.x1,el.y1);g.lineTo(el.x2,el.y2);g.stroke()}
    if(el.type==='rect'){g.beginPath();g.rect(el.x,el.y,el.w,el.h);g.stroke()}
    if(el.type==='circle'){g.beginPath();g.arc(el.cx,el.cy,el.r,0,Math.PI*2);g.stroke()}
    if(el.points&&el.points.length>1){g.beginPath();g.moveTo(el.points[0].x,el.points[0].y);
      for(j=1;j<el.points.length;j++)g.lineTo(el.points[j].x,el.points[j].y);
      if(el.closed||el.type==='polygon')g.closePath();g.stroke()}}
  var link=document.createElement('a');link.href=t.toDataURL('image/png');link.download='drawforge.png';link.click();
}

/* ============ ОБУЧЕНИЕ ============ */
var TOUR={active:false,i:0,steps:[]};
var TOUR_STEPS=[
  {sel:null,title:'Знакомимся с программой',
   text:'За минуту покажу, где что находится. Листайте кнопками или стрелками, выйти можно в любой момент.',
   tip:'Всё обучение занимает меньше минуты.'},
  {sel:'#modeGroup',title:'Два способа работы',
   text:'«Один лист» это свободный чертёж. «По проекциям» это работа по правилам: отдельно вид спереди, сверху и сбоку.',mode:'proj'},
  {sel:'#toolsBar',title:'Инструменты',
   text:'Линия, прямоугольник, окружность, отверстие, ломаная и контур. Ниже размер и удаление.',
   tip:'Клавиши: L линия, R прямоугольник, C окружность, O отверстие, V выбор.'},
  {sel:'#stage',title:'Точное черчение',
   text:'Начните тянуть фигуру и просто наберите размер на клавиатуре: «100 50» для прямоугольника, «d40» для диаметра. Enter создаёт фигуру ровно такой.',
   tool:'rect',tip:'Курсор прилипает к углам, центрам и серединам линий.'},
  {sel:'#tOrtho',title:'Ровные линии',
   text:'Ортогональный режим держит линии строго под 0, 45 и 90 градусов. Можно просто зажать Shift.'},
  {sel:'#rpanel',title:'Размеры и роль в 3D',
   text:'Выберите фигуру: справа можно вписать точные числа, выбрать тип линии и указать, чем фигура будет в 3D — телом, отверстием или выступом.'},
  {sel:'#btnDims',title:'Разметка размеров',
   text:'Одна кнопка проставляет размеры на всём чертеже. Рядом переключаются миллиметры и сантиметры.'},
  {sel:'#btnComb',title:'Показать вместе',
   text:'Собирает все проекции на одном листе: вид сверху над фронтальной, вид сбоку справа.',mode:'proj'},
  {sel:'#btnSheet',title:'Скачать чертёж',
   text:'Лист А4 с рамкой, штампом и масштабом. Перед скачиванием видно предпросмотр.'},
  {sel:'#btn3d',title:'Создать 3D',
   text:'Откроется таблица всех элементов: у каждого можно выбрать роль и свою глубину. Окружность внутри тела становится настоящим отверстием.',
   tip:'Отверстие может быть сквозным или на заданную глубину.'},
  {sel:'#btnHelp',title:'Готово',
   text:'Обучение всегда можно запустить снова этой кнопкой. Попробуйте: прямоугольник, внутри окружность, потом «Создать 3D».',
   tip:'Порядок: начертить, задать размеры, выбрать роли, создать 3D.'}
];
function tourAvailable(step){
  if(!step.sel)return true;
  var el=document.querySelector(step.sel);if(!el)return false;
  var r=el.getBoundingClientRect();return r.width>0&&r.height>0;
}
function startTour(){
  closeCombined();if(S.is3D)closeViewer();
  $('#mExp').classList.remove('on');$('#m3d').classList.remove('on');$('#mSheetExp').classList.remove('on');
  $('#welcome').classList.add('off');
  TOUR.active=true;TOUR.i=0;TOUR.steps=TOUR_STEPS;
  $('#tourDim').classList.add('on');$('#tourCard').classList.add('on');$('#tourSkip').classList.add('on');
  renderDots();showStep(0);
}
function endTour(done){
  TOUR.active=false;
  $('#tourDim').classList.remove('on');$('#tourHole').classList.remove('on');
  $('#tourCard').classList.remove('on');$('#tourSkip').classList.remove('on');
  localStorage.setItem('df16_tour','1');
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
  $('#tourTitle').textContent=st.title;$('#tourText').textContent=st.text;
  var tip=$('#tourTip');
  if(st.tip){tip.textContent=st.tip;tip.style.display=''}else tip.style.display='none';
  $('#tourPrev').style.display=TOUR.i===0?'none':'';
  $('#tourNext').textContent=TOUR.i===TOUR.steps.length-1?'Начать работу':'Далее';
  renderDots();requestAnimationFrame(placeTour);
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
    card.style.left=Math.round((vw-cw)/2)+'px';card.style.top=Math.round((vh-chh)/2)+'px';return;
  }
  var r=target.getBoundingClientRect(),pad=8;
  var hx=Math.max(4,r.left-pad),hy=Math.max(4,r.top-pad);
  var hw=Math.min(vw-hx-4,r.width+pad*2),hh=Math.min(vh-hy-4,r.height+pad*2);
  hole.style.left=hx+'px';hole.style.top=hy+'px';hole.style.width=hw+'px';hole.style.height=hh+'px';
  hole.classList.add('on');
  var left,top,below=vh-(hy+hh),right=vw-(hx+hw);
  if(below>chh+m*2){top=hy+hh+m;left=hx+hw/2-cw/2}
  else if(right>cw+m*2){left=hx+hw+m;top=hy+hh/2-chh/2}
  else if(hx>cw+m*2){left=hx-cw-m;top=hy+hh/2-chh/2}
  else{left=hx+hw/2-cw/2;top=Math.max(m,hy-chh-m)}
  left=Math.max(m,Math.min(vw-cw-m,left));top=Math.max(m,Math.min(vh-chh-m,top));
  card.style.left=Math.round(left)+'px';card.style.top=Math.round(top)+'px';
}
function tourNext(){if(TOUR.i>=TOUR.steps.length-1){endTour(true);return}showStep(TOUR.i+1)}
function tourPrev(){showStep(TOUR.i-1)}

/* ============ КЛАВИАТУРА ============ */
window.addEventListener('keydown',function(e){if(e.key==='Shift')S.shift=true});
window.addEventListener('keyup',function(e){if(e.key==='Shift')S.shift=false});
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
    if(e.key==='1')setView('front');if(e.key==='2')setView('top');
    if(e.key==='3')setView('side');if(e.key==='0')setView('iso');
    return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveLocal();toast('Сохранено');return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateSel();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){var el=selEl();if(el){S.clip=copy(el);toast('Скопировано')}return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(S.clip){var c=copy(S.clip);delete c.id;shift(c,20,20);add(c);toast('Вставлено')}return}
  if(e.key==='Delete'||e.key==='Backspace'){removeSelected();return}
  if(e.key.indexOf('Arrow')===0&&S.selected.length){
    e.preventDefault();
    var st=e.shiftKey?1:S.grid,dx=0,dy=0;
    if(e.key==='ArrowLeft')dx=-st;if(e.key==='ArrowRight')dx=st;
    if(e.key==='ArrowUp')dy=-st;if(e.key==='ArrowDown')dy=st;
    var s2=selEl();if(s2){shift(s2,dx,dy);pushHistory();paint();refreshInspector()}
    return}
  if(e.key==='Escape'){
    if($('#mSheetExp').classList.contains('on')){closeSheetExport();return}
    if($('#m3d').classList.contains('on')){close3DModal();return}
    if($('#combView').classList.contains('on')){closeCombined();return}
    S.drawing=null;hideQuick();S.selected=[];refreshInspector();paint();return}
  var map={v:'select',h:'pan',l:'line',r:'rect',c:'circle',o:'hole',p:'polyline',g:'polygon',d:'dimension',e:'erase'};
  var k=e.key.toLowerCase();
  if(map[k]&&!e.ctrlKey&&!e.metaKey)setTool(map[k]);
});
document.addEventListener('keypress',function(e){
  if(!S.drawing)return;
  var tag=document.activeElement?document.activeElement.tagName:'';
  if(tag==='INPUT')return;
  if(/[0-9]/.test(e.key)){
    var q=$('#quickInp');
    if($('#quick').classList.contains('on')){q.value=e.key;q.focus()}
  }
});

/* ============ ХРАНЕНИЕ ============ */
function saveLocal(){localStorage.setItem('df16',JSON.stringify({s:S.sheet,p:S.projections,mode:S.mode,vp:S.viewport,nid:S.nextId,unit:S.unit,dims:S.autoDims}))}
function loadLocal(){
  var raw=localStorage.getItem('df16')||localStorage.getItem('df15');if(!raw)return;
  try{var d=JSON.parse(raw);
    S.sheet=d.s||[];S.projections=d.p||S.projections;S.mode=d.mode||'sheet';
    S.viewport=d.vp||S.viewport;S.nextId=d.nid||1;S.unit=d.unit||'mm';S.autoDims=!!d.dims}catch(err){}
}
setInterval(saveLocal,8000);

loadLocal();pushHistory();
$('#mSheet').classList.toggle('on',S.mode==='sheet');
$('#mProj').classList.toggle('on',S.mode==='proj');
$('#ptabs').classList.toggle('on',S.mode==='proj');
$('#btnComb').style.display=S.mode==='proj'?'':'none';
$('#btnDims').classList.toggle('on',S.autoDims);
$('#btnCombDims').classList.toggle('on',S.autoDims);
$('#btnUnit').textContent=S.unit==='mm'?'мм':'см';
$('#sUnit').textContent=S.unit==='mm'?'мм':'см';
markView('iso');refreshInspector();resizeAll();
if(S.sheet.length||S.projections.front.length||S.projections.top.length||S.projections.side.length)$('#welcome').classList.add('off');
