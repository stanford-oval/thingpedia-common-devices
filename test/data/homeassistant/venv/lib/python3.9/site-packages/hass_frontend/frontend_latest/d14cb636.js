/*! For license information please see d14cb636.js.LICENSE.txt */
"use strict";(self.webpackChunkhome_assistant_frontend=self.webpackChunkhome_assistant_frontend||[]).push([[63171],{63207:(e,t,n)=>{n(65660),n(15112);var i=n(9672),o=n(87156),r=n(50856),s=n(48175);(0,i.k)({_template:r.d`
    <style>
      :host {
        @apply --layout-inline;
        @apply --layout-center-center;
        position: relative;

        vertical-align: middle;

        fill: var(--iron-icon-fill-color, currentcolor);
        stroke: var(--iron-icon-stroke-color, none);

        width: var(--iron-icon-width, 24px);
        height: var(--iron-icon-height, 24px);
        @apply --iron-icon;
      }

      :host([hidden]) {
        display: none;
      }
    </style>
`,is:"iron-icon",properties:{icon:{type:String},theme:{type:String},src:{type:String},_meta:{value:s.XY.create("iron-meta",{type:"iconset"})}},observers:["_updateIcon(_meta, isAttached)","_updateIcon(theme, isAttached)","_srcChanged(src, isAttached)","_iconChanged(icon, isAttached)"],_DEFAULT_ICONSET:"icons",_iconChanged:function(e){var t=(e||"").split(":");this._iconName=t.pop(),this._iconsetName=t.pop()||this._DEFAULT_ICONSET,this._updateIcon()},_srcChanged:function(e){this._updateIcon()},_usesIconset:function(){return this.icon||!this.src},_updateIcon:function(){this._usesIconset()?(this._img&&this._img.parentNode&&(0,o.vz)(this.root).removeChild(this._img),""===this._iconName?this._iconset&&this._iconset.removeIcon(this):this._iconsetName&&this._meta&&(this._iconset=this._meta.byKey(this._iconsetName),this._iconset?(this._iconset.applyIcon(this,this._iconName,this.theme),this.unlisten(window,"iron-iconset-added","_updateIcon")):this.listen(window,"iron-iconset-added","_updateIcon"))):(this._iconset&&this._iconset.removeIcon(this),this._img||(this._img=document.createElement("img"),this._img.style.width="100%",this._img.style.height="100%",this._img.draggable=!1),this._img.src=this.src,(0,o.vz)(this.root).appendChild(this._img))}})},15112:(e,t,n)=>{n.d(t,{P:()=>o});n(48175);var i=n(9672);class o{constructor(e){o[" "](e),this.type=e&&e.type||"default",this.key=e&&e.key,e&&"value"in e&&(this.value=e.value)}get value(){var e=this.type,t=this.key;if(e&&t)return o.types[e]&&o.types[e][t]}set value(e){var t=this.type,n=this.key;t&&n&&(t=o.types[t]=o.types[t]||{},null==e?delete t[n]:t[n]=e)}get list(){if(this.type){var e=o.types[this.type];return e?Object.keys(e).map((function(e){return r[this.type][e]}),this):[]}}byKey(e){return this.key=e,this.value}}o[" "]=function(){},o.types={};var r=o.types;(0,i.k)({is:"iron-meta",properties:{type:{type:String,value:"default"},key:{type:String},value:{type:String,notify:!0},self:{type:Boolean,observer:"_selfChanged"},__meta:{type:Boolean,computed:"__computeMeta(type, key, value)"}},hostAttributes:{hidden:!0},__computeMeta:function(e,t,n){var i=new o({type:e,key:t});return void 0!==n&&n!==i.value?i.value=n:this.value!==i.value&&(this.value=i.value),i},get list(){return this.__meta&&this.__meta.list},_selfChanged:function(e){e&&(this.value=this)},byKey:function(e){return new o({type:this.type,key:e}).value}})},25782:(e,t,n)=>{n(48175),n(65660),n(70019),n(97968);var i=n(9672),o=n(50856),r=n(33760);(0,i.k)({_template:o.d`
    <style include="paper-item-shared-styles"></style>
    <style>
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --paper-font-subhead;

        @apply --paper-item;
        @apply --paper-icon-item;
      }

      .content-icon {
        @apply --layout-horizontal;
        @apply --layout-center;

        width: var(--paper-item-icon-width, 56px);
        @apply --paper-item-icon;
      }
    </style>

    <div id="contentIcon" class="content-icon">
      <slot name="item-icon"></slot>
    </div>
    <slot></slot>
`,is:"paper-icon-item",behaviors:[r.U]})},33760:(e,t,n)=>{n.d(t,{U:()=>r});n(48175);var i=n(51644),o=n(26110);const r=[i.P,o.a,{hostAttributes:{role:"option",tabindex:"0"}}]},97968:(e,t,n)=>{n(65660),n(70019);const i=document.createElement("template");i.setAttribute("style","display: none;"),i.innerHTML="<dom-module id=\"paper-item-shared-styles\">\n  <template>\n    <style>\n      :host, .paper-item {\n        display: block;\n        position: relative;\n        min-height: var(--paper-item-min-height, 48px);\n        padding: 0px 16px;\n      }\n\n      .paper-item {\n        @apply --paper-font-subhead;\n        border:none;\n        outline: none;\n        background: white;\n        width: 100%;\n        text-align: left;\n      }\n\n      :host([hidden]), .paper-item[hidden] {\n        display: none !important;\n      }\n\n      :host(.iron-selected), .paper-item.iron-selected {\n        font-weight: var(--paper-item-selected-weight, bold);\n\n        @apply --paper-item-selected;\n      }\n\n      :host([disabled]), .paper-item[disabled] {\n        color: var(--paper-item-disabled-color, var(--disabled-text-color));\n\n        @apply --paper-item-disabled;\n      }\n\n      :host(:focus), .paper-item:focus {\n        position: relative;\n        outline: 0;\n\n        @apply --paper-item-focused;\n      }\n\n      :host(:focus):before, .paper-item:focus:before {\n        @apply --layout-fit;\n\n        background: currentColor;\n        content: '';\n        opacity: var(--dark-divider-opacity);\n        pointer-events: none;\n\n        @apply --paper-item-focused-before;\n      }\n    </style>\n  </template>\n</dom-module>",document.head.appendChild(i.content)},53973:(e,t,n)=>{n(48175),n(65660),n(97968);var i=n(9672),o=n(50856),r=n(33760);(0,i.k)({_template:o.d`
    <style include="paper-item-shared-styles">
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --paper-font-subhead;

        @apply --paper-item;
      }
    </style>
    <slot></slot>
`,is:"paper-item",behaviors:[r.U]})},51095:(e,t,n)=>{n(48175);var i=n(98433),o=n(9672),r=n(50856);(0,o.k)({_template:r.d`
    <style>
      :host {
        display: block;
        padding: 8px 0;

        background: var(--paper-listbox-background-color, var(--primary-background-color));
        color: var(--paper-listbox-color, var(--primary-text-color));

        @apply --paper-listbox;
      }
    </style>

    <slot></slot>
`,is:"paper-listbox",behaviors:[i.i],hostAttributes:{role:"listbox"}})},21560:(e,t,n)=>{n.d(t,{ZH:()=>c,MT:()=>r,U2:()=>p,RV:()=>o,t8:()=>l});const i=function(){if(!(!navigator.userAgentData&&/Safari\//.test(navigator.userAgent)&&!/Chrom(e|ium)\//.test(navigator.userAgent))||!indexedDB.databases)return Promise.resolve();let e;return new Promise((t=>{const n=()=>indexedDB.databases().finally(t);e=setInterval(n,100),n()})).finally((()=>clearInterval(e)))};function o(e){return new Promise(((t,n)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>n(e.error)}))}function r(e,t){const n=i().then((()=>{const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),o(n)}));return(e,i)=>n.then((n=>i(n.transaction(t,e).objectStore(t))))}let s;function a(){return s||(s=r("keyval-store","keyval")),s}function p(e,t=a()){return t("readonly",(t=>o(t.get(e))))}function l(e,t,n=a()){return n("readwrite",(n=>(n.put(t,e),o(n.transaction))))}function c(e=a()){return e("readwrite",(e=>(e.clear(),o(e.transaction))))}},57835:(e,t,n)=>{n.d(t,{Xe:()=>i.Xe,pX:()=>i.pX,XM:()=>i.XM});var i=n(38941)},1460:(e,t,n)=>{n.d(t,{l:()=>s});var i=n(15304),o=n(38941);const r={},s=(0,o.XM)(class extends o.Xe{constructor(){super(...arguments),this.nt=r}render(e,t){return t()}update(e,[t,n]){if(Array.isArray(t)){if(Array.isArray(this.nt)&&this.nt.length===t.length&&t.every(((e,t)=>e===this.nt[t])))return i.Jb}else if(this.nt===t)return i.Jb;return this.nt=Array.isArray(t)?Array.from(t):t,this.render(t,n)}})}}]);
//# sourceMappingURL=d14cb636.js.map