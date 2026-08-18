"use strict";
const assert=require('node:assert/strict');
const V=require('../geometry-validation.js');
let passed=0;
function test(name,fn){try{fn();passed++;console.log('✓',name)}catch(error){console.error('✗',name);throw error}}
function line(x1,y1,x2,y2,id){return{type:'line',style:'solid',x1,y1,x2,y2,id}}
function rect(x,y,w,h,id){return{type:'rect',x,y,w,h,id}}
function square(size=10){return[line(0,0,size,0,'a'),line(size,0,size,size,'b'),line(size,size,0,size,'c'),line(0,size,0,0,'d')]}
function codes(issues){return issues.map(x=>x.code)}

test('empty drawing has no contour errors',()=>assert.deepEqual(V.validateContours([]),[]));
test('closed square made of lines is valid',()=>assert.deepEqual(V.validateContours(square()),[]));
test('open square reports open contour',()=>assert.ok(codes(V.validateContours(square().slice(0,3))).includes('open_contour')));
test('single line reports too few edges',()=>assert.ok(codes(V.validateContours([line(0,0,10,0)])).includes('too_few_edges')));
test('near endpoints join inside tolerance',()=>{const s=square();s[1].x1=10.005;assert.equal(V.validateContours(s,{tolerance:.01}).length,0)});
test('near endpoints remain open outside tolerance',()=>{const s=square();s[1].x1=10.02;assert.ok(codes(V.validateContours(s,{tolerance:.01})).includes('open_contour'))});
test('branching line graph is rejected',()=>{const s=square();s.push(line(0,0,-5,0,'branch'));assert.ok(codes(V.validateContours(s)).includes('branching_contour'))});
test('open polyline reports both endpoints',()=>{const i=V.validateContours([{id:'p',type:'polyline',closed:false,points:[{x:0,y:0},{x:5,y:5},{x:10,y:0}]}])[0];assert.equal(i.code,'open_polyline');assert.equal(i.points.length,2)});
test('closed polygon is not reported as open',()=>assert.equal(V.validateContours([{type:'polygon',points:[{x:0,y:0},{x:10,y:0},{x:0,y:10}]}]).length,0));
test('bow-tie polygon reports self intersection',()=>{const bow={id:'bow',type:'polygon',points:[{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]};assert.ok(codes(V.validateIntersections([bow])).includes('self_intersection'))});
test('rectangle corners are not false intersections',()=>assert.deepEqual(V.validateIntersections([rect(0,0,10,10)]),[]));
test('two crossing lines report intersection point',()=>{const i=V.validateIntersections([line(0,0,10,10,'x'),line(0,10,10,0,'y')])[0];assert.equal(i.code,'self_intersection');assert.equal(i.points[0].x,5);assert.equal(i.points[0].y,5)});
test('shared endpoints are allowed',()=>assert.deepEqual(V.validateIntersections([line(0,0,10,0),line(10,0,10,10)]),[]));
test('dashed construction lines are ignored',()=>assert.deepEqual(V.validateContours([{type:'line',style:'dashed',x1:0,y1:0,x2:10,y2:0}]),[]));
test('bounds supports negative rectangle dimensions',()=>assert.deepEqual(V.bounds([rect(10,20,-30,-40)]),{w:30,h:40,x1:-20,y1:-20,x2:10,y2:20}));
test('bounds includes circle diameter',()=>assert.deepEqual(V.bounds([{type:'circle',cx:5,cy:7,r:3}]),{w:6,h:6,x1:2,y1:4,x2:8,y2:10}));
test('missing front projection is rejected',()=>assert.equal(V.validateProjections({front:[],top:[],side:[]})[0].code,'missing_front'));
test('front-only projection requests a depth view',()=>assert.ok(codes(V.validateProjections({front:[rect(0,0,100,50)],top:[],side:[]})).includes('missing_depth_view')));
test('consistent three projections are valid',()=>{const p={front:[rect(0,0,100,50)],top:[rect(0,0,100,30)],side:[rect(0,0,30,50)]};assert.deepEqual(V.validateProjections(p),[])});
test('front/top width mismatch is rejected',()=>{const p={front:[rect(0,0,100,50)],top:[rect(0,0,90,30)],side:[rect(0,0,30,50)]};assert.ok(codes(V.validateProjections(p)).includes('projection_mismatch'))});
test('front/side height mismatch is rejected',()=>{const p={front:[rect(0,0,100,50)],top:[rect(0,0,100,30)],side:[rect(0,0,30,45)]};assert.ok(codes(V.validateProjections(p)).includes('projection_mismatch'))});
test('top/side depth mismatch is rejected',()=>{const p={front:[rect(0,0,100,50)],top:[rect(0,0,100,30)],side:[rect(0,0,25,50)]};assert.ok(codes(V.validateProjections(p)).includes('projection_mismatch'))});
test('dimension tolerance accepts small mismatch',()=>{const p={front:[rect(0,0,100,50)],top:[rect(0,0,99.5,30)],side:[rect(0,0,30,50)]};assert.deepEqual(V.validateProjections(p,{dimensionTolerance:1}),[])});
test('summary is positive for no issues',()=>assert.equal(V.summary([]).ok,true));
test('summary counts mixed issue types',()=>{const s=V.summary([{code:'open_contour',message:'a'},{code:'self_intersection',message:'b'},{code:'projection_mismatch',message:'c'}]);assert.equal(s.ok,false);assert.match(s.message,/разрывов: 1/);assert.match(s.message,/пересечений: 1/);assert.match(s.message,/ошибок проекций: 1/)});
console.log(`\n${passed} geometry tests passed`);
