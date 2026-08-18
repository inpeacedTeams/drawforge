"use strict";const assert=require('node:assert/strict'),L=require('../projection-links.js');
function rect(w,h){return{type:'rect',x:0,y:0,w,h}}function bounds(list){let e=list[0];return{x1:e.x,y1:e.y,x2:e.x+e.w,y2:e.y+e.h,w:e.w,h:e.h}}
let p={front:[rect(100,50)],top:[rect(80,30)],side:[rect(20,40)]};let changed=L.sync(p,'front',{w:100,h:50},bounds);assert.deepEqual(changed,['top','side']);assert.equal(p.top[0].w,100);assert.equal(p.side[0].h,50);
p={front:[rect(100,50)],top:[rect(100,35)],side:[rect(20,50)]};L.sync(p,'top',{w:100,h:35},bounds);assert.equal(p.side[0].w,35);
p={front:[rect(100,50)],top:[rect(100,35)],side:[rect(35,60)]};L.sync(p,'side',{w:35,h:60},bounds);assert.equal(p.front[0].h,60);assert.equal(p.top[0].h,35);
console.log('✓ linked projection dimension tests passed');
