import{d as C,c as l,n as k,o,r as F,a,F as f,b as g,e as v,f as O,g as S,t as b,h as L}from"./vendor.528cc8c7.js";const z=function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function s(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerpolicy&&(r.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?r.credentials="include":n.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=s(n);fetch(n.href,r)}};z();var I=(t,e)=>{const s=t.__vccOpts||t;for(const[i,n]of e)s[i]=n;return s};const B=C({props:{frames:{type:Array,required:!0},width:{type:Number,required:!1,default:64},height:{type:Number,required:!1,default:64}},data(){return{timeout:null,idx:-1}},computed:{src(){return this.idx>=0&&this.idx<this.frames.length?this.frames[this.idx].url:""}},methods:{nextFrame(){if(this.frames.length===0){this.idx=-1;return}this.timeout&&(clearTimeout(this.timeout),this.timeout=null),this.idx++,this.idx>=this.frames.length&&(this.idx=0),this.timeout=setTimeout(()=>{this.nextFrame()},this.frames[this.idx].duration)}},created(){this.nextFrame(),this.$watch("frames",()=>{this.idx=-1,this.nextFrame()},{deep:!0})},unmounted(){this.timeout&&(clearTimeout(this.timeout),this.timeout=null)}}),P=["src","width","height"];function U(t,e,s,i,n,r){return o(),l("span",{class:"avatar-animation",style:k({width:`${t.width}px`,height:`${t.width}px`})},[t.src?(o(),l("img",{key:0,src:t.src,width:t.width,height:t.height},null,8,P)):(o(),l("span",{key:1,style:k({width:`${t.width}px`,height:`${t.width}px`,display:"inline-block"})},null,4))],4)}var W=I(B,[["render",U]]);function D(t){this.context=t,this.instant=0,this.slow=0,this.clip=0,this.script=t.createScriptProcessor(2048,1,1),this.script.onaudioprocess=e=>{const s=e.inputBuffer.getChannelData(0);let i,n=0,r=0;for(i=0;i<s.length;++i)n+=s[i]*s[i],Math.abs(s[i])>.99&&(r+=1);this.instant=Math.sqrt(n/s.length),this.slow=.95*this.slow+.05*this.instant,this.clip=r/s.length}}D.prototype.connectToSource=function(t,e){try{this.mic=this.context.createMediaStreamSource(t),this.mic.connect(this.script),this.script.connect(this.context.destination),typeof e!="undefined"&&e(null)}catch(s){console.error(s),typeof e!="undefined"&&e(s)}};D.prototype.stop=function(){this.mic.disconnect(),this.script.disconnect()};let m=[];const q=t=>{switch(t){case"error":m=["error"];break;case"info":m=["error","info"];break;case"log":m=["error","info","log"];break;case"debug":m=["error","info","log","debug"];break}};q("info");const _=(t,...e)=>{const s=t,i=n=>(...r)=>{m.includes(n)&&console[n](G("hh:mm:ss",new Date),`[${s}]`,...e,...r)};return{log:i("log"),info:i("info"),debug:i("debug"),error:i("error")}},G=(t,e)=>t.replace(/(hh|mm|ss)/g,(s,i)=>{switch(i){case"hh":return T(e.getHours(),"00");case"mm":return T(e.getMinutes(),"00");case"ss":return T(e.getSeconds(),"00");default:return s}}),T=(t,e)=>{const s=`${t}`;return s.length>=e.length?s:e.substr(0,e.length-s.length)+s},J=1001,$=4e3,x=_("WsWrapper.ts");class H{constructor(e,s){this.handle=null,this.reconnectTimeout=null,this.sendBuffer=[],this.onopen=()=>{},this.onclose=()=>{},this.onmessage=()=>{},this.addr=e,this.protocols=s}send(e){this.handle?this.handle.send(e):this.sendBuffer.push(e)}connect(){const e=new WebSocket(this.addr,this.protocols);e.onopen=s=>{for(this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.handle=e;this.sendBuffer.length>0;){const i=this.sendBuffer.shift();i&&this.handle.send(i)}this.onopen(s)},e.onmessage=s=>{this.onmessage(s)},e.onclose=s=>{this.handle=null,s.code===$?x.info("custom disconnect, will not reconnect"):s.code===J?x.info("going away, will not reconnect"):this.reconnectTimeout=setTimeout(()=>{this.connect()},1e3),this.onclose(s)}}disconnect(){this.handle&&this.handle.close($)}}const E=_("WsClient.ts");class K extends H{constructor(e,s){super(e,s);this._on={},this.onopen=i=>{this._dispatch("socket","open",i)},this.onmessage=i=>{if(this._dispatch("socket","message",i),this._on.message){const n=this._parseMessageData(i.data);n.event&&this._dispatch("message",`${n.event}`,n.data)}},this.onclose=i=>{this._dispatch("socket","close",i)}}onSocket(e,s){this.addEventListener("socket",e,s)}onMessage(e,s){this.addEventListener("message",e,s)}addEventListener(e,s,i){const n=Array.isArray(s)?s:[s];this._on[e]=this._on[e]||{};for(const r of n)this._on[e][r]=this._on[e][r]||[],this._on[e][r].push(i)}_parseMessageData(e){try{const s=JSON.parse(e);if(s.event)return{event:s.event,data:s.data||null}}catch(s){E.info(s)}return{event:null,data:null}}_dispatch(e,s,...i){const r=(this._on[e]||{})[s]||[];if(r.length!==0){E.log(`ws dispatch ${e} ${s}`);for(const c of r)c(...i)}}}const M=(t,e)=>`${window[t]!==`{{${t}}}`?window[t]:e}`,R=M("wsUrl",""),V=M("widgetToken","");var Y={wsClient:t=>new K(R+"/"+t,V)};const Q=(t=null)=>{const e=(s,i,n)=>s?typeof s[i]=="undefined"?n:s[i]:n;return{name:e(t,"name",""),width:e(t,"width",64),height:e(t,"height",64),stateDefinitions:e(t,"stateDefinitions",[]),slotDefinitions:e(t,"slotDefinitions",[]),state:e(t,"state",{slots:{},lockedState:""})}},X=(t=null)=>{var e,s;return{styles:{bgColor:typeof((e=t==null?void 0:t.styles)==null?void 0:e.bgColor)!="undefined"?t.styles.bgColor:"#80ff00",bgColorEnabled:typeof((s=t==null?void 0:t.styles)==null?void 0:s.bgColorEnabled)!="undefined"?t.styles.bgColorEnabled:!0},avatarDefinitions:typeof(t==null?void 0:t.avatarDefinitions)!="undefined"?t.avatarDefinitions.map(Q):[]}},d=_("Page.vue"),p="default",Z="speaking",A={state:p,frames:[]},N=.05,j=C({components:{AvatarAnimation:W},props:{controls:{type:Boolean,required:!0}},data(){return{ws:null,speaking:!1,initialized:!1,audioInitialized:!1,tuberIdx:-1,avatarFixed:"",settings:X()}},computed:{tuberDef(){return this.tuberIdx<0||this.tuberIdx>=this.settings.avatarDefinitions.length?null:this.settings.avatarDefinitions[this.tuberIdx]},slots(){const t=this.tuberDef;return t?t.state.slots:{}},lockedState(){var t;return((t=this.tuberDef)==null?void 0:t.state.lockedState)||p},animationName(){return this.lockedState!==p?this.lockedState:this.speaking?Z:p},animations(){return this.tuberDef?this.tuberDef.slotDefinitions.map(this.getSlotStateDefinition):[]}},methods:{getSlotStateDefinition(t){const e=this.getItem(t);if(!e)return A;const s=e.states.find(({state:i})=>i===this.animationName);return s&&s.frames.length>0?s:e.states.find(({state:i})=>i===p)||A},getItem(t){if(t.items.length===0)return null;let e=this.slots[t.slot];return typeof e=="undefined"&&(e=t.defaultItemIndex),(e<0||e>=t.items.length)&&(e=0),t.items[e]},ctrl(t,e){if(!this.ws){d.error("ctrl: this.ws not initialized");return}this.ws.send(JSON.stringify({event:"ctrl",data:{ctrl:t,args:e}}))},setSlot(t,e,s=!1){this.slots[t]!==e&&(this.settings.avatarDefinitions[this.tuberIdx].state.slots[t]=e,s&&this.ctrl("setSlot",[this.tuberIdx,t,e]))},setSpeaking(t,e=!1){this.speaking!==t&&(this.speaking=t,e&&this.ctrl("setSpeaking",[this.tuberIdx,t]))},lockState(t,e=!1){this.lockedState!==t&&(this.settings.avatarDefinitions[this.tuberIdx].state.lockedState=t,e&&this.ctrl("lockState",[this.tuberIdx,t]))},setTuber(t,e=!1){if(!this.settings){d.error("setTuber: this.settings not initialized");return}if(this.avatarFixed&&(t=this.settings.avatarDefinitions.findIndex(r=>r.name===this.avatarFixed)),t>=this.settings.avatarDefinitions.length&&(d.info("setTuber: index out of bounds. using index 0"),t=0),t<0||t>=this.settings.avatarDefinitions.length){d.error("setTuber: index out of bounds");return}const s=this.settings.avatarDefinitions[t],i=JSON.stringify(s),n=JSON.stringify(this.tuberDef);i!==n&&(this.tuberIdx=t,e&&this.ctrl("setTuber",[this.tuberIdx]))},startMic(){if(this.audioInitialized)return;if(this.audioInitialized=!0,!navigator.mediaDevices.getUserMedia){alert("navigator.mediaDevices.getUserMedia not supported in this browser.");return}const t=window.AudioContext||window.webkitAudioContext,e=new t;navigator.mediaDevices.getUserMedia({audio:!0}).then(s=>{const i=new D(e);i.connectToSource(s,n=>{if(n){d.error(n);return}setInterval(()=>{const r=this.speaking?N/2:N;this.setSpeaking(i.instant>r,!0)},100)})}).catch(s=>{d.error(s),alert("Error capturing audio.")})},applyStyles(){if(!this.settings){d.error("applyStyles: this.settings not initialized");return}const t=this.settings.styles;t.bgColorEnabled&&t.bgColor!=null?document.body.style.backgroundColor=t.bgColor:document.body.style.backgroundColor=""}},created(){const t=new Proxy(new URLSearchParams(window.location.search),{get:(e,s)=>e.get(s)});t.avatar&&(this.avatarFixed=`${t.avatar}`)},mounted(){this.ws=Y.wsClient("avatar"),this.ws.onMessage("init",t=>{this.settings=t.settings,this.$nextTick(()=>{this.applyStyles()});let e=t.state.tuberIdx;this.avatarFixed&&(e=this.settings.avatarDefinitions.findIndex(s=>s.name===this.avatarFixed)),this.setTuber(e===-1?0:e),this.initialized=!0}),this.ws.onMessage("ctrl",({data:t})=>{if(t.ctrl==="setSlot"){const e=t.args[0];if(this.tuberIdx===e){const s=t.args[1],i=t.args[2];this.setSlot(s,i)}}else if(t.ctrl==="setSpeaking"){const e=t.args[0];if(this.tuberIdx===e){const s=t.args[1];this.setSpeaking(s)}}else if(t.ctrl==="lockState"){const e=t.args[0];if(this.tuberIdx===e){const s=t.args[1];this.lockState(s)}}else if(t.ctrl==="setTuber"){const e=t.args[0];this.setTuber(e)}}),this.ws.connect()}}),tt={key:0,class:"base"},et={key:0},st={key:0},it=a("td",null,"Tubers:",-1),nt=["onClick"],rt={key:1},ot=a("td",{colspan:"2"},[a("hr")],-1),at=[ot],lt=a("td",null,"Start Mic",-1),ht=a("tr",null,[a("td",{colspan:"2"},[a("hr")])],-1),ut=["onClick"],ct=a("td",null,"State:",-1),dt=["onClick"];function ft(t,e,s,i,n,r){const c=F("avatar-animation");return t.initialized?(o(),l("div",tt,[a("div",{class:"avatar",style:k({width:`${t.tuberDef.width}px`,height:`${t.tuberDef.height}px`})},[(o(!0),l(f,null,g(t.animations,(h,u)=>(o(),O(c,{key:u,frames:h.frames,width:t.tuberDef.width,height:t.tuberDef.height},null,8,["frames","width","height"]))),128))],4),t.controls?(o(),l("table",et,[this.avatarFixed?v("",!0):(o(),l("tr",st,[it,a("td",null,[(o(!0),l(f,null,g(t.settings.avatarDefinitions,(h,u)=>(o(),l("button",{key:u,onClick:w=>t.setTuber(u,!0),class:S({active:t.tuberIdx===u})},b(h.name),11,nt))),128))])])),this.avatarFixed?v("",!0):(o(),l("tr",rt,at)),a("tr",null,[lt,a("td",null,[a("button",{onClick:e[0]||(e[0]=(...h)=>t.startMic&&t.startMic(...h))},"Start")])]),ht,(o(!0),l(f,null,g(t.tuberDef.slotDefinitions,(h,u)=>(o(),l("tr",{key:u},[a("td",null,b(h.slot)+":",1),a("td",null,[(o(!0),l(f,null,g(h.items,(w,y)=>(o(),l("button",{key:y,onClick:pt=>t.setSlot(h.slot,y,!0),class:S({active:t.slots[h.slot]===y})},b(w.title),11,ut))),128))])]))),128)),a("tr",null,[ct,a("td",null,[(o(!0),l(f,null,g(t.tuberDef.stateDefinitions,(h,u)=>(o(),l("button",{key:u,onClick:w=>t.lockState(h.value,!0),class:S({active:t.lockedState===h.value})},b(h.value),11,dt))),128))])])])):v("",!0)])):v("",!0)}var gt=I(j,[["render",ft]]);const mt=L(gt,{controls:!0});mt.mount("#app");
