"use strict";const assert=require('node:assert/strict'),C=require('../modules/cutout-operations.js');
function inside(p,poly){var yes=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var a=poly[i],b=poly[j];if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))yes=!yes}return yes}
var body={id:'body',type:'rect',x:0,y:0,w:100,h:50,role:'body'},groove={id:'g',type:'rect',x:20,y:10,w:30,h:8,operation:'groove',depth:6},cut={id:'c',type:'rect',x:60,y:10,w:20,h:20,operation:'cutout',through:true};
var ops=C.collect([body,groove,cut],inside);assert.equal(ops.length,2);assert.equal(ops[0].hostId,'body');assert.equal(ops[0].depth,6);assert.equal(ops[0].through,false);assert.equal(ops[1].through,true);
var outside={type:'rect',x:120,y:10,w:20,h:20,operation:'groove'};assert.equal(C.collect([body,outside],inside)[0].valid,false);console.log('✓ isolated cutout operation tests passed');
