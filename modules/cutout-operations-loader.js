"use strict";
(function(){
 var scripts=['modules/cutout-operations.js','modules/cutout-operations-ui.js'];
 scripts.forEach(function(src){if(document.querySelector('script[src="'+src+'"]'))return;var s=document.createElement('script');s.src=src;document.body.appendChild(s)});
})();
