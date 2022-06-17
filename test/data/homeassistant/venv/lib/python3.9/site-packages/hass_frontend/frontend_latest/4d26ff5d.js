"use strict";(self.webpackChunkhome_assistant_frontend=self.webpackChunkhome_assistant_frontend||[]).push([[46277],{63864:(e,t,r)=>{r.d(t,{I:()=>i});const i=(e,t,r,i)=>{const[n,o,s]=e.split(".",3);return Number(n)>t||Number(n)===t&&(void 0===i?Number(o)>=r:Number(o)>r)||void 0!==i&&Number(n)===t&&Number(o)===r&&Number(s)>=i}},44583:(e,t,r)=>{r.a(e,(async e=>{r.d(t,{o0:()=>s,E8:()=>l});var i=r(14516),n=r(65810),o=r(54121);o.Xp&&await o.Xp;const s=(e,t)=>a(t).format(e),a=(0,i.Z)((e=>new Intl.DateTimeFormat("en"!==e.language||(0,n.y)(e)?e.language:"en-u-hc-h23",{year:"numeric",month:"long",day:"numeric",hour:(0,n.y)(e)?"numeric":"2-digit",minute:"2-digit",hour12:(0,n.y)(e)}))),l=(e,t)=>c(t).format(e),c=(0,i.Z)((e=>new Intl.DateTimeFormat("en"!==e.language||(0,n.y)(e)?e.language:"en-u-hc-h23",{year:"numeric",month:"long",day:"numeric",hour:(0,n.y)(e)?"numeric":"2-digit",minute:"2-digit",second:"2-digit",hour12:(0,n.y)(e)})));(0,i.Z)((e=>new Intl.DateTimeFormat("en"!==e.language||(0,n.y)(e)?e.language:"en-u-hc-h23",{year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit",hour12:(0,n.y)(e)})));e()}),1)},65810:(e,t,r)=>{r.d(t,{y:()=>o});var i=r(14516),n=r(66477);const o=(0,i.Z)((e=>{if(e.time_format===n.zt.language||e.time_format===n.zt.system){const t=e.time_format===n.zt.language?e.language:void 0,r=(new Date).toLocaleString(t);return r.includes("AM")||r.includes("PM")}return e.time_format===n.zt.am_pm}))},25516:(e,t,r)=>{r.d(t,{i:()=>i});const i=e=>t=>({kind:"method",placement:"prototype",key:t.key,descriptor:{set(e){this[`__${String(t.key)}`]=e},get(){return this[`__${String(t.key)}`]},enumerable:!0,configurable:!0},finisher(r){const i=r.prototype.connectedCallback;r.prototype.connectedCallback=function(){if(i.call(this),this[t.key]){const r=this.renderRoot.querySelector(e);if(!r)return;r.scrollTop=this[t.key]}}}})},50577:(e,t,r)=>{r.d(t,{v:()=>i});const i=async e=>{if(navigator.clipboard)try{return void await navigator.clipboard.writeText(e)}catch{}const t=document.createElement("textarea");t.value=e,document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}},60893:(e,t,r)=>{r.d(t,{T:()=>i});const i=(e,t,r)=>{let i;const n=async()=>{try{await t(e)}finally{i=setTimeout((()=>n()),r)}};return n(),()=>clearTimeout(i)}},45036:(e,t,r)=>{var i=r(61092),n=r(96762),o=r(37500),s=r(33310);function a(){a=function(){return e};var e={elementsDefinitionOrder:[["method"],["field"]],initializeInstanceElements:function(e,t){["method","field"].forEach((function(r){t.forEach((function(t){t.kind===r&&"own"===t.placement&&this.defineClassElement(e,t)}),this)}),this)},initializeClassElements:function(e,t){var r=e.prototype;["method","field"].forEach((function(i){t.forEach((function(t){var n=t.placement;if(t.kind===i&&("static"===n||"prototype"===n)){var o="static"===n?e:r;this.defineClassElement(o,t)}}),this)}),this)},defineClassElement:function(e,t){var r=t.descriptor;if("field"===t.kind){var i=t.initializer;r={enumerable:r.enumerable,writable:r.writable,configurable:r.configurable,value:void 0===i?void 0:i.call(e)}}Object.defineProperty(e,t.key,r)},decorateClass:function(e,t){var r=[],i=[],n={static:[],prototype:[],own:[]};if(e.forEach((function(e){this.addElementPlacement(e,n)}),this),e.forEach((function(e){if(!d(e))return r.push(e);var t=this.decorateElement(e,n);r.push(t.element),r.push.apply(r,t.extras),i.push.apply(i,t.finishers)}),this),!t)return{elements:r,finishers:i};var o=this.decorateConstructor(r,t);return i.push.apply(i,o.finishers),o.finishers=i,o},addElementPlacement:function(e,t,r){var i=t[e.placement];if(!r&&-1!==i.indexOf(e.key))throw new TypeError("Duplicated element ("+e.key+")");i.push(e.key)},decorateElement:function(e,t){for(var r=[],i=[],n=e.decorators,o=n.length-1;o>=0;o--){var s=t[e.placement];s.splice(s.indexOf(e.key),1);var a=this.fromElementDescriptor(e),l=this.toElementFinisherExtras((0,n[o])(a)||a);e=l.element,this.addElementPlacement(e,t),l.finisher&&i.push(l.finisher);var c=l.extras;if(c){for(var d=0;d<c.length;d++)this.addElementPlacement(c[d],t);r.push.apply(r,c)}}return{element:e,finishers:i,extras:r}},decorateConstructor:function(e,t){for(var r=[],i=t.length-1;i>=0;i--){var n=this.fromClassDescriptor(e),o=this.toClassDescriptor((0,t[i])(n)||n);if(void 0!==o.finisher&&r.push(o.finisher),void 0!==o.elements){e=o.elements;for(var s=0;s<e.length-1;s++)for(var a=s+1;a<e.length;a++)if(e[s].key===e[a].key&&e[s].placement===e[a].placement)throw new TypeError("Duplicated element ("+e[s].key+")")}}return{elements:e,finishers:r}},fromElementDescriptor:function(e){var t={kind:e.kind,key:e.key,placement:e.placement,descriptor:e.descriptor};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),"field"===e.kind&&(t.initializer=e.initializer),t},toElementDescriptors:function(e){var t;if(void 0!==e)return(t=e,function(e){if(Array.isArray(e))return e}(t)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(t)||function(e,t){if(e){if("string"==typeof e)return h(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?h(e,t):void 0}}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).map((function(e){var t=this.toElementDescriptor(e);return this.disallowProperty(e,"finisher","An element descriptor"),this.disallowProperty(e,"extras","An element descriptor"),t}),this)},toElementDescriptor:function(e){var t=String(e.kind);if("method"!==t&&"field"!==t)throw new TypeError('An element descriptor\'s .kind property must be either "method" or "field", but a decorator created an element descriptor with .kind "'+t+'"');var r=f(e.key),i=String(e.placement);if("static"!==i&&"prototype"!==i&&"own"!==i)throw new TypeError('An element descriptor\'s .placement property must be one of "static", "prototype" or "own", but a decorator created an element descriptor with .placement "'+i+'"');var n=e.descriptor;this.disallowProperty(e,"elements","An element descriptor");var o={kind:t,key:r,placement:i,descriptor:Object.assign({},n)};return"field"!==t?this.disallowProperty(e,"initializer","A method descriptor"):(this.disallowProperty(n,"get","The property descriptor of a field descriptor"),this.disallowProperty(n,"set","The property descriptor of a field descriptor"),this.disallowProperty(n,"value","The property descriptor of a field descriptor"),o.initializer=e.initializer),o},toElementFinisherExtras:function(e){return{element:this.toElementDescriptor(e),finisher:u(e,"finisher"),extras:this.toElementDescriptors(e.extras)}},fromClassDescriptor:function(e){var t={kind:"class",elements:e.map(this.fromElementDescriptor,this)};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),t},toClassDescriptor:function(e){var t=String(e.kind);if("class"!==t)throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator created a class descriptor with .kind "'+t+'"');this.disallowProperty(e,"key","A class descriptor"),this.disallowProperty(e,"placement","A class descriptor"),this.disallowProperty(e,"descriptor","A class descriptor"),this.disallowProperty(e,"initializer","A class descriptor"),this.disallowProperty(e,"extras","A class descriptor");var r=u(e,"finisher");return{elements:this.toElementDescriptors(e.elements),finisher:r}},runClassFinishers:function(e,t){for(var r=0;r<t.length;r++){var i=(0,t[r])(e);if(void 0!==i){if("function"!=typeof i)throw new TypeError("Finishers must return a constructor.");e=i}}return e},disallowProperty:function(e,t,r){if(void 0!==e[t])throw new TypeError(r+" can't have a ."+t+" property.")}};return e}function l(e){var t,r=f(e.key);"method"===e.kind?t={value:e.value,writable:!0,configurable:!0,enumerable:!1}:"get"===e.kind?t={get:e.value,configurable:!0,enumerable:!1}:"set"===e.kind?t={set:e.value,configurable:!0,enumerable:!1}:"field"===e.kind&&(t={configurable:!0,writable:!0,enumerable:!0});var i={kind:"field"===e.kind?"field":"method",key:r,placement:e.static?"static":"field"===e.kind?"own":"prototype",descriptor:t};return e.decorators&&(i.decorators=e.decorators),"field"===e.kind&&(i.initializer=e.value),i}function c(e,t){void 0!==e.descriptor.get?t.descriptor.get=e.descriptor.get:t.descriptor.set=e.descriptor.set}function d(e){return e.decorators&&e.decorators.length}function p(e){return void 0!==e&&!(void 0===e.value&&void 0===e.writable)}function u(e,t){var r=e[t];if(void 0!==r&&"function"!=typeof r)throw new TypeError("Expected '"+t+"' to be a function");return r}function f(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function h(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}function m(e,t,r){return m="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(e,t,r){var i=function(e,t){for(;!Object.prototype.hasOwnProperty.call(e,t)&&null!==(e=y(e)););return e}(e,t);if(i){var n=Object.getOwnPropertyDescriptor(i,t);return n.get?n.get.call(r):n.value}},m(e,t,r||e)}function y(e){return y=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},y(e)}!function(e,t,r,i){var n=a();if(i)for(var o=0;o<i.length;o++)n=i[o](n);var s=t((function(e){n.initializeInstanceElements(e,u.elements)}),r),u=n.decorateClass(function(e){for(var t=[],r=function(e){return"method"===e.kind&&e.key===o.key&&e.placement===o.placement},i=0;i<e.length;i++){var n,o=e[i];if("method"===o.kind&&(n=t.find(r)))if(p(o.descriptor)||p(n.descriptor)){if(d(o)||d(n))throw new ReferenceError("Duplicated methods ("+o.key+") can't be decorated.");n.descriptor=o.descriptor}else{if(d(o)){if(d(n))throw new ReferenceError("Decorators can't be placed on different accessors with for the same property ("+o.key+").");n.decorators=o.decorators}c(o,n)}else t.push(o)}return t}(s.d.map(l)),e);n.initializeClassElements(s.F,u.elements),n.runClassFinishers(s.F,u.finishers)}([(0,s.Mo)("ha-clickable-list-item")],(function(e,t){class r extends t{constructor(...t){super(...t),e(this)}}return{F:r,d:[{kind:"field",decorators:[(0,s.Cb)()],key:"href",value:void 0},{kind:"field",decorators:[(0,s.Cb)({type:Boolean})],key:"disableHref",value:()=>!1},{kind:"field",decorators:[(0,s.Cb)({type:Boolean,reflect:!0})],key:"rtl",value:()=>!1},{kind:"field",decorators:[(0,s.Cb)({type:Boolean,reflect:!0})],key:"openNewTab",value:()=>!1},{kind:"field",decorators:[(0,s.IO)("a")],key:"_anchor",value:void 0},{kind:"method",key:"render",value:function(){const e=m(y(r.prototype),"render",this).call(this),t=this.href||"";return o.dy`${this.disableHref?o.dy`<a aria-role="option">${e}</a>`:o.dy`<a
          aria-role="option"
          target=${this.openNewTab?"_blank":""}
          href=${t}
          >${e}</a
        >`}`}},{kind:"method",key:"firstUpdated",value:function(){m(y(r.prototype),"firstUpdated",this).call(this),this.addEventListener("keydown",(e=>{"Enter"!==e.key&&" "!==e.key||this._anchor.click()}))}},{kind:"get",static:!0,key:"styles",value:function(){return[n.W,o.iv`
        :host {
          padding-left: 0px;
          padding-right: 0px;
        }
        :host([graphic="avatar"]:not([twoLine])),
        :host([graphic="icon"]:not([twoLine])) {
          height: 48px;
        }
        a {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: var(--mdc-list-side-padding, 20px);
          padding-right: var(--mdc-list-side-padding, 20px);
          overflow: hidden;
        }
        span.material-icons:first-of-type {
          margin-inline-start: 0px !important;
          margin-inline-end: var(
            --mdc-list-item-graphic-margin,
            16px
          ) !important;
          direction: var(--direction);
        }
        span.material-icons:last-of-type {
          margin-inline-start: auto !important;
          margin-inline-end: 0px !important;
          direction: var(--direction);
        }
      `]}}]}}),i.K)},41682:(e,t,r)=>{r.d(t,{rY:()=>n,js:()=>o,yz:()=>a,yd:()=>l});var i=r(63864);const n=e=>e.data,o=e=>"object"==typeof e?"object"==typeof e.body?e.body.message||"Unknown error, see supervisor logs":e.body||e.message||"Unknown error, see supervisor logs":e,s=new Set([502,503,504]),a=e=>!!(e&&e.status_code&&s.has(e.status_code))||!(!e||!e.message||!e.message.includes("ERR_CONNECTION_CLOSED")&&!e.message.includes("ERR_CONNECTION_RESET")),l=async(e,t)=>(0,i.I)(e.config.version,2021,2,4)?e.callWS({type:"supervisor/api",endpoint:`/${t}/stats`,method:"get"}):n(await e.callApi("GET",`hassio/${t}/stats`))},28257:(e,t,r)=>{r.d(t,{p:()=>o});var i=r(63864),n=r(41682);const o=async e=>(0,i.I)(e.config.version,2021,2,4)?e.callWS({type:"supervisor/api",endpoint:"/resolution/info",method:"get"}):(0,n.rY)(await e.callApi("GET","hassio/resolution/info"))},56799:(e,t,r)=>{r.d(t,{V:()=>i});const i=(e,t)=>{let r={};const i=e.connection.subscribeMessage((e=>{if("initial"===e.type)return r=e.data,void t(r);"finish"!==e.type?(r={...r,[e.domain]:{...r[e.domain],info:{...r[e.domain].info,[e.key]:e.success?e.data:{error:!0,value:e.error.msg}}}},t(r)):i.then((e=>e()))}),{type:"system_health/info"});return i}},26765:(e,t,r)=>{r.d(t,{Ys:()=>s,g7:()=>a,D9:()=>l});var i=r(47181);const n=()=>Promise.all([r.e(85084),r.e(1281)]).then(r.bind(r,1281)),o=(e,t,r)=>new Promise((o=>{const s=t.cancel,a=t.confirm;(0,i.B)(e,"show-dialog",{dialogTag:"dialog-box",dialogImport:n,dialogParams:{...t,...r,cancel:()=>{o(!(null==r||!r.prompt)&&null),s&&s()},confirm:e=>{o(null==r||!r.prompt||e),a&&a(e)}}})})),s=(e,t)=>o(e,t),a=(e,t)=>o(e,t,{confirmation:!0}),l=(e,t)=>o(e,t,{prompt:!0})},60010:(e,t,r)=>{var i=r(37500),n=r(33310),o=r(25516);r(2315),r(48932);function s(){s=function(){return e};var e={elementsDefinitionOrder:[["method"],["field"]],initializeInstanceElements:function(e,t){["method","field"].forEach((function(r){t.forEach((function(t){t.kind===r&&"own"===t.placement&&this.defineClassElement(e,t)}),this)}),this)},initializeClassElements:function(e,t){var r=e.prototype;["method","field"].forEach((function(i){t.forEach((function(t){var n=t.placement;if(t.kind===i&&("static"===n||"prototype"===n)){var o="static"===n?e:r;this.defineClassElement(o,t)}}),this)}),this)},defineClassElement:function(e,t){var r=t.descriptor;if("field"===t.kind){var i=t.initializer;r={enumerable:r.enumerable,writable:r.writable,configurable:r.configurable,value:void 0===i?void 0:i.call(e)}}Object.defineProperty(e,t.key,r)},decorateClass:function(e,t){var r=[],i=[],n={static:[],prototype:[],own:[]};if(e.forEach((function(e){this.addElementPlacement(e,n)}),this),e.forEach((function(e){if(!c(e))return r.push(e);var t=this.decorateElement(e,n);r.push(t.element),r.push.apply(r,t.extras),i.push.apply(i,t.finishers)}),this),!t)return{elements:r,finishers:i};var o=this.decorateConstructor(r,t);return i.push.apply(i,o.finishers),o.finishers=i,o},addElementPlacement:function(e,t,r){var i=t[e.placement];if(!r&&-1!==i.indexOf(e.key))throw new TypeError("Duplicated element ("+e.key+")");i.push(e.key)},decorateElement:function(e,t){for(var r=[],i=[],n=e.decorators,o=n.length-1;o>=0;o--){var s=t[e.placement];s.splice(s.indexOf(e.key),1);var a=this.fromElementDescriptor(e),l=this.toElementFinisherExtras((0,n[o])(a)||a);e=l.element,this.addElementPlacement(e,t),l.finisher&&i.push(l.finisher);var c=l.extras;if(c){for(var d=0;d<c.length;d++)this.addElementPlacement(c[d],t);r.push.apply(r,c)}}return{element:e,finishers:i,extras:r}},decorateConstructor:function(e,t){for(var r=[],i=t.length-1;i>=0;i--){var n=this.fromClassDescriptor(e),o=this.toClassDescriptor((0,t[i])(n)||n);if(void 0!==o.finisher&&r.push(o.finisher),void 0!==o.elements){e=o.elements;for(var s=0;s<e.length-1;s++)for(var a=s+1;a<e.length;a++)if(e[s].key===e[a].key&&e[s].placement===e[a].placement)throw new TypeError("Duplicated element ("+e[s].key+")")}}return{elements:e,finishers:r}},fromElementDescriptor:function(e){var t={kind:e.kind,key:e.key,placement:e.placement,descriptor:e.descriptor};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),"field"===e.kind&&(t.initializer=e.initializer),t},toElementDescriptors:function(e){var t;if(void 0!==e)return(t=e,function(e){if(Array.isArray(e))return e}(t)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(t)||function(e,t){if(e){if("string"==typeof e)return f(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?f(e,t):void 0}}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).map((function(e){var t=this.toElementDescriptor(e);return this.disallowProperty(e,"finisher","An element descriptor"),this.disallowProperty(e,"extras","An element descriptor"),t}),this)},toElementDescriptor:function(e){var t=String(e.kind);if("method"!==t&&"field"!==t)throw new TypeError('An element descriptor\'s .kind property must be either "method" or "field", but a decorator created an element descriptor with .kind "'+t+'"');var r=u(e.key),i=String(e.placement);if("static"!==i&&"prototype"!==i&&"own"!==i)throw new TypeError('An element descriptor\'s .placement property must be one of "static", "prototype" or "own", but a decorator created an element descriptor with .placement "'+i+'"');var n=e.descriptor;this.disallowProperty(e,"elements","An element descriptor");var o={kind:t,key:r,placement:i,descriptor:Object.assign({},n)};return"field"!==t?this.disallowProperty(e,"initializer","A method descriptor"):(this.disallowProperty(n,"get","The property descriptor of a field descriptor"),this.disallowProperty(n,"set","The property descriptor of a field descriptor"),this.disallowProperty(n,"value","The property descriptor of a field descriptor"),o.initializer=e.initializer),o},toElementFinisherExtras:function(e){return{element:this.toElementDescriptor(e),finisher:p(e,"finisher"),extras:this.toElementDescriptors(e.extras)}},fromClassDescriptor:function(e){var t={kind:"class",elements:e.map(this.fromElementDescriptor,this)};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),t},toClassDescriptor:function(e){var t=String(e.kind);if("class"!==t)throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator created a class descriptor with .kind "'+t+'"');this.disallowProperty(e,"key","A class descriptor"),this.disallowProperty(e,"placement","A class descriptor"),this.disallowProperty(e,"descriptor","A class descriptor"),this.disallowProperty(e,"initializer","A class descriptor"),this.disallowProperty(e,"extras","A class descriptor");var r=p(e,"finisher");return{elements:this.toElementDescriptors(e.elements),finisher:r}},runClassFinishers:function(e,t){for(var r=0;r<t.length;r++){var i=(0,t[r])(e);if(void 0!==i){if("function"!=typeof i)throw new TypeError("Finishers must return a constructor.");e=i}}return e},disallowProperty:function(e,t,r){if(void 0!==e[t])throw new TypeError(r+" can't have a ."+t+" property.")}};return e}function a(e){var t,r=u(e.key);"method"===e.kind?t={value:e.value,writable:!0,configurable:!0,enumerable:!1}:"get"===e.kind?t={get:e.value,configurable:!0,enumerable:!1}:"set"===e.kind?t={set:e.value,configurable:!0,enumerable:!1}:"field"===e.kind&&(t={configurable:!0,writable:!0,enumerable:!0});var i={kind:"field"===e.kind?"field":"method",key:r,placement:e.static?"static":"field"===e.kind?"own":"prototype",descriptor:t};return e.decorators&&(i.decorators=e.decorators),"field"===e.kind&&(i.initializer=e.value),i}function l(e,t){void 0!==e.descriptor.get?t.descriptor.get=e.descriptor.get:t.descriptor.set=e.descriptor.set}function c(e){return e.decorators&&e.decorators.length}function d(e){return void 0!==e&&!(void 0===e.value&&void 0===e.writable)}function p(e,t){var r=e[t];if(void 0!==r&&"function"!=typeof r)throw new TypeError("Expected '"+t+"' to be a function");return r}function u(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function f(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}!function(e,t,r,i){var n=s();if(i)for(var o=0;o<i.length;o++)n=i[o](n);var p=t((function(e){n.initializeInstanceElements(e,u.elements)}),r),u=n.decorateClass(function(e){for(var t=[],r=function(e){return"method"===e.kind&&e.key===o.key&&e.placement===o.placement},i=0;i<e.length;i++){var n,o=e[i];if("method"===o.kind&&(n=t.find(r)))if(d(o.descriptor)||d(n.descriptor)){if(c(o)||c(n))throw new ReferenceError("Duplicated methods ("+o.key+") can't be decorated.");n.descriptor=o.descriptor}else{if(c(o)){if(c(n))throw new ReferenceError("Decorators can't be placed on different accessors with for the same property ("+o.key+").");n.decorators=o.decorators}l(o,n)}else t.push(o)}return t}(p.d.map(a)),e);n.initializeClassElements(p.F,u.elements),n.runClassFinishers(p.F,u.finishers)}([(0,n.Mo)("hass-subpage")],(function(e,t){return{F:class extends t{constructor(...t){super(...t),e(this)}},d:[{kind:"field",decorators:[(0,n.Cb)({attribute:!1})],key:"hass",value:void 0},{kind:"field",decorators:[(0,n.Cb)()],key:"header",value:void 0},{kind:"field",decorators:[(0,n.Cb)({type:Boolean,attribute:"main-page"})],key:"mainPage",value:()=>!1},{kind:"field",decorators:[(0,n.Cb)({type:String,attribute:"back-path"})],key:"backPath",value:void 0},{kind:"field",decorators:[(0,n.Cb)({type:Boolean,reflect:!0})],key:"narrow",value:()=>!1},{kind:"field",decorators:[(0,n.Cb)({type:Boolean})],key:"supervisor",value:()=>!1},{kind:"field",decorators:[(0,o.i)(".content")],key:"_savedScrollPos",value:void 0},{kind:"method",key:"render",value:function(){var e;return i.dy`
      <div class="toolbar">
        ${this.mainPage||null!==(e=history.state)&&void 0!==e&&e.root?i.dy`
              <ha-menu-button
                .hassio=${this.supervisor}
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
            `:this.backPath?i.dy`
              <a href=${this.backPath}>
                <ha-icon-button-arrow-prev
                  .hass=${this.hass}
                ></ha-icon-button-arrow-prev>
              </a>
            `:i.dy`
              <ha-icon-button-arrow-prev
                .hass=${this.hass}
                @click=${this._backTapped}
              ></ha-icon-button-arrow-prev>
            `}

        <div class="main-title">${this.header}</div>
        <slot name="toolbar-icon"></slot>
      </div>
      <div class="content" @scroll=${this._saveScrollPos}><slot></slot></div>
    `}},{kind:"method",decorators:[(0,n.hO)({passive:!0})],key:"_saveScrollPos",value:function(e){this._savedScrollPos=e.target.scrollTop}},{kind:"method",key:"_backTapped",value:function(){history.back()}},{kind:"get",static:!0,key:"styles",value:function(){return i.iv`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }

      :host([narrow]) {
        width: 100%;
        position: fixed;
      }

      .toolbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        height: var(--header-height);
        padding: 0 16px;
        pointer-events: none;
        background-color: var(--app-header-background-color);
        font-weight: 400;
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
        box-sizing: border-box;
      }
      .toolbar a {
        color: var(--sidebar-text-color);
        text-decoration: none;
      }

      ha-menu-button,
      ha-icon-button-arrow-prev,
      ::slotted([slot="toolbar-icon"]) {
        pointer-events: auto;
        color: var(--sidebar-icon-color);
      }

      .main-title {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }

      .content {
        position: relative;
        width: 100%;
        height: calc(100% - 1px - var(--header-height));
        overflow-y: auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
    `}}]}}),i.oi)},73826:(e,t,r)=>{r.d(t,{f:()=>m});var i=r(33310);function n(e,t,r,i){var n=o();if(i)for(var d=0;d<i.length;d++)n=i[d](n);var p=t((function(e){n.initializeInstanceElements(e,u.elements)}),r),u=n.decorateClass(function(e){for(var t=[],r=function(e){return"method"===e.kind&&e.key===o.key&&e.placement===o.placement},i=0;i<e.length;i++){var n,o=e[i];if("method"===o.kind&&(n=t.find(r)))if(c(o.descriptor)||c(n.descriptor)){if(l(o)||l(n))throw new ReferenceError("Duplicated methods ("+o.key+") can't be decorated.");n.descriptor=o.descriptor}else{if(l(o)){if(l(n))throw new ReferenceError("Decorators can't be placed on different accessors with for the same property ("+o.key+").");n.decorators=o.decorators}a(o,n)}else t.push(o)}return t}(p.d.map(s)),e);return n.initializeClassElements(p.F,u.elements),n.runClassFinishers(p.F,u.finishers)}function o(){o=function(){return e};var e={elementsDefinitionOrder:[["method"],["field"]],initializeInstanceElements:function(e,t){["method","field"].forEach((function(r){t.forEach((function(t){t.kind===r&&"own"===t.placement&&this.defineClassElement(e,t)}),this)}),this)},initializeClassElements:function(e,t){var r=e.prototype;["method","field"].forEach((function(i){t.forEach((function(t){var n=t.placement;if(t.kind===i&&("static"===n||"prototype"===n)){var o="static"===n?e:r;this.defineClassElement(o,t)}}),this)}),this)},defineClassElement:function(e,t){var r=t.descriptor;if("field"===t.kind){var i=t.initializer;r={enumerable:r.enumerable,writable:r.writable,configurable:r.configurable,value:void 0===i?void 0:i.call(e)}}Object.defineProperty(e,t.key,r)},decorateClass:function(e,t){var r=[],i=[],n={static:[],prototype:[],own:[]};if(e.forEach((function(e){this.addElementPlacement(e,n)}),this),e.forEach((function(e){if(!l(e))return r.push(e);var t=this.decorateElement(e,n);r.push(t.element),r.push.apply(r,t.extras),i.push.apply(i,t.finishers)}),this),!t)return{elements:r,finishers:i};var o=this.decorateConstructor(r,t);return i.push.apply(i,o.finishers),o.finishers=i,o},addElementPlacement:function(e,t,r){var i=t[e.placement];if(!r&&-1!==i.indexOf(e.key))throw new TypeError("Duplicated element ("+e.key+")");i.push(e.key)},decorateElement:function(e,t){for(var r=[],i=[],n=e.decorators,o=n.length-1;o>=0;o--){var s=t[e.placement];s.splice(s.indexOf(e.key),1);var a=this.fromElementDescriptor(e),l=this.toElementFinisherExtras((0,n[o])(a)||a);e=l.element,this.addElementPlacement(e,t),l.finisher&&i.push(l.finisher);var c=l.extras;if(c){for(var d=0;d<c.length;d++)this.addElementPlacement(c[d],t);r.push.apply(r,c)}}return{element:e,finishers:i,extras:r}},decorateConstructor:function(e,t){for(var r=[],i=t.length-1;i>=0;i--){var n=this.fromClassDescriptor(e),o=this.toClassDescriptor((0,t[i])(n)||n);if(void 0!==o.finisher&&r.push(o.finisher),void 0!==o.elements){e=o.elements;for(var s=0;s<e.length-1;s++)for(var a=s+1;a<e.length;a++)if(e[s].key===e[a].key&&e[s].placement===e[a].placement)throw new TypeError("Duplicated element ("+e[s].key+")")}}return{elements:e,finishers:r}},fromElementDescriptor:function(e){var t={kind:e.kind,key:e.key,placement:e.placement,descriptor:e.descriptor};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),"field"===e.kind&&(t.initializer=e.initializer),t},toElementDescriptors:function(e){var t;if(void 0!==e)return(t=e,function(e){if(Array.isArray(e))return e}(t)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(t)||function(e,t){if(e){if("string"==typeof e)return u(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?u(e,t):void 0}}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).map((function(e){var t=this.toElementDescriptor(e);return this.disallowProperty(e,"finisher","An element descriptor"),this.disallowProperty(e,"extras","An element descriptor"),t}),this)},toElementDescriptor:function(e){var t=String(e.kind);if("method"!==t&&"field"!==t)throw new TypeError('An element descriptor\'s .kind property must be either "method" or "field", but a decorator created an element descriptor with .kind "'+t+'"');var r=p(e.key),i=String(e.placement);if("static"!==i&&"prototype"!==i&&"own"!==i)throw new TypeError('An element descriptor\'s .placement property must be one of "static", "prototype" or "own", but a decorator created an element descriptor with .placement "'+i+'"');var n=e.descriptor;this.disallowProperty(e,"elements","An element descriptor");var o={kind:t,key:r,placement:i,descriptor:Object.assign({},n)};return"field"!==t?this.disallowProperty(e,"initializer","A method descriptor"):(this.disallowProperty(n,"get","The property descriptor of a field descriptor"),this.disallowProperty(n,"set","The property descriptor of a field descriptor"),this.disallowProperty(n,"value","The property descriptor of a field descriptor"),o.initializer=e.initializer),o},toElementFinisherExtras:function(e){return{element:this.toElementDescriptor(e),finisher:d(e,"finisher"),extras:this.toElementDescriptors(e.extras)}},fromClassDescriptor:function(e){var t={kind:"class",elements:e.map(this.fromElementDescriptor,this)};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),t},toClassDescriptor:function(e){var t=String(e.kind);if("class"!==t)throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator created a class descriptor with .kind "'+t+'"');this.disallowProperty(e,"key","A class descriptor"),this.disallowProperty(e,"placement","A class descriptor"),this.disallowProperty(e,"descriptor","A class descriptor"),this.disallowProperty(e,"initializer","A class descriptor"),this.disallowProperty(e,"extras","A class descriptor");var r=d(e,"finisher");return{elements:this.toElementDescriptors(e.elements),finisher:r}},runClassFinishers:function(e,t){for(var r=0;r<t.length;r++){var i=(0,t[r])(e);if(void 0!==i){if("function"!=typeof i)throw new TypeError("Finishers must return a constructor.");e=i}}return e},disallowProperty:function(e,t,r){if(void 0!==e[t])throw new TypeError(r+" can't have a ."+t+" property.")}};return e}function s(e){var t,r=p(e.key);"method"===e.kind?t={value:e.value,writable:!0,configurable:!0,enumerable:!1}:"get"===e.kind?t={get:e.value,configurable:!0,enumerable:!1}:"set"===e.kind?t={set:e.value,configurable:!0,enumerable:!1}:"field"===e.kind&&(t={configurable:!0,writable:!0,enumerable:!0});var i={kind:"field"===e.kind?"field":"method",key:r,placement:e.static?"static":"field"===e.kind?"own":"prototype",descriptor:t};return e.decorators&&(i.decorators=e.decorators),"field"===e.kind&&(i.initializer=e.value),i}function a(e,t){void 0!==e.descriptor.get?t.descriptor.get=e.descriptor.get:t.descriptor.set=e.descriptor.set}function l(e){return e.decorators&&e.decorators.length}function c(e){return void 0!==e&&!(void 0===e.value&&void 0===e.writable)}function d(e,t){var r=e[t];if(void 0!==r&&"function"!=typeof r)throw new TypeError("Expected '"+t+"' to be a function");return r}function p(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function u(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}function f(e,t,r){return f="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(e,t,r){var i=function(e,t){for(;!Object.prototype.hasOwnProperty.call(e,t)&&null!==(e=h(e)););return e}(e,t);if(i){var n=Object.getOwnPropertyDescriptor(i,t);return n.get?n.get.call(r):n.value}},f(e,t,r||e)}function h(e){return h=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},h(e)}const m=e=>n(null,(function(e,t){class r extends t{constructor(...t){super(...t),e(this)}}return{F:r,d:[{kind:"field",decorators:[(0,i.Cb)({attribute:!1})],key:"hass",value:void 0},{kind:"field",key:"hassSubscribeRequiredHostProps",value:void 0},{kind:"field",key:"__unsubs",value:void 0},{kind:"method",key:"connectedCallback",value:function(){f(h(r.prototype),"connectedCallback",this).call(this),this.__checkSubscribed()}},{kind:"method",key:"disconnectedCallback",value:function(){if(f(h(r.prototype),"disconnectedCallback",this).call(this),this.__unsubs){for(;this.__unsubs.length;){const e=this.__unsubs.pop();e instanceof Promise?e.then((e=>e())):e()}this.__unsubs=void 0}}},{kind:"method",key:"updated",value:function(e){if(f(h(r.prototype),"updated",this).call(this,e),e.has("hass"))this.__checkSubscribed();else if(this.hassSubscribeRequiredHostProps)for(const t of e.keys())if(this.hassSubscribeRequiredHostProps.includes(t))return void this.__checkSubscribed()}},{kind:"method",key:"hassSubscribe",value:function(){return[]}},{kind:"method",key:"__checkSubscribed",value:function(){var e;void 0!==this.__unsubs||!this.isConnected||void 0===this.hass||null!==(e=this.hassSubscribeRequiredHostProps)&&void 0!==e&&e.some((e=>void 0===this[e]))||(this.__unsubs=this.hassSubscribe())}}]}}),e)},46277:(e,t,r)=>{r.a(e,(async e=>{r.r(t),r.d(t,{UNSUPPORTED_REASON_URL:()=>$,UNHEALTHY_REASON_URL:()=>A});r(44577);var i=r(37500),n=r(33310),o=r(7323),s=r(44583),a=r(50577),l=r(60893),c=(r(9381),r(81545),r(22098),r(31206),r(2130),r(41682)),d=r(28257),p=r(5986),u=r(56799),f=r(26765),h=(r(60010),r(73826)),m=r(27322),y=r(81796),v=(r(10635),e([s]));function b(){b=function(){return e};var e={elementsDefinitionOrder:[["method"],["field"]],initializeInstanceElements:function(e,t){["method","field"].forEach((function(r){t.forEach((function(t){t.kind===r&&"own"===t.placement&&this.defineClassElement(e,t)}),this)}),this)},initializeClassElements:function(e,t){var r=e.prototype;["method","field"].forEach((function(i){t.forEach((function(t){var n=t.placement;if(t.kind===i&&("static"===n||"prototype"===n)){var o="static"===n?e:r;this.defineClassElement(o,t)}}),this)}),this)},defineClassElement:function(e,t){var r=t.descriptor;if("field"===t.kind){var i=t.initializer;r={enumerable:r.enumerable,writable:r.writable,configurable:r.configurable,value:void 0===i?void 0:i.call(e)}}Object.defineProperty(e,t.key,r)},decorateClass:function(e,t){var r=[],i=[],n={static:[],prototype:[],own:[]};if(e.forEach((function(e){this.addElementPlacement(e,n)}),this),e.forEach((function(e){if(!w(e))return r.push(e);var t=this.decorateElement(e,n);r.push(t.element),r.push.apply(r,t.extras),i.push.apply(i,t.finishers)}),this),!t)return{elements:r,finishers:i};var o=this.decorateConstructor(r,t);return i.push.apply(i,o.finishers),o.finishers=i,o},addElementPlacement:function(e,t,r){var i=t[e.placement];if(!r&&-1!==i.indexOf(e.key))throw new TypeError("Duplicated element ("+e.key+")");i.push(e.key)},decorateElement:function(e,t){for(var r=[],i=[],n=e.decorators,o=n.length-1;o>=0;o--){var s=t[e.placement];s.splice(s.indexOf(e.key),1);var a=this.fromElementDescriptor(e),l=this.toElementFinisherExtras((0,n[o])(a)||a);e=l.element,this.addElementPlacement(e,t),l.finisher&&i.push(l.finisher);var c=l.extras;if(c){for(var d=0;d<c.length;d++)this.addElementPlacement(c[d],t);r.push.apply(r,c)}}return{element:e,finishers:i,extras:r}},decorateConstructor:function(e,t){for(var r=[],i=t.length-1;i>=0;i--){var n=this.fromClassDescriptor(e),o=this.toClassDescriptor((0,t[i])(n)||n);if(void 0!==o.finisher&&r.push(o.finisher),void 0!==o.elements){e=o.elements;for(var s=0;s<e.length-1;s++)for(var a=s+1;a<e.length;a++)if(e[s].key===e[a].key&&e[s].placement===e[a].placement)throw new TypeError("Duplicated element ("+e[s].key+")")}}return{elements:e,finishers:r}},fromElementDescriptor:function(e){var t={kind:e.kind,key:e.key,placement:e.placement,descriptor:e.descriptor};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),"field"===e.kind&&(t.initializer=e.initializer),t},toElementDescriptors:function(e){var t;if(void 0!==e)return(t=e,function(e){if(Array.isArray(e))return e}(t)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(t)||function(e,t){if(e){if("string"==typeof e)return S(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?S(e,t):void 0}}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).map((function(e){var t=this.toElementDescriptor(e);return this.disallowProperty(e,"finisher","An element descriptor"),this.disallowProperty(e,"extras","An element descriptor"),t}),this)},toElementDescriptor:function(e){var t=String(e.kind);if("method"!==t&&"field"!==t)throw new TypeError('An element descriptor\'s .kind property must be either "method" or "field", but a decorator created an element descriptor with .kind "'+t+'"');var r=P(e.key),i=String(e.placement);if("static"!==i&&"prototype"!==i&&"own"!==i)throw new TypeError('An element descriptor\'s .placement property must be one of "static", "prototype" or "own", but a decorator created an element descriptor with .placement "'+i+'"');var n=e.descriptor;this.disallowProperty(e,"elements","An element descriptor");var o={kind:t,key:r,placement:i,descriptor:Object.assign({},n)};return"field"!==t?this.disallowProperty(e,"initializer","A method descriptor"):(this.disallowProperty(n,"get","The property descriptor of a field descriptor"),this.disallowProperty(n,"set","The property descriptor of a field descriptor"),this.disallowProperty(n,"value","The property descriptor of a field descriptor"),o.initializer=e.initializer),o},toElementFinisherExtras:function(e){return{element:this.toElementDescriptor(e),finisher:_(e,"finisher"),extras:this.toElementDescriptors(e.extras)}},fromClassDescriptor:function(e){var t={kind:"class",elements:e.map(this.fromElementDescriptor,this)};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),t},toClassDescriptor:function(e){var t=String(e.kind);if("class"!==t)throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator created a class descriptor with .kind "'+t+'"');this.disallowProperty(e,"key","A class descriptor"),this.disallowProperty(e,"placement","A class descriptor"),this.disallowProperty(e,"descriptor","A class descriptor"),this.disallowProperty(e,"initializer","A class descriptor"),this.disallowProperty(e,"extras","A class descriptor");var r=_(e,"finisher");return{elements:this.toElementDescriptors(e.elements),finisher:r}},runClassFinishers:function(e,t){for(var r=0;r<t.length;r++){var i=(0,t[r])(e);if(void 0!==i){if("function"!=typeof i)throw new TypeError("Finishers must return a constructor.");e=i}}return e},disallowProperty:function(e,t,r){if(void 0!==e[t])throw new TypeError(r+" can't have a ."+t+" property.")}};return e}function g(e){var t,r=P(e.key);"method"===e.kind?t={value:e.value,writable:!0,configurable:!0,enumerable:!1}:"get"===e.kind?t={get:e.value,configurable:!0,enumerable:!1}:"set"===e.kind?t={set:e.value,configurable:!0,enumerable:!1}:"field"===e.kind&&(t={configurable:!0,writable:!0,enumerable:!0});var i={kind:"field"===e.kind?"field":"method",key:r,placement:e.static?"static":"field"===e.kind?"own":"prototype",descriptor:t};return e.decorators&&(i.decorators=e.decorators),"field"===e.kind&&(i.initializer=e.value),i}function k(e,t){void 0!==e.descriptor.get?t.descriptor.get=e.descriptor.get:t.descriptor.set=e.descriptor.set}function w(e){return e.decorators&&e.decorators.length}function E(e){return void 0!==e&&!(void 0===e.value&&void 0===e.writable)}function _(e,t){var r=e[t];if(void 0!==r&&"function"!=typeof r)throw new TypeError("Expected '"+t+"' to be a function");return r}function P(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function S(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}function x(e,t,r){return x="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(e,t,r){var i=function(e,t){for(;!Object.prototype.hasOwnProperty.call(e,t)&&null!==(e=D(e)););return e}(e,t);if(i){var n=Object.getOwnPropertyDescriptor(i,t);return n.get?n.get.call(r):n.value}},x(e,t,r||e)}function D(e){return D=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},D(e)}s=(v.then?await v:v)[0];const C=(e,t)=>"homeassistant"===e?-1:"homeassistant"===t?1:e<t?-1:t<e?1:0,$={},A={privileged:"/more-info/unsupported/privileged"};!function(e,t,r,i){var n=b();if(i)for(var o=0;o<i.length;o++)n=i[o](n);var s=t((function(e){n.initializeInstanceElements(e,a.elements)}),r),a=n.decorateClass(function(e){for(var t=[],r=function(e){return"method"===e.kind&&e.key===o.key&&e.placement===o.placement},i=0;i<e.length;i++){var n,o=e[i];if("method"===o.kind&&(n=t.find(r)))if(E(o.descriptor)||E(n.descriptor)){if(w(o)||w(n))throw new ReferenceError("Duplicated methods ("+o.key+") can't be decorated.");n.descriptor=o.descriptor}else{if(w(o)){if(w(n))throw new ReferenceError("Decorators can't be placed on different accessors with for the same property ("+o.key+").");n.decorators=o.decorators}k(o,n)}else t.push(o)}return t}(s.d.map(g)),e);n.initializeClassElements(s.F,a.elements),n.runClassFinishers(s.F,a.finishers)}([(0,n.Mo)("ha-config-system-health")],(function(e,t){class r extends t{constructor(...t){super(...t),e(this)}}return{F:r,d:[{kind:"field",decorators:[(0,n.Cb)({attribute:!1})],key:"hass",value:void 0},{kind:"field",decorators:[(0,n.Cb)({type:Boolean})],key:"narrow",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_info",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_supervisorStats",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_resolutionInfo",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_coreStats",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_error",value:void 0},{kind:"method",key:"hassSubscribe",value:function(){const e=[];return(0,o.p)(this.hass,"system_health")&&e.push((0,u.V)(this.hass,(e=>{this._info=e}))),(0,o.p)(this.hass,"hassio")&&(e.push((0,l.T)(this.hass,(async()=>{this._supervisorStats=await(0,c.yd)(this.hass,"supervisor"),this._coreStats=await(0,c.yd)(this.hass,"core")}),1e4)),(0,d.p)(this.hass).then((e=>{this._resolutionInfo=e}))),e}},{kind:"method",key:"firstUpdated",value:function(e){x(D(r.prototype),"firstUpdated",this).call(this,e),this.hass.loadBackendTranslation("system_health")}},{kind:"method",key:"render",value:function(){const e=[];if(this._info){const t=Object.keys(this._info).sort(C);for(const r of t){const t=this._info[r],n=[];for(const e of Object.keys(t.info)){let o;if(t.info[e]&&"object"==typeof t.info[e]){const r=t.info[e];"pending"===r.type?o=i.dy`
                <ha-circular-progress active size="tiny"></ha-circular-progress>
              `:"failed"===r.type?o=i.dy`
                <span class="error">${r.error}</span>${r.more_info?i.dy`
                      –
                      <a
                        href=${r.more_info}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        ${this.hass.localize("ui.panel.config.info.system_health.more_info")}
                      </a>
                    `:""}
              `:"date"===r.type&&(o=(0,s.o0)(new Date(r.value),this.hass.locale))}else o=t.info[e];n.push(i.dy`
            <tr>
              <td>
                ${this.hass.localize(`component.${r}.system_health.info.${e}`)||e}
              </td>
              <td>${o}</td>
            </tr>
          `)}"homeassistant"!==r&&e.push(i.dy`
              <div class="card-header">
                <h3>${(0,p.Lh)(this.hass.localize,r)}</h3>
                ${t.manage_url?i.dy`
                      <a class="manage" href=${t.manage_url}>
                        <mwc-button>
                          ${this.hass.localize("ui.panel.config.info.system_health.manage")}
                        </mwc-button>
                      </a>
                    `:""}
              </div>
            `),e.push(i.dy`
          <table>
            ${n}
          </table>
        `)}}else e.push(i.dy`
          <div class="loading-container">
            <ha-circular-progress active></ha-circular-progress>
          </div>
        `);return i.dy`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/system"
        .header=${this.hass.localize("ui.panel.config.system_health.caption")}
      >
        ${this._error?i.dy`
              <ha-alert alert-type="error"
                >${this._error.message||this._error.code}</ha-alert
              >
            `:""}
        ${this._info?i.dy`
              <ha-button-menu
                corner="BOTTOM_START"
                slot="toolbar-icon"
                @action=${this._copyInfo}
              >
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.panel.config.info.copy_menu")}
                  .path=${"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"}
                ></ha-icon-button>
                <mwc-list-item>
                  ${this.hass.localize("ui.panel.config.info.copy_raw")}
                </mwc-list-item>
                <mwc-list-item>
                  ${this.hass.localize("ui.panel.config.info.copy_github")}
                </mwc-list-item>
              </ha-button-menu>
            `:""}
        <div class="content">
          ${this._resolutionInfo?i.dy`${this._resolutionInfo.unhealthy.length?i.dy`<ha-alert alert-type="error">
                    ${this.hass.localize("ui.dialogs.unhealthy.title")}
                    <mwc-button
                      slot="action"
                      .label=${this.hass.localize("ui.panel.config.common.learn_more")}
                      @click=${this._unhealthyDialog}
                    >
                    </mwc-button
                  ></ha-alert>`:""}
              ${this._resolutionInfo.unsupported.length?i.dy`<ha-alert alert-type="warning">
                    ${this.hass.localize("ui.dialogs.unsupported.title")}
                    <mwc-button
                      slot="action"
                      .label=${this.hass.localize("ui.panel.config.common.learn_more")}
                      @click=${this._unsupportedDialog}
                    >
                    </mwc-button>
                  </ha-alert>`:""} `:""}

          <ha-card outlined>
            <div class="card-content">${e}</div>
          </ha-card>
          ${this._coreStats||this._supervisorStats?i.dy`
                <ha-card outlined>
                  <div class="card-content">
                    ${this._coreStats?i.dy`
                          <h3>
                            ${this.hass.localize("ui.panel.config.system_health.core_stats")}
                          </h3>
                          <ha-metric
                            .heading=${this.hass.localize("ui.panel.config.system_health.cpu_usage")}
                            .value=${this._coreStats.cpu_percent}
                          ></ha-metric>
                          <ha-metric
                            .heading=${this.hass.localize("ui.panel.config.system_health.ram_usage")}
                            .value=${this._coreStats.memory_percent}
                          ></ha-metric>
                        `:""}
                    ${this._supervisorStats?i.dy`
                          <h3>
                            ${this.hass.localize("ui.panel.config.system_health.supervisor_stats")}
                          </h3>
                          <ha-metric
                            .heading=${this.hass.localize("ui.panel.config.system_health.cpu_usage")}
                            .value=${this._supervisorStats.cpu_percent}
                          ></ha-metric>
                          <ha-metric
                            .heading=${this.hass.localize("ui.panel.config.system_health.ram_usage")}
                            .value=${this._supervisorStats.memory_percent}
                          ></ha-metric>
                        `:""}
                  </div>
                </ha-card>
              `:""}

          <integrations-card
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></integrations-card>
        </div>
      </hass-subpage>
    `}},{kind:"method",key:"_unsupportedDialog",value:async function(){await(0,f.Ys)(this,{title:this.hass.localize("ui.dialogs.unsupported.title"),text:i.dy`${this.hass.localize("ui.dialogs.unsupported.description")}
        <br /><br />
        <ul>
          ${this._resolutionInfo.unsupported.map((e=>i.dy`
              <li>
                <a
                  href=${(0,m.R)(this.hass,$[e]||`/more-info/unsupported/${e}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(`ui.dialogs.unsupported.reason.${e}`)||e}
                </a>
              </li>
            `))}
        </ul>`})}},{kind:"method",key:"_unhealthyDialog",value:async function(){await(0,f.Ys)(this,{title:this.hass.localize("ui.dialogs.unhealthy.title"),text:i.dy`${this.hass.localize("ui.dialogs.unhealthy.description")}
        <br /><br />
        <ul>
          ${this._resolutionInfo.unhealthy.map((e=>i.dy`
              <li>
                <a
                  href=${(0,m.R)(this.hass,A[e]||`/more-info/unhealthy/${e}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(`ui.dialogs.unhealthy.reason.${e}`)||e}
                </a>
              </li>
            `))}
        </ul>`})}},{kind:"method",key:"_copyInfo",value:async function(e){const t=1===e.detail.index;let r;const i=[];for(const e of Object.keys(this._info).sort(C)){const n=this._info[e];let o=!0;const a=[""+(t&&"homeassistant"!==e?`<details><summary>${(0,p.Lh)(this.hass.localize,e)}</summary>\n`:"")];for(const e of Object.keys(n.info)){let r;if("object"==typeof n.info[e]){const t=n.info[e];"pending"===t.type?r="pending":"failed"===t.type?r=`failed to load: ${t.error}`:"date"===t.type&&(r=(0,s.o0)(new Date(t.value),this.hass.locale))}else r=n.info[e];t&&o?(a.push(`${e} | ${r}\n-- | --`),o=!1):a.push(`${e}${t?" | ":": "}${r}`)}"homeassistant"===e?r=a.join("\n"):(i.push(a.join("\n")),t&&"homeassistant"!==e&&i.push("</details>"))}await(0,a.v)(`${t?"## ":""}System Health\n${r}\n\n${i.join("\n\n")}`),(0,y.C)(this,{message:this.hass.localize("ui.common.copied_clipboard")})}},{kind:"field",static:!0,key:"styles",value:()=>i.iv`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    integrations-card {
      max-width: 600px;
      display: block;
      max-width: 600px;
      margin: 0 auto;
      margin-bottom: 24px;
      margin-bottom: max(24px, env(safe-area-inset-bottom));
    }
    ha-card {
      display: block;
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    ha-alert {
      display: block;
      max-width: 500px;
      margin: 0 auto;
      margin-bottom: max(24px, env(safe-area-inset-bottom));
    }
    table {
      width: 100%;
    }

    td:first-child {
      width: 45%;
    }

    td:last-child {
      direction: ltr;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-header {
      justify-content: space-between;
      display: flex;
      align-items: center;
    }

    .error {
      color: var(--error-color);
    }

    a {
      color: var(--primary-color);
    }

    a.manage {
      text-decoration: none;
    }
  `}]}}),(0,h.f)(i.oi))}))},10635:(e,t,r)=>{r(24103);var i=r(37500),n=r(33310),o=(r(22098),r(45036),r(5986)),s=r(11254),a=r(27322);function l(){l=function(){return e};var e={elementsDefinitionOrder:[["method"],["field"]],initializeInstanceElements:function(e,t){["method","field"].forEach((function(r){t.forEach((function(t){t.kind===r&&"own"===t.placement&&this.defineClassElement(e,t)}),this)}),this)},initializeClassElements:function(e,t){var r=e.prototype;["method","field"].forEach((function(i){t.forEach((function(t){var n=t.placement;if(t.kind===i&&("static"===n||"prototype"===n)){var o="static"===n?e:r;this.defineClassElement(o,t)}}),this)}),this)},defineClassElement:function(e,t){var r=t.descriptor;if("field"===t.kind){var i=t.initializer;r={enumerable:r.enumerable,writable:r.writable,configurable:r.configurable,value:void 0===i?void 0:i.call(e)}}Object.defineProperty(e,t.key,r)},decorateClass:function(e,t){var r=[],i=[],n={static:[],prototype:[],own:[]};if(e.forEach((function(e){this.addElementPlacement(e,n)}),this),e.forEach((function(e){if(!p(e))return r.push(e);var t=this.decorateElement(e,n);r.push(t.element),r.push.apply(r,t.extras),i.push.apply(i,t.finishers)}),this),!t)return{elements:r,finishers:i};var o=this.decorateConstructor(r,t);return i.push.apply(i,o.finishers),o.finishers=i,o},addElementPlacement:function(e,t,r){var i=t[e.placement];if(!r&&-1!==i.indexOf(e.key))throw new TypeError("Duplicated element ("+e.key+")");i.push(e.key)},decorateElement:function(e,t){for(var r=[],i=[],n=e.decorators,o=n.length-1;o>=0;o--){var s=t[e.placement];s.splice(s.indexOf(e.key),1);var a=this.fromElementDescriptor(e),l=this.toElementFinisherExtras((0,n[o])(a)||a);e=l.element,this.addElementPlacement(e,t),l.finisher&&i.push(l.finisher);var c=l.extras;if(c){for(var d=0;d<c.length;d++)this.addElementPlacement(c[d],t);r.push.apply(r,c)}}return{element:e,finishers:i,extras:r}},decorateConstructor:function(e,t){for(var r=[],i=t.length-1;i>=0;i--){var n=this.fromClassDescriptor(e),o=this.toClassDescriptor((0,t[i])(n)||n);if(void 0!==o.finisher&&r.push(o.finisher),void 0!==o.elements){e=o.elements;for(var s=0;s<e.length-1;s++)for(var a=s+1;a<e.length;a++)if(e[s].key===e[a].key&&e[s].placement===e[a].placement)throw new TypeError("Duplicated element ("+e[s].key+")")}}return{elements:e,finishers:r}},fromElementDescriptor:function(e){var t={kind:e.kind,key:e.key,placement:e.placement,descriptor:e.descriptor};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),"field"===e.kind&&(t.initializer=e.initializer),t},toElementDescriptors:function(e){var t;if(void 0!==e)return(t=e,function(e){if(Array.isArray(e))return e}(t)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(t)||function(e,t){if(e){if("string"==typeof e)return m(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?m(e,t):void 0}}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).map((function(e){var t=this.toElementDescriptor(e);return this.disallowProperty(e,"finisher","An element descriptor"),this.disallowProperty(e,"extras","An element descriptor"),t}),this)},toElementDescriptor:function(e){var t=String(e.kind);if("method"!==t&&"field"!==t)throw new TypeError('An element descriptor\'s .kind property must be either "method" or "field", but a decorator created an element descriptor with .kind "'+t+'"');var r=h(e.key),i=String(e.placement);if("static"!==i&&"prototype"!==i&&"own"!==i)throw new TypeError('An element descriptor\'s .placement property must be one of "static", "prototype" or "own", but a decorator created an element descriptor with .placement "'+i+'"');var n=e.descriptor;this.disallowProperty(e,"elements","An element descriptor");var o={kind:t,key:r,placement:i,descriptor:Object.assign({},n)};return"field"!==t?this.disallowProperty(e,"initializer","A method descriptor"):(this.disallowProperty(n,"get","The property descriptor of a field descriptor"),this.disallowProperty(n,"set","The property descriptor of a field descriptor"),this.disallowProperty(n,"value","The property descriptor of a field descriptor"),o.initializer=e.initializer),o},toElementFinisherExtras:function(e){return{element:this.toElementDescriptor(e),finisher:f(e,"finisher"),extras:this.toElementDescriptors(e.extras)}},fromClassDescriptor:function(e){var t={kind:"class",elements:e.map(this.fromElementDescriptor,this)};return Object.defineProperty(t,Symbol.toStringTag,{value:"Descriptor",configurable:!0}),t},toClassDescriptor:function(e){var t=String(e.kind);if("class"!==t)throw new TypeError('A class descriptor\'s .kind property must be "class", but a decorator created a class descriptor with .kind "'+t+'"');this.disallowProperty(e,"key","A class descriptor"),this.disallowProperty(e,"placement","A class descriptor"),this.disallowProperty(e,"descriptor","A class descriptor"),this.disallowProperty(e,"initializer","A class descriptor"),this.disallowProperty(e,"extras","A class descriptor");var r=f(e,"finisher");return{elements:this.toElementDescriptors(e.elements),finisher:r}},runClassFinishers:function(e,t){for(var r=0;r<t.length;r++){var i=(0,t[r])(e);if(void 0!==i){if("function"!=typeof i)throw new TypeError("Finishers must return a constructor.");e=i}}return e},disallowProperty:function(e,t,r){if(void 0!==e[t])throw new TypeError(r+" can't have a ."+t+" property.")}};return e}function c(e){var t,r=h(e.key);"method"===e.kind?t={value:e.value,writable:!0,configurable:!0,enumerable:!1}:"get"===e.kind?t={get:e.value,configurable:!0,enumerable:!1}:"set"===e.kind?t={set:e.value,configurable:!0,enumerable:!1}:"field"===e.kind&&(t={configurable:!0,writable:!0,enumerable:!0});var i={kind:"field"===e.kind?"field":"method",key:r,placement:e.static?"static":"field"===e.kind?"own":"prototype",descriptor:t};return e.decorators&&(i.decorators=e.decorators),"field"===e.kind&&(i.initializer=e.value),i}function d(e,t){void 0!==e.descriptor.get?t.descriptor.get=e.descriptor.get:t.descriptor.set=e.descriptor.set}function p(e){return e.decorators&&e.decorators.length}function u(e){return void 0!==e&&!(void 0===e.value&&void 0===e.writable)}function f(e,t){var r=e[t];if(void 0!==r&&"function"!=typeof r)throw new TypeError("Expected '"+t+"' to be a function");return r}function h(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function m(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}function y(e,t,r){return y="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(e,t,r){var i=function(e,t){for(;!Object.prototype.hasOwnProperty.call(e,t)&&null!==(e=v(e)););return e}(e,t);if(i){var n=Object.getOwnPropertyDescriptor(i,t);return n.get?n.get.call(r):n.value}},y(e,t,r||e)}function v(e){return v=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},v(e)}!function(e,t,r,i){var n=l();if(i)for(var o=0;o<i.length;o++)n=i[o](n);var s=t((function(e){n.initializeInstanceElements(e,a.elements)}),r),a=n.decorateClass(function(e){for(var t=[],r=function(e){return"method"===e.kind&&e.key===o.key&&e.placement===o.placement},i=0;i<e.length;i++){var n,o=e[i];if("method"===o.kind&&(n=t.find(r)))if(u(o.descriptor)||u(n.descriptor)){if(p(o)||p(n))throw new ReferenceError("Duplicated methods ("+o.key+") can't be decorated.");n.descriptor=o.descriptor}else{if(p(o)){if(p(n))throw new ReferenceError("Decorators can't be placed on different accessors with for the same property ("+o.key+").");n.decorators=o.decorators}d(o,n)}else t.push(o)}return t}(s.d.map(c)),e);n.initializeClassElements(s.F,a.elements),n.runClassFinishers(s.F,a.finishers)}([(0,n.Mo)("integrations-card")],(function(e,t){class r extends t{constructor(...t){super(...t),e(this)}}return{F:r,d:[{kind:"field",decorators:[(0,n.Cb)({attribute:!1})],key:"hass",value:void 0},{kind:"field",decorators:[(0,n.Cb)({type:Boolean})],key:"narrow",value:()=>!1},{kind:"field",decorators:[(0,n.SB)()],key:"_manifests",value:void 0},{kind:"field",decorators:[(0,n.SB)()],key:"_setups",value:void 0},{kind:"method",key:"firstUpdated",value:function(e){y(v(r.prototype),"firstUpdated",this).call(this,e),this._fetchManifests(),this._fetchSetups()}},{kind:"method",key:"render",value:function(){var e;return this._setups?i.dy`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.system_health.integration_start_time")}
      >
        <mwc-list>
          ${null===(e=this._setups)||void 0===e?void 0:e.map((e=>{var t,r;const n=this._manifests&&this._manifests[e.domain],l=n?n.is_built_in?(0,a.R)(this.hass,`/integrations/${n.domain}`):n.documentation:"",c=null===(t=e.seconds)||void 0===t?void 0:t.toFixed(2);return i.dy`
              <ha-clickable-list-item
                graphic="avatar"
                twoline
                hasMeta
                openNewTab
                @click=${this._entryClicked}
                href=${l}
              >
                <img
                  loading="lazy"
                  src=${(0,s.X1)({domain:e.domain,type:"icon",useFallback:!0,darkOptimized:null===(r=this.hass.themes)||void 0===r?void 0:r.darkMode})}
                  referrerpolicy="no-referrer"
                  slot="graphic"
                />
                <span>
                  ${(0,o.Lh)(this.hass.localize,e.domain,n)}
                </span>
                <span slot="secondary">${e.domain}</span>
                <div slot="meta">
                  ${c?i.dy`${c} s`:""}
                </div>
              </ha-clickable-list-item>
            `}))}
        </mwc-list>
      </ha-card>
    `:i.dy``}},{kind:"method",key:"_fetchManifests",value:async function(){const e={};for(const t of await(0,o.F3)(this.hass))e[t.domain]=t;this._manifests=e}},{kind:"method",key:"_fetchSetups",value:async function(){const e=await(0,o.Mt)(this.hass);this._setups=e.sort(((e,t)=>e.seconds===t.seconds?0:void 0===e.seconds||void 0===t.seconds?1:t.seconds-e.seconds))}},{kind:"method",key:"_entryClicked",value:function(e){e.currentTarget.blur()}},{kind:"get",static:!0,key:"styles",value:function(){return i.iv`
      ha-clickable-list-item {
        --mdc-list-item-meta-size: 64px;
        --mdc-typography-caption-font-size: 12px;
      }
      img {
        display: block;
        max-height: 40px;
        max-width: 40px;
      }
      div[slot="meta"] {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `}}]}}),i.oi)},11254:(e,t,r)=>{r.d(t,{X1:()=>i,RU:()=>n,u4:()=>o,zC:()=>s});const i=e=>`https://brands.home-assistant.io/${e.useFallback?"_/":""}${e.domain}/${e.darkOptimized?"dark_":""}${e.type}.png`,n=e=>`https://brands.home-assistant.io/hardware/${e.category}/${e.darkOptimized?"dark_":""}${e.manufacturer}${e.model?`_${e.model}`:""}.png`,o=e=>e.split("/")[4],s=e=>e.startsWith("https://brands.home-assistant.io/")},27322:(e,t,r)=>{r.d(t,{R:()=>i});const i=(e,t)=>`https://${e.config.version.includes("b")?"rc":e.config.version.includes("dev")?"next":"www"}.home-assistant.io${t}`}}]);
//# sourceMappingURL=4d26ff5d.js.map