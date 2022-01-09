import{d as c,c as l,n as h,o as a,r as g,a as b,F as k,b as w,e as v,f as y,g as _}from"./vendor.7b9d16b9.js";const S=function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function s(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerpolicy&&(o.referrerPolicy=i.referrerpolicy),i.crossorigin==="use-credentials"?o.credentials="include":i.crossorigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=s(i);fetch(i.href,o)}};S();var d=(t,e)=>{const s=t.__vccOpts||t;for(const[n,i]of e)s[n]=i;return s};const $=c({props:{frames:{type:Array,required:!0},width:{type:Number,required:!1,default:64},height:{type:Number,required:!1,default:64}},data(){return{timeout:null,idx:-1}},watch:{frames:{handler(t,e){this.nextFrame()},deep:!0}},computed:{src(){return this.idx>=0&&this.idx<this.frames.length?this.frames[this.idx].url:""}},methods:{nextFrame(){if(this.frames.length===0){this.idx=-1;return}this.timeout&&(clearTimeout(this.timeout),this.timeout=null),this.idx++,this.idx>=this.frames.length&&(this.idx=0),this.timeout=setTimeout(()=>{this.nextFrame()},this.frames[this.idx].duration)}},created(){this.nextFrame()},unmounted(){this.timeout&&(clearTimeout(this.timeout),this.timeout=null)}}),T=["src","width","height"];function N(t,e,s,n,i,o){return a(),l("span",{class:"avatar-animation",style:h({width:`${t.width}px`,height:`${t.width}px`})},[t.src?(a(),l("img",{key:0,src:t.src,width:t.width,height:t.height},null,8,T)):(a(),l("span",{key:1,style:h({width:`${t.width}px`,height:`${t.width}px`,display:"inline-block"})},null,4))],4)}var C=d($,[["render",N]]);const D=1001,u=4e3;class O{constructor(e,s){this.handle=null,this.reconnectTimeout=null,this.sendBuffer=[],this.onopen=()=>{},this.onclose=()=>{},this.onmessage=()=>{},this.addr=e,this.protocols=s}send(e){this.handle?this.handle.send(e):this.sendBuffer.push(e)}connect(){let e=new WebSocket(this.addr,this.protocols);e.onopen=s=>{for(this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.handle=e;this.sendBuffer.length>0;){const n=this.sendBuffer.shift();n&&this.handle.send(n)}this.onopen(s)},e.onmessage=s=>{this.onmessage(s)},e.onclose=s=>{this.handle=null,s.code===u||s.code===D||(this.reconnectTimeout=setTimeout(()=>{this.connect()},1e3)),this.onclose(s)}}disconnect(){this.handle&&this.handle.close(u)}}const x=(...t)=>console.log("[WsClient.ts]",...t);class A extends O{constructor(e,s){super(e,s);this._on={},this.onopen=n=>{this._dispatch("socket","open",n)},this.onmessage=n=>{if(this._dispatch("socket","message",n),this._on.message){const i=this._parseMessageData(n.data);i.event&&this._dispatch("message",i.event,i.data)}},this.onclose=n=>{this._dispatch("socket","close",n)}}onSocket(e,s){this.addEventListener("socket",e,s)}onMessage(e,s){this.addEventListener("message",e,s)}addEventListener(e,s,n){const i=Array.isArray(s)?s:[s];this._on[e]=this._on[e]||{};for(const o of i)this._on[e][o]=this._on[e][o]||[],this._on[e][o].push(n)}_parseMessageData(e){try{const s=JSON.parse(e);if(s.event)return{event:s.event,data:s.data||null}}catch{}return{event:null,data:null}}_dispatch(e,s,...n){const o=(this._on[e]||{})[s]||[];if(o.length!==0){x(`ws dispatch ${e} ${s}`);for(const r of o)r(...n)}}}const f=(t,e)=>`${window[t]!==`{{${t}}}`?window[t]:e}`,E=f("wsUrl",""),F=f("widgetToken","");var L={wsClient:t=>new A(E+"/"+t,F)};const B=c({components:{AvatarAnimation:C},data(){return{speaking:!1,lockedState:"default",initialized:!1,tuber:{slot:{}},tuberDef:null,settings:null}},computed:{animationName(){return this.lockedState!=="default"?this.lockedState:this.speaking?"speaking":"default"},animations(){return this.tuberDef.slotDefinitions.map(t=>{const e=t.items[this.tuber.slot[t.slot]],s=e.states.find(({state:n})=>n===this.animationName);return s.frames.length>0?s:e.states.find(({state:n})=>n==="default")})}},methods:{setSlot(t,e){this.tuber.slot[t]=e,this.tuber.slot=Object.assign({},this.tuber.slot)},setSpeaking(t){this.speaking!==t&&(this.speaking=t)},lockState(t){this.lockedState!==t&&(this.lockedState=t)},setTuber(t){this.tuber.slot={},this.tuberDef=JSON.parse(JSON.stringify(t)),this.tuberDef.slotDefinitions.forEach(e=>{this.tuber.slot[e.slot]=e.defaultItemIndex})},applyStyles(){const t=this.settings.styles;t.bgColor!=null&&(document.bgColor=t.bgColor)}},mounted(){this.ws=L.wsClient("avatar"),this.ws.onMessage("init",t=>{this.settings=t.settings,this.$nextTick(()=>{this.applyStyles()}),this.setTuber(this.settings.avatarDefinitions[0]),this.initialized=!0}),this.ws.onMessage("ctrl",({data:t})=>{if(t.ctrl==="setSlot"){const e=t.args[0],s=t.args[1];this.setSlot(e,s)}else if(t.ctrl==="setSpeaking"){const e=t.args[0];this.setSpeaking(e)}else if(t.ctrl==="lockState"){const e=t.args[0];this.lockState(e)}else if(t.ctrl==="setTuber"){const e=t.args[0];this.setTuber(e)}}),this.ws.connect()}}),M={key:0,class:"base"};function I(t,e,s,n,i,o){const r=g("avatar-animation");return t.initialized?(a(),l("div",M,[b("div",{class:"avatar",style:h({width:`${t.tuberDef.width}px`,height:`${t.tuberDef.height}px`})},[(a(!0),l(k,null,w(t.animations,(m,p)=>(a(),y(r,{key:p,frames:m.frames,width:t.tuberDef.width,height:t.tuberDef.height},null,8,["frames","width","height"]))),128))],4)])):v("",!0)}var W=d(B,[["render",I]]);const q=_(W);q.mount("#app");
