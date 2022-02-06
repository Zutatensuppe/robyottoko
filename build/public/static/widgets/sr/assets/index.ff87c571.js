import{d as p,r as f,o as r,c as o,a as l,b as I,e as g,n as P,f as O,F as A,g as D,h as $,t as h,i as w,j as N}from"./vendor.b80ab9a7.js";const R=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const d of a.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function s(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerpolicy&&(a.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?a.credentials="include":n.crossorigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(n){if(n.ep)return;n.ep=!0;const a=s(n);fetch(n.href,a)}};R();const W=(e=null)=>({name:(e==null?void 0:e.name)||"",css:(e==null?void 0:e.css)||"",showProgressBar:typeof(e==null?void 0:e.showProgressBar)=="undefined"?!1:e.showProgressBar,showThumbnails:typeof(e==null?void 0:e.showThumbnails)=="undefined"||e.showThumbnails===!0?"left":e.showThumbnails,maxItemsShown:typeof(e==null?void 0:e.maxItemsShown)=="undefined"?-1:e.maxItemsShown}),Y=(e=null)=>{var t,s,i,n;return{volume:typeof(e==null?void 0:e.volume)=="undefined"?100:e.volume,hideVideoImage:{file:((t=e==null?void 0:e.hideVideoImage)==null?void 0:t.file)||"",filename:((s=e==null?void 0:e.hideVideoImage)==null?void 0:s.filename)||"",urlpath:((i=e==null?void 0:e.hideVideoImage)==null?void 0:i.urlpath)?e.hideVideoImage.urlpath:((n=e==null?void 0:e.hideVideoImage)==null?void 0:n.file)?`/uploads/${encodeURIComponent(e.hideVideoImage.file)}`:""},customCss:(e==null?void 0:e.customCss)||"",customCssPresets:typeof(e==null?void 0:e.customCssPresets)=="undefined"?[]:e.customCssPresets.map(W),showProgressBar:typeof(e==null?void 0:e.showProgressBar)=="undefined"?!1:e.showProgressBar,initAutoplay:typeof(e==null?void 0:e.initAutoplay)=="undefined"?!0:e.initAutoplay,showThumbnails:typeof(e==null?void 0:e.showThumbnails)=="undefined"||e.showThumbnails===!0?"left":e.showThumbnails,maxItemsShown:typeof(e==null?void 0:e.maxItemsShown)=="undefined"?-1:e.maxItemsShown}};let c=[];const F=e=>{switch(e){case"error":c=["error"];break;case"info":c=["error","info"];break;case"log":c=["error","info","log"];break;case"debug":c=["error","info","log","debug"];break}};F("info");const C=(e,...t)=>{const s=e,i=n=>(...a)=>{c.includes(n)&&console[n](q("hh:mm:ss",new Date),`[${s}]`,...t,...a)};return{log:i("log"),info:i("info"),debug:i("debug"),error:i("error")}},q=(e,t)=>e.replace(/(hh|mm|ss)/g,(s,i)=>{switch(i){case"hh":return v(t.getHours(),"00");case"mm":return v(t.getMinutes(),"00");case"ss":return v(t.getSeconds(),"00");default:return s}}),v=(e,t)=>{const s=`${e}`;return s.length>=t.length?s:t.substr(0,t.length-s.length)+s},U=1001,S=4e3,T=C("WsWrapper.ts");class z{constructor(t,s){this.handle=null,this.reconnectTimeout=null,this.sendBuffer=[],this.onopen=()=>{},this.onclose=()=>{},this.onmessage=()=>{},this.addr=t,this.protocols=s}send(t){this.handle?this.handle.send(t):this.sendBuffer.push(t)}connect(){const t=new WebSocket(this.addr,this.protocols);t.onopen=s=>{for(this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.handle=t;this.sendBuffer.length>0;){const i=this.sendBuffer.shift();i&&this.handle.send(i)}this.onopen(s)},t.onmessage=s=>{this.onmessage(s)},t.onclose=s=>{this.handle=null,s.code===S?T.info("custom disconnect, will not reconnect"):s.code===U?T.info("going away, will not reconnect"):this.reconnectTimeout=setTimeout(()=>{this.connect()},1e3),this.onclose(s)}}disconnect(){this.handle&&this.handle.close(S)}}const k=C("WsClient.ts");class G extends z{constructor(t,s){super(t,s);this._on={},this.onopen=i=>{this._dispatch("socket","open",i)},this.onmessage=i=>{if(this._dispatch("socket","message",i),this._on.message){const n=this._parseMessageData(i.data);n.event&&this._dispatch("message",`${n.event}`,n.data)}},this.onclose=i=>{this._dispatch("socket","close",i)}}onSocket(t,s){this.addEventListener("socket",t,s)}onMessage(t,s){this.addEventListener("message",t,s)}addEventListener(t,s,i){const n=Array.isArray(s)?s:[s];this._on[t]=this._on[t]||{};for(const a of n)this._on[t][a]=this._on[t][a]||[],this._on[t][a].push(i)}_parseMessageData(t){try{const s=JSON.parse(t);if(s.event)return{event:s.event,data:s.data||null}}catch(s){k.info(s)}return{event:null,data:null}}_dispatch(t,s,...i){const a=(this._on[t]||{})[s]||[];if(a.length!==0){k.log(`ws dispatch ${t} ${s}`);for(const d of a)d(...i)}}}const V=(e,t)=>`${window[e]!==`{{${e}}}`?window[e]:t}`,J=V("wsUrl",""),H=V("widgetToken","");var K={wsClient:e=>new G(J+"/"+e,H)},m=(e,t)=>{const s=e.__vccOpts||e;for(const[i,n]of t)s[i]=n;return s};const Q=p({data(){return{ws:null,filter:{tag:""},hasPlayed:!1,playlist:[],settings:Y(),progress:0,progressInterval:null,inited:!1}},watch:{playlist:function(e,t){e.find((s,i)=>!this.isFilteredOut(s,i))||this.player.stop()},filter:function(e,t){this.playlist.find((s,i)=>!this.isFilteredOut(s,i))||this.player.stop()}},computed:{thumbnailClass(){return this.settings.showThumbnails==="left"?"with-thumbnails-left":this.settings.showThumbnails==="right"?"with-thumbnails-right":"without-thumbnails"},progressBarClass(){return this.settings.showProgressBar?"with-progress-bar":"without-progress-bar"},classes(){return[this.thumbnailClass,this.progressBarClass]},player(){return this.$refs.youtube},progressValueStyle(){return{width:`${this.progress*100}%`}},playlistItems(){const e=[];for(const t in this.playlist){const s=this.playlist[t];this.isFilteredOut(s,t)||(e[t]=s)}return e},filteredPlaylist(){return this.filter.tag===""?this.playlist:this.playlist.filter(e=>e.tags.includes(this.filter.tag))},hidevideo(){return this.item?this.item.hidevideo:!1},item(){return this.filteredPlaylist[0]},hasItems(){return this.filteredPlaylist.length!==0}},methods:{isFilteredOut(e,t){return this.settings.maxItemsShown>=0&&this.settings.maxItemsShown-1<t?!0:this.filter.tag!==""&&!e.tags.includes(this.filter.tag)},ended(){this.sendMsg({event:"ended"})},sendMsg(e){this.ws.send(JSON.stringify(e))},play(){this.hasPlayed=!0,this.adjustVolume(),this.hasItems&&(this.player.play(this.item.yt),this.sendMsg({event:"play",id:this.item.id}))},unpause(){this.hasItems&&(this.player.unpause(),this.sendMsg({event:"unpause",id:this.item.id}))},pause(){this.hasItems&&(this.player.pause(),this.sendMsg({event:"pause"}))},adjustVolume(){this.player&&this.player.setVolume(this.settings.volume)},applySettings(e){if(this.settings.customCss!==e.customCss){let t=document.getElementById("customCss");t&&t.parentElement.removeChild(t),t=document.createElement("style"),t.id="customCss",t.textContent=e.customCss,document.head.appendChild(t)}this.settings.showProgressBar!==e.showProgressBar&&(this.progressInterval&&window.clearInterval(this.progressInterval),e.showProgressBar&&(this.progressInterval=window.setInterval(()=>{this.player&&(this.progress=this.player.getProgress())},500))),this.settings=e,this.adjustVolume()}},mounted(){this.ws=K.wsClient("sr"),this.ws.onMessage(["save","settings"],e=>{this.applySettings(e.settings)}),this.ws.onMessage(["onEnded","prev","skip","remove","clear","move","tags"],e=>{this.applySettings(e.settings);const t=this.filteredPlaylist.length>0?this.filteredPlaylist[0].id:null;this.filter=e.filter,this.playlist=e.playlist;const s=this.filteredPlaylist.length>0?this.filteredPlaylist[0].id:null;t!==s&&this.play()}),this.ws.onMessage(["filter"],e=>{this.applySettings(e.settings);const t=this.filteredPlaylist.length>0?this.filteredPlaylist[0].id:null;this.filter=e.filter,this.playlist=e.playlist,this.filteredPlaylist.find(s=>s.id===t)||this.play()}),this.ws.onMessage(["pause"],e=>{this.player.playing()&&this.pause()}),this.ws.onMessage(["unpause"],e=>{this.player.playing()||(this.hasPlayed?this.unpause():this.play())}),this.ws.onMessage(["loop"],e=>{this.player.setLoop(!0)}),this.ws.onMessage(["noloop"],e=>{this.player.setLoop(!1)}),this.ws.onMessage(["dislike","like","video","playIdx","resetStats","shuffle"],e=>{this.applySettings(e.settings),this.filter=e.filter,this.playlist=e.playlist}),this.ws.onMessage(["add","init"],e=>{this.applySettings(e.settings),this.filter=e.filter,this.playlist=e.playlist,!this.inited&&!this.player.playing()&&this.settings.initAutoplay&&this.play(),this.inited=!0}),this.ws.connect()}}),X={class:"player video-16-9"},Z={key:1,class:"hide-video"},x={key:2,class:"progress"},b={class:"list"};function j(e,t,s,i,n,a){const d=f("responsive-image"),M=f("youtube"),E=f("list-item");return r(),o("div",{class:$(["wrapper",e.classes])},[l("div",X,[e.hidevideo&&e.settings.hideVideoImage.file?(r(),I(d,{key:0,class:"hide-video",src:e.settings.hideVideoImage.urlpath},null,8,["src"])):e.hidevideo?(r(),o("div",Z)):g("",!0),e.settings.showProgressBar?(r(),o("div",x,[l("div",{class:"progress-value",style:P(e.progressValueStyle)},null,4)])):g("",!0),O(M,{ref:"youtube",onEnded:e.ended},null,8,["onEnded"])]),l("ol",b,[(r(!0),o(A,null,D(e.playlistItems,(L,_)=>(r(),I(E,{class:$(_===0?"playing":"not-playing"),key:_,item:L,showThumbnails:e.settings.showThumbnails},null,8,["class","item","showThumbnails"]))),128))])],2)}var ee=m(Q,[["render",j]]);const te=p({name:"responsive-image",props:{src:String,title:String,height:{type:String,default:"100%"},width:{type:String,default:"100%"}},computed:{style(){return{display:"inline-block",verticalAlign:"text-bottom",backgroundImage:`url(${this.src})`,backgroundRepeat:"no-repeat",backgroundSize:"contain",backgroundPosition:"center",width:this.width,height:this.height}}}}),se=["title"];function ie(e,t,s,i,n,a){return r(),o("div",{class:"responsive-image",style:P(e.style),title:e.title},null,12,se)}var ne=m(te,[["render",ie]]);const u=(...e)=>console.log("[youtube.js]",...e);let B=!1;function ae(){return B?(u("ytapi ALREADY ready"),Promise.resolve()):new Promise(e=>{const t=document.createElement("script");t.src="https://www.youtube.com/iframe_api",document.head.append(t),window.onYouTubeIframeAPIReady=()=>{B=!0,u("ytapi ready"),e()}})}function le(e){return new Promise(t=>{u("create player on "+e);const s=new YT.Player(e,{playerVars:{iv_load_policy:3,modestbranding:1},events:{onReady:()=>{u("player ready"),t(s)}}})})}async function re(e){return await ae(),await le(e)}const oe=p({name:"youtube",props:{visible:{type:Boolean,default:!0}},data:()=>({id:"",yt:null,toplay:null,tovolume:null,tryPlayInterval:null}),created(){this.id=`yt-${Math.floor(Math.random()*99+1)}-${new Date().getTime()}`},methods:{getDuration(){return this.yt?this.yt.getDuration():0},getCurrentTime(){return this.yt?this.yt.getCurrentTime():0},getProgress(){const e=this.getDuration(),t=this.getCurrentTime();return e?t/e:0},stop(){this.yt&&this.yt.stopVideo()},stopTryPlayInterval(){this.tryPlayInterval&&(clearInterval(this.tryPlayInterval),this.tryPlayInterval=null)},tryPlay(){if(this.stopTryPlayInterval(),!this.visible)return;this.yt.playVideo();let e=20;this.tryPlayInterval=setInterval(()=>{if(u("playing",this.playing(),"triesRemaining",e),--e,this.playing()||e<0){u("stopping interval"),this.stopTryPlayInterval();return}this.yt.playVideo()},250)},play(e){this.yt?(this.yt.cueVideoById(e),this.tryPlay()):this.toplay=e},pause(){this.yt&&this.yt.pauseVideo()},unpause(){this.yt&&this.tryPlay()},setVolume(e){this.yt?this.yt.setVolume(e):this.tovolume=e},setLoop(e){this.loop=e},playing(){return this.yt&&this.yt.getPlayerState()===1}},async mounted(){this.yt=await re(this.id),this.tovolume!==null&&this.yt.setVolume(this.tovolume),this.toplay!==null&&(u("trying to play.."),this.play(this.toplay)),this.yt.addEventListener("onStateChange",e=>{e.data===YT.PlayerState.CUED?this.tryPlay():e.data===YT.PlayerState.ENDED&&(this.loop?this.tryPlay():this.$emit("ended"))})}}),he=["id"];function de(e,t,s,i,n,a){return r(),o("div",{id:e.id},null,8,he)}var ue=m(oe,[["render",de]]);const ce=p({props:{item:{type:Object,required:!0},showThumbnails:{required:!0}},template:" ",computed:{thumbnail(){return`https://i.ytimg.com/vi/${this.item.yt}/mqdefault.jpg`}}}),pe=["data-user","data-yt"],me={key:0,class:"thumbnail"},ye={class:"media-16-9"},fe=["src"],ge={class:"title"},we={class:"title-content title-orig"},ve={class:"title-content title-dupl"},_e={class:"meta meta-left"},Ie={class:"meta-user"},Pe=l("span",{class:"meta-user-text-before"},"requested by ",-1),$e={class:"meta-user-name"},Ce=l("span",{class:"meta-user-text-after"},null,-1),Se={class:"meta-plays"},Te=l("span",{class:"meta-plays-text-before"},"played ",-1),ke={class:"meta-plays-count"},Ve={class:"meta-plays-text-after"},Be={class:"meta meta-right vote"},Me={class:"meta-plays"},Ee=l("i",{class:"fa fa-repeat"},null,-1),Le={class:"vote-up"},Oe=l("i",{class:"fa fa-thumbs-up"},null,-1),Ae={class:"vote-down"},De=l("i",{class:"fa fa-thumbs-down"},null,-1);function Ne(e,t,s,i,n,a){return r(),o("li",{class:"item","data-user":e.item.user,"data-yt":e.item.yt},[e.showThumbnails!==!1?(r(),o("div",me,[l("div",ye,[l("img",{src:e.thumbnail},null,8,fe)])])):g("",!0),l("div",ge,[l("span",we,h(e.item.title||e.item.yt),1),l("span",ve,h(e.item.title||e.item.yt),1)]),l("div",_e,[l("span",Ie,[Pe,l("span",$e,h(e.item.user),1),Ce]),l("span",Se,[Te,l("span",ke,h(e.item.plays),1),l("span",Ve," time"+h(e.item.plays===1?"":"s"),1)])]),l("div",Be,[l("span",Me,[Ee,w(" "+h(e.item.plays),1)]),l("span",Le,[Oe,w(" "+h(e.item.goods),1)]),l("span",Ae,[De,w(" "+h(e.item.bads),1)])])],8,pe)}var Re=m(ce,[["render",Ne]]);const y=N(ee);y.component("responsive-image",ne);y.component("youtube",ue);y.component("list-item",Re);y.mount("#app");