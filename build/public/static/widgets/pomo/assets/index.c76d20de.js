import{d as F,c as u,a as T,n as N,b as W,e as $,F as I,o as c,r as H,t as E,f as R,g as q}from"./vendor.44b44306.js";const A=function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerpolicy&&(i.referrerPolicy=o.referrerpolicy),o.crossorigin==="use-credentials"?i.credentials="include":o.crossorigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}};A();const U=1,p=1e3*U,g=60*p,w=60*g,b=24*w;let f=[];const V=e=>{switch(e){case"error":f=["error"];break;case"info":f=["error","info"];break;case"log":f=["error","info","log"];break;case"debug":f=["error","info","log","debug"];break}};V("info");const O=(e,...s)=>{const t=e,n=o=>(...i)=>{f.includes(o)&&console[o](Q("hh:mm:ss",new Date),`[${t}]`,...s,...i)};return{log:n("log"),info:n("info"),debug:n("debug"),error:n("error")}},z=e=>[...e].length,Q=(e,s)=>e.replace(/(hh|mm|ss)/g,(t,n)=>{switch(n){case"hh":return M(s.getHours(),"00");case"mm":return M(s.getMinutes(),"00");case"ss":return M(s.getSeconds(),"00");default:return t}}),M=(e,s)=>{const t=`${e}`;return t.length>=s.length?t:s.substr(0,s.length-t.length)+t},C=(e,s=!1)=>{if(e==="")throw new Error("unable to parse duration");const t=`${e}`.trim();if(!t)throw new Error("unable to parse duration");const n=l=>{if(l<0&&!s)throw new Error("negative value not allowed");return l};if(t.match(/^-?\d+$/))return n(parseInt(t,10));const o=t.match(/^(-?(?:\d*)\.(?:\d*))(d|h|m|s)$/);if(o){const l=parseFloat(o[1]);if(isNaN(l))throw new Error("unable to parse duration");const y=o[2];let m=0;return y==="d"?m=l*b:y==="h"?m=l*w:y==="m"?m=l*g:y==="s"&&(m=l*p),n(Math.round(m))}const i=t.match(/^(-?)(?:(\d+)d)?\s?(?:(\d+)h)?\s?(?:(\d+)m)?\s?(?:(\d+)s)?\s?(?:(\d+)ms)?$/);if(!i)throw new Error("unable to parse duration");const r=i[1]?-1:1,_=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,h=i[4]?parseInt(i[4],10):0,d=i[5]?parseInt(i[5],10):0,v=i[6]?parseInt(i[6],10):0;return n(r*(d*p+h*g+a*w+_*b+v))},j=(e,s=!1)=>{try{return C(e,s)}catch{return 0}},G=(e,s=["ms","s","m","h","d"])=>{let t=e;const n=Math.floor(t/b);t=t%b;const o=Math.floor(t/w);t=t%w;const i=Math.floor(t/g);t=t%g;const r=Math.floor(t/p);t=t%p;const a=[t,r,i,o,n];let h=0;for(;h<a.length&&a[h]===0;)h++;let d=a.length-1;for(;d>=0&&a[d]===0;)d--;const v=[];for(let l=h;l<=d;l++)v.unshift(`${a[l]}${s[l]}`);return v.join(" ")};function J(e,s,t){if(t>=e.length){let n=t-e.length+1;for(;n--;)e.push(void 0)}return e.splice(t,0,e.splice(s,1)[0]),e}const Y=(e,s)=>{const t=[/\$args(?:\((\d*)(:?)(\d*)\))?/g,/\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,/\$var\(([^)]+)\)/g,/\$user(?:\(([^)]+)\)|())\.(name|profile_image_url|recent_clip_url|last_stream_category)/g,/\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,/\$customapi\(([^$)]*)\)/g,/\$urlencode\(([^$)]*)\)/g,/\$calc\((\d+)([*/+-])(\d+)\)/g];let n=e,o;do{o=n;for(const i of t)n=n.replace(i,s)}while(o!==n);return n},K=(e,s=",",t=-1)=>{const n=e.split(s);return t===-1||n.length<=t?n:[...n.slice(0,t-1),n.slice(t-1).join(s)]},Z=e=>{let s=e.length;for(;s>0;){const t=Math.floor(Math.random()*s);s--;const n=e[s];e[s]=e[t],e[t]=n}return e};function X(e){return{filename:e.originalname,file:e.filename,urlpath:e.urlpath}}function x(e){return{filename:e.originalname,file:e.filename,urlpath:e.urlpath,volume:100}}var k={unicodeLength:z,arrayMove:J,humanDuration:G,parseHumanDuration:j,mustParseHumanDuration:C,doDummyReplacements:Y,split:K,shuffle:Z,pad:M,mediaFileFromUploadedFile:X,soundMediaFileFromUploadedFile:x};const ee=1001,S=4e3,L=O("WsWrapper.ts");class te{constructor(s,t){this.handle=null,this.reconnectTimeout=null,this.sendBuffer=[],this.onopen=()=>{},this.onclose=()=>{},this.onmessage=()=>{},this.addr=s,this.protocols=t}send(s){this.handle?this.handle.send(s):this.sendBuffer.push(s)}connect(){const s=new WebSocket(this.addr,this.protocols);s.onopen=t=>{for(this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.handle=s;this.sendBuffer.length>0;){const n=this.sendBuffer.shift();n&&this.handle.send(n)}this.onopen(t)},s.onmessage=t=>{this.onmessage(t)},s.onclose=t=>{this.handle=null,t.code===S?L.info("custom disconnect, will not reconnect"):t.code===ee?L.info("going away, will not reconnect"):this.reconnectTimeout=setTimeout(()=>{this.connect()},1e3),this.onclose(t)}}disconnect(){this.handle&&this.handle.close(S)}}const D=O("WsClient.ts");class se extends te{constructor(s,t){super(s,t);this._on={},this.onopen=n=>{this._dispatch("socket","open",n)},this.onmessage=n=>{if(this._dispatch("socket","message",n),this._on.message){const o=this._parseMessageData(n.data);o.event&&this._dispatch("message",`${o.event}`,o.data)}},this.onclose=n=>{this._dispatch("socket","close",n)}}onSocket(s,t){this.addEventListener("socket",s,t)}onMessage(s,t){this.addEventListener("message",s,t)}addEventListener(s,t,n){const o=Array.isArray(t)?t:[t];this._on[s]=this._on[s]||{};for(const i of o)this._on[s][i]=this._on[s][i]||[],this._on[s][i].push(n)}_parseMessageData(s){try{const t=JSON.parse(s);if(t.event)return{event:t.event,data:t.data||null}}catch(t){D.info(t)}return{event:null,data:null}}_dispatch(s,t,...n){const i=(this._on[s]||{})[t]||[];if(i.length!==0){D.log(`ws dispatch ${s} ${t}`);for(const r of i)r(...n)}}}const B=(e,s)=>`${window[e]!==`{{${e}}}`?window[e]:s}`,ne=B("wsUrl",""),oe=B("widgetToken","");var ie={wsClient:e=>new se(ne+"/"+e,oe)};var P=(e,s)=>{const t=e.__vccOpts||e;for(const[n,o]of s)t[n]=o;return t};const re=F({props:{timeBetweenMediaMs:{type:Number,default:400},baseVolume:{type:Number,default:100},displayLatestForever:{type:Boolean,default:!1}},data(){return{queue:[],worker:null,showimage:!1,imgstyle:null,videosrc:"",latestResolved:!0}},methods:{async _playone(e){return new Promise(async s=>{this.latestResolved=!1;const t=[];e.twitch_clip.url&&(this.videosrc=e.twitch_clip.url,t.push(new Promise(n=>{this.$nextTick(()=>{this.$refs.video.volume=e.twitch_clip.volume?100/e.twitch_clip.volume:0,this.$refs.video.addEventListener("ended",()=>{n()})})}))),e.image_url?(this.showimage=!0,this.imgstyle={backgroundImage:`url(${e.image_url})`}):e.image&&e.image.file&&(await this._prepareImage(e.image.urlpath),this.showimage=!0,this.imgstyle={backgroundImage:`url(${e.image.urlpath})`}),e.minDurationMs&&t.push(new Promise(n=>{setTimeout(n,k.parseHumanDuration(e.minDurationMs))})),e.sound&&e.sound.file&&t.push(new Promise(n=>{const o=new Audio(e.sound.urlpath);o.addEventListener("ended",()=>{n()});const i=this.baseVolume/100,r=e.sound.volume/100;o.volume=i*r,o.play()})),t.length===0&&t.push(new Promise(n=>{setTimeout(n,1e3)})),Promise.all(t).then(n=>{this.displayLatestForever||(this.showimage=!1),this.latestResolved=!0,this.videosrc="",s()})})},_addQueue(e){if(this.queue.push(e),this.worker)return;const s=async()=>{if(this.queue.length===0){clearInterval(this.worker),this.worker=null;return}const t=this.queue.shift();if(!t){clearInterval(this.worker),this.worker=null;return}await this._playone(t),this.worker=setTimeout(s,this.timeBetweenMediaMs)};this.worker=setTimeout(s,this.timeBetweenMediaMs)},async _prepareImage(e){return new Promise(s=>{const t=new Image;t.src=e,this.$nextTick(()=>{t.loaded?s():t.onload=s})})},playmedia(e){!this.displayLatestForever&&this.latestResolved&&(this.showimage=!1),this._addQueue(e)}}}),ae={key:0,class:"video-container"},le={class:"video-16-9"},ue=["src"];function ce(e,s,t,n,o,i){return c(),u(I,null,[T("div",{style:N(e.imgstyle),class:W(["image-container",{"m-fadeIn":e.showimage,"m-fadeOut":!e.showimage}])},null,6),e.videosrc?(c(),u("div",ae,[T("div",le,[T("video",{src:e.videosrc,ref:"video",autoplay:""},null,8,ue)])])):$("",!0)],64)}var he=P(re,[["render",ce],["__scopeId","data-v-3ece661a"]]);const de=F({components:{MediaQueueElement:he},data(){return{ws:null,data:null,timeout:null,now:null}},computed:{showTimerWhenFinished(){return this.data?!!this.data.settings.showTimerWhenFinished:!1},finishedText(){return this.data?this.data.settings.finishedText:!1},finishined(){return this.timeLeft<=0},running(){return this.data?!!this.data.state.running:!1},timeLeftHumanReadable(){const e=Math.max(this.timeLeft,0),t=1e3*1,n=60*t,o=60*n,i=k.pad(Math.floor(e/o),"00"),r=k.pad(Math.floor(e%o/n),"00"),_=k.pad(Math.floor(e%o%n/t),"00");let a=this.data.settings.timerFormat;return a=a.replace("{hh}",i),a=a.replace("{mm}",r),a=a.replace("{ss}",_),a},timeLeft(){return!this.dateEnd||!this.now?0:this.dateEnd.getTime()-this.now.getTime()},dateEnd(){return!this.dateStarted||!this.data?null:new Date(this.dateStarted.getTime()+this.data.state.durationMs)},dateStarted(){return this.data?new Date(JSON.parse(this.data.state.startTs)):null},widgetStyles(){return this.data?{fontFamily:this.data.settings.fontFamily,fontSize:this.data.settings.fontSize,color:this.data.settings.color}:{}}},methods:{tick(){this.timeout&&clearTimeout(this.timeout),this.timeout=setTimeout(()=>{this.now=new Date,this.data.state.running&&this.tick()},1e3)}},mounted(){this.ws=ie.wsClient("pomo"),this.ws.onMessage("init",e=>{this.data=e,this.tick()}),this.ws.onMessage("effect",e=>{this.$refs.q.playmedia({sound:e.sound,image:{file:"",filename:"",urlpath:""},twitch_clip:{url:"",volume:100},image_url:"",minDurationMs:0})}),this.ws.connect()},unmounted(){this.timeout&&clearTimeout(this.timeout)}}),me={key:0},fe={key:1},pe={key:0},ge={key:1};function we(e,s,t,n,o,i){const r=H("media-queue-element");return c(),u(I,null,[e.running?(c(),u("div",{key:0,style:N(e.widgetStyles)},[e.finishined?(c(),u("div",fe,[e.showTimerWhenFinished?(c(),u("span",pe,E(e.timeLeftHumanReadable),1)):$("",!0),e.finishedText?(c(),u("span",ge,E(e.finishedText),1)):$("",!0)])):(c(),u("div",me,E(e.timeLeftHumanReadable),1))],4)):$("",!0),R(r,{ref:"q",timeBetweenMediaMs:100},null,512)],64)}var _e=P(de,[["render",we]]);const ve=q(_e);ve.mount("#app");
