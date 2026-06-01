const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/js/onboarding-page-_g1FcZaT.js","assets/js/stack-recommender-BUZ5Bm5D.js","assets/js/escape-Br5wU8qn.js","assets/js/home-page-Dxi8ciRj.js","assets/js/list-page-BKDZh3Cl.js","assets/js/vendor-CMLop-UK.js","assets/js/evidence-D5RtUc7g.js","assets/js/affiliate-engine-YaoYSCQt.js","assets/js/my-stack-page-2thG0ifW.js","assets/js/checkin-page-DT3Q10Z2.js","assets/js/history-page-B31XNWQv.js","assets/js/favorites-page-q8eck3jf.js","assets/js/calculator-page-B2K9KsUN.js","assets/js/profile-page-CcquDUGL.js"])))=>i.map(i=>d[i]);
var G=Object.defineProperty;var B=i=>{throw TypeError(i)};var q=(i,e,t)=>e in i?G(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var E=(i,e,t)=>q(i,typeof e!="symbol"?e+"":e,t),N=(i,e,t)=>e.has(i)||B("Cannot "+t);var v=(i,e,t)=>(N(i,e,"read from private field"),t?t.call(i):e.get(i)),w=(i,e,t)=>e.has(i)?B("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),R=(i,e,t,s)=>(N(i,e,"write to private field"),s?s.call(i,t):e.set(i,t),t),S=(i,e,t)=>(N(i,e,"access private method"),t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(r){if(r.ep)return;r.ep=!0;const n=t(r);fetch(r.href,n)}})();const $="modulepreload",Y=function(i){return"/"+i},F={},g=function(e,t,s){let r=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");r=Promise.allSettled(t.map(l=>{if(l=Y(l),l in F)return;F[l]=!0;const p=l.endsWith(".css"),m=p?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${m}`))return;const u=document.createElement("link");if(u.rel=p?"stylesheet":$,p||(u.as="script"),u.crossOrigin="",u.href=l,a&&u.setAttribute("nonce",a),document.head.appendChild(u),p)return new Promise((h,O)=>{u.addEventListener("load",h),u.addEventListener("error",()=>O(new Error(`Unable to preload CSS for ${l}`)))})}))}function n(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return r.then(o=>{for(const a of o||[])a.status==="rejected"&&n(a.reason);return e().catch(n)})},Q={info:()=>{},warn:()=>{},error:()=>{},debug:()=>{}},W=Object.freeze({APP_READY:"app:ready",APP_THEME_CHANGED:"app:themeChanged",ROUTE_CHANGED:"route:changed",ROUTE_NOT_FOUND:"route:notFound",UI_ROUTE_CHANGED:"ui:routeChanged",ROUTER_NAVIGATE:"router:navigate",ROUTER_NAVIGATE_REQUEST:"router:navigate:request",PROFILE_UPDATED:"user:profileUpdated",PROFILE_LOADED:"user:profileLoaded",ONBOARDING_COMPLETE:"user:onboardingComplete",SUPPLEMENTS_LOADED:"supplements:loaded",SUPPLEMENTS_FILTERED:"supplements:filtered",STACK_UPDATED:"stack:updated",STACK_ITEM_ADDED:"stack:itemAdded",STACK_ITEM_REMOVED:"stack:itemRemoved",STACK_ITEM_ADDED_LEGACY:"stack:item:added",STACK_ITEM_REMOVED_LEGACY:"stack:item:removed",STACK_CLEARED:"stack:cleared",STACK_EXPORTED:"stack:exported",STACK_OPTIMIZE:"stack:optimize",STACK_PROTOCOL_ACTIVATED:"stack:protocol:activated",CHECKIN_LOGGED:"checkin:logged",CHECKIN_STREAK_UPDATED:"checkin:streakUpdated",CHECKIN_ADDED:"checkin:added",HOME_CHECKIN_COMPLETED:"home:checkin:completed",AI_RECOMMENDATIONS_READY:"ai:recommendationsReady",AI_RECOMMENDATIONS_INVALID:"ai:recommendationsInvalid",BIOMETRICS_UPDATED:"biometria:updated",SOCIAL_INTERACTION:"social:interaction",PRICE_UPDATED:"price:updated",PRICE_DROPPED:"price:dropped",PREMIUM_UNLOCKED:"premium:unlocked",PREMIUM_EXPIRED:"premium:expired",APP_ONLINE:"app:online",APP_OFFLINE:"app:offline",SYNC_STARTED:"sync:started",SYNC_COMPLETED:"sync:completed",SYNC_FAILED:"sync:failed",TOAST_REQUESTED:"ui:toastRequested",TOAST_SHOW:"toast:show",TOAST_DISMISS:"toast:dismiss",MODAL_OPEN:"ui:modalOpen",MODAL_CLOSE:"ui:modalClose",MODAL_REQUESTED:"ui:modalRequested",SEARCH_QUERY:"ui:searchQuery",UI_THEME_TOGGLE_REQUESTED:"ui:theme:toggle:requested",UI_THEME_CHANGED:"ui:theme:changed",UI_STACK_REORDER_REQUESTED:"ui:stack:reorder:requested",UI_SUPPLEMENT_DETAIL_REQUESTED:"ui:supplement:detail:requested",UI_SUPPLEMENT_COMPARE_REQUESTED:"ui:supplement:compare:requested",UI_SUPPLEMENT_FAVORITE_REQUESTED:"ui:supplement:favorite:requested",UI_SUPPLEMENT_BUY_REQUESTED:"ui:supplement:buy:requested",SUPPLEMENT_DETAIL_OPEN:"supplement:detail:open",SUPPLEMENT_VIEW:"supplement:view",SUPPLEMENT_FAVORITE_TOGGLE:"supplement:favorite:toggle",SUPPLEMENT_BUY:"supplement:buy",FAVORITES_UPDATED:"favorites:updated",FAVORITES_FILTER_CHANGED:"favorites:filter:changed",FAVORITES_SORT_CHANGED:"favorites:sort:changed",FAVORITE_TOGGLED:"favorite:toggled",INVENTORY_UPDATED:"inventory:updated",INVENTORY_URGENT:"inventory:urgent",HISTORY_UPDATED:"history:updated",HISTORY_FILTER_CHANGED:"history:filter:changed",HISTORY_LOAD_MORE:"history:load:more",HISTORY_VIEW_DETAILS:"history:view:details",CYCLE_COMPLETED:"cycle:completed",CYCLE_VIEW_LOGS:"cycle:view:logs",DOSAGE_CALCULATED:"dosage:calculated",DOSAGE_ADDED_TO_STACK:"dosage:added:to:stack",DOSAGE_PRESELECT:"dosage:preselect",COMPARATOR_OPEN:"comparator:open",COMPARE_PRESELECT:"compare:preselect",AFFILIATE_CLICK:"affiliate_click",CHECKOUT_INITIATED:"checkout:initiated",LIST_FILTER_CHANGED:"list:filter:changed",LIST_ADVANCED_FILTER_APPLIED:"list:advanced-filter:applied",SETTINGS_CHANGED:"settings:changed",STATE_CHANGED:"state:changed",STATE_IMPORTED:"state:imported",STATE_REHYDRATED:"state:rehydrated",SYSTEM_ERROR:"error:system",COMPONENT_ERROR:"component:error",ERROR_PERSISTENCE:"error:persistence"});var T,I,M,_,L,x;class J{constructor(){w(this,_);E(this,"subscribers",new Map);w(this,T,[]);w(this,I,!1);w(this,M,100)}on(e,t,s=null){if(S(this,_,x).call(this,e),typeof t!="function")return v(this,I),()=>{};this.subscribers.has(e)||this.subscribers.set(e,new Set);let r=null;s&&(s instanceof HTMLElement||typeof s=="object"&&s.nodeType===1?r=s:typeof s=="object"&&s.element&&(r=s.element));const n={callback:t,elementRef:r?new WeakRef(r):null,once:!1};return this.subscribers.get(e).add(n),()=>this.off(e,t)}once(e,t,s=null){if(S(this,_,x).call(this,e),typeof t!="function")return v(this,I),()=>{};this.subscribers.has(e)||this.subscribers.set(e,new Set);let r=null;s&&(s instanceof HTMLElement||typeof s=="object"&&s.nodeType===1?r=s:typeof s=="object"&&s.element&&(r=s.element));const n={callback:t,elementRef:r?new WeakRef(r):null,once:!0};return this.subscribers.get(e).add(n),()=>this.off(e,t)}off(e,t){const s=this.subscribers.get(e);if(s){for(const r of s)if(r.callback===t){s.delete(r);break}}}emit(e,t=null){S(this,_,x).call(this,e);const s={name:e,eventType:e,payload:t,timestamp:Date.now()};v(this,T).push(s),v(this,T).length>v(this,M)&&v(this,T).shift(),S(this,_,L).call(this,e),S(this,_,L).call(this,"*");const r=this.subscribers.get(e),n=this.subscribers.get("*");r&&r.size>0&&[...r].forEach(a=>{try{a.callback(t,e)}catch(l){e!=="error:system"&&this.emit("error:system",{originalEvent:e,payload:t,error:l.message,stack:l.stack})}a.once&&r.delete(a)}),n&&n.size>0&&[...n].forEach(a=>{try{a.callback(e,t)}catch(l){e!=="error:system"&&this.emit("error:system",{originalEvent:e,payload:t,error:l.message,stack:l.stack})}a.once&&n.delete(a)})}getHistory(e){return e?v(this,T).filter(t=>t.name===e||t.eventType===e):[...v(this,T)]}clearHistory(){R(this,T,[])}setDebug(e){R(this,I,!!e)}clear(e){e?(S(this,_,x).call(this,e),this.subscribers.delete(e)):(this.subscribers.clear(),R(this,T,[]))}listenerCount(e){return e!=="*"&&S(this,_,x).call(this,e),S(this,_,L).call(this,e),this.subscribers.get(e)?.size||0}}T=new WeakMap,I=new WeakMap,M=new WeakMap,_=new WeakSet,L=function(e){const t=this.subscribers.get(e);if(!t)return;const s=[...t];for(const r of s)if(r.elementRef){const n=r.elementRef.deref();(!n||!n.isConnected)&&t.delete(r)}},x=function(e){if(e==="*"||e.startsWith("test:")||e.startsWith("event:"))return;if(!Object.values(W).includes(e))throw new Error(`[EventBus] Unknown event: "${e}". Add it to EVENTS in event-bus.js before using.`)};const f=new J;function P(){return new Date().toISOString().split("T")[0]}function X(i){const e=new Date;return e.setDate(e.getDate()-i),e.toISOString().split("T")[0]}const H="4.0.0",D="suplilist-state-v4",V=Object.freeze({STATE:"suplilist-state-v4",FAVORITES:"suplilist:favorites",THEME:"suplilist:theme",STACK:"suplilist:stack"}),d=Object.freeze({SET_USER_PROFILE:"SET_USER_PROFILE",COMPLETE_ONBOARDING:"COMPLETE_ONBOARDING",ADD_TO_STACK:"ADD_TO_STACK",REMOVE_FROM_STACK:"REMOVE_FROM_STACK",UPDATE_STACK_ITEM:"UPDATE_STACK_ITEM",SET_STACK_QUANTITY:"SET_STACK_QUANTITY",CLEAR_STACK:"CLEAR_STACK",CLEAR_CHECKINS:"CLEAR_CHECKINS",ADD_CHECKIN:"ADD_CHECKIN",SET_RECOMMENDATIONS:"SET_RECOMMENDATIONS",INVALIDATE_RECOMMENDATIONS:"INVALIDATE_RECOMMENDATIONS",SET_TIER:"SET_TIER",SET_ROUTE:"SET_ROUTE",SHOW_TOAST:"SHOW_TOAST",ADD_FAVORITE:"ADD_FAVORITE",REMOVE_FAVORITE:"REMOVE_FAVORITE",SET_FAVORITES:"SET_FAVORITES",SET_THEME:"SET_THEME",PRUNE_CHECKINS_TEST:"PRUNE_CHECKINS_TEST"}),y=Object.freeze({_version:H,_lastUpdated:null,user:{id:null,name:null,email:null,weight:null,trainingFrequency:null,trainingAge:null,objective:null,restrictions:[],budget:null,tier:"free",createdAt:null,onboardingComplete:!1},stack:[],checkins:[],favorites:[],recommendations:{items:[],generatedAt:null,profileHash:null},achievements:[],notifications:[],preferences:{theme:"dark",language:"pt-BR",currency:"BRL",notificationsEnabled:!0,reminderTime:"08:00",weekStartDay:0},ui:{currentRoute:"/home",loading:!1,error:null,modal:null,toast:null}});function Z(i,e){if(!e)return i;switch(e.type){case d.SET_USER_PROFILE:return{...i,user:{...i.user,...e.payload}};case d.COMPLETE_ONBOARDING:return{...i,user:{...i.user,onboardingComplete:!0}};case d.ADD_TO_STACK:{const t=e.payload.supplementId??e.payload.id;if(i.stack.some(n=>(n.supplementId??n.id)===t))return i;const r={...e.payload,supplementId:t};return{...i,stack:[...i.stack,r]}}case d.REMOVE_FROM_STACK:return{...i,stack:i.stack.filter(t=>(t.supplementId??t.id)!==e.payload.supplementId)};case d.CLEAR_STACK:return{...i,stack:[]};case d.CLEAR_CHECKINS:return{...i,checkins:[]};case d.ADD_CHECKIN:{const t={id:e.payload.id||`chk_${Math.random().toString(36).substring(2,11)}`,timestamp:e.payload.timestamp||Date.now(),supplementId:e.payload.supplementId,date:e.payload.date||P(),note:e.payload.note||""};return{...i,checkins:[...i.checkins,t]}}case d.SET_RECOMMENDATIONS:return{...i,recommendations:{items:e.payload.items||[],generatedAt:Date.now(),profileHash:e.payload.profileHash||null}};case d.INVALIDATE_RECOMMENDATIONS:return{...i,recommendations:{items:[],generatedAt:null,profileHash:null}};case d.SET_TIER:return{...i,user:{...i.user,tier:e.payload.tier}};case d.SET_ROUTE:return{...i,ui:{...i.ui,currentRoute:e.payload.route}};case d.SHOW_TOAST:return{...i,ui:{...i.ui,toast:{message:e.payload.message,type:e.payload.type||"info",duration:e.payload.duration??3e3}}};case d.ADD_FAVORITE:return i.favorites.includes(e.payload.supplementId)?i:{...i,favorites:[...i.favorites,e.payload.supplementId]};case d.REMOVE_FAVORITE:return{...i,favorites:i.favorites.filter(t=>t!==e.payload.supplementId)};case d.SET_FAVORITES:return{...i,favorites:e.payload};case d.SET_THEME:return{...i,preferences:{...i.preferences,theme:e.payload.theme}};case d.PRUNE_CHECKINS_TEST:return{...i,checkins:e.payload};case d.UPDATE_STACK_ITEM:{const t=e.payload.supplementId??e.payload.id;return{...i,stack:i.stack.map(s=>(s.supplementId??s.id)===t?{...s,...e.payload,dosage:{...s.dosage??{},...e.payload.dosage??{}},supplementId:t}:s)}}case d.SET_STACK_QUANTITY:{const t=e.payload.supplementId??e.payload.id;return{...i,stack:i.stack.map(s=>(s.supplementId??s.id)===t?{...s,quantity:e.payload.quantity}:s)}}default:return i}}const A=class A{constructor(e){E(this,"_state");E(this,"_persistTimer",null);E(this,"_history",[]);E(this,"_subscribers",new Set);E(this,"_pathSubscribers",new Map);E(this,"_debug",!1);E(this,"_isPruning",!1);this._state=this._deepFreeze(e),this._initializeState(),this._setupStorageSync()}static getInstance(){return A._instance||(A._instance=new A(y)),A._instance}static resetInstance(){A._instance=null}get user(){return this._state.user}get stack(){return this._state.stack}get checkins(){return this._state.checkins}get todayCheckins(){return this.getTodayCheckins()}get preferences(){return this._state.preferences}get ui(){return this._state.ui}get favorites(){return this._state.favorites}get recommendations(){return this._state.recommendations}get state(){return this._state}select(e){if(typeof e!="function")throw new TypeError("[StateManager] select() requires a function");return e(this._state)}get(e=null){return e?e.split(".").reduce((t,s)=>t?.[s],this._state):this._state}dispatch(e,t=void 0){const s=typeof e=="string"?{type:e,payload:t}:e;if(!s||typeof s.type!="string"){this._debug;return}const r=this._state,n=Z(r,s);if(Object.is(r,n))return;this._history.push(r),this._history.length>20&&this._history.shift();const o={...n,_lastUpdated:Date.now()};this._state=this._deepFreeze(o),this._persist(),this._subscribers.forEach(a=>{try{a(this._state,s)}catch{}}),this._pathSubscribers.forEach((a,l)=>{const p=this.get(l),m=l.split(".").reduce((u,h)=>u?.[h],r);Object.is(p,m)||a.forEach(u=>{try{u(p,m)}catch{}})}),this._emitEventBus(s)}undo(){if(this._history.length===0)return!1;const e=this._history.pop();return this._state=this._deepFreeze(e),this._persist(),this._subscribers.forEach(t=>t(this._state)),!0}subscribe(e,t=null){if(typeof e=="function"){const s=e;return this._subscribers.add(s),()=>this._subscribers.delete(s)}else if(typeof e=="string"&&typeof t=="function"){const s=e;return this._pathSubscribers.has(s)||this._pathSubscribers.set(s,new Set),this._pathSubscribers.get(s).add(t),()=>{const r=this._pathSubscribers.get(s);r&&(r.delete(t),r.size===0&&this._pathSubscribers.delete(s))}}return()=>{}}reset(){this._history=[],this.hydrate(y),this._flushPersist()}hydrate(e){const t=this._deepMerge(y,e);this._state=this._deepFreeze(t)}export(){return JSON.parse(JSON.stringify(this._state))}_persist(){clearTimeout(this._persistTimer),this._persistTimer=setTimeout(()=>{try{const e={...this._state};delete e.ui,localStorage.setItem(D,JSON.stringify(e))}catch(e){e.name==="QuotaExceededError"&&this._pruneStorage()}},300)}_flushPersist(){clearTimeout(this._persistTimer);try{const e={...this._state};delete e.ui,localStorage.setItem(D,JSON.stringify(e))}catch(e){e.name==="QuotaExceededError"&&this._pruneStorage()}}_pruneStorage(){if(!this._isPruning){this._isPruning=!0;try{if(this._state.checkins.length>30){const e=this._state.checkins.slice(-30);this.dispatch({type:d.PRUNE_CHECKINS_TEST,payload:e}),this._flushPersist()}}catch{}finally{this._isPruning=!1}}}_setupStorageSync(){typeof window<"u"&&window.addEventListener&&window.addEventListener("storage",e=>{if(e.key===D&&e.newValue)try{const t=JSON.parse(e.newValue),s=this._migrateState(t),r=this._deepMerge(y,s);this._state=this._deepFreeze(r),this._subscribers.forEach(n=>{try{n(this._state,{type:"STATE_REHYDRATED_STORAGE",payload:r})}catch(o){Q.error("[StateManager] Subscriber error on cross-tab sync:",o)}}),f.emit("state:changed",{path:"all",value:r,fullState:this.export()})}catch{}})}_initializeState(){try{const e=localStorage.getItem(D);if(!e)return this._state=this._deepFreeze(y),y;const t=JSON.parse(e),s=this._migrateState(t),r=this._deepMerge(y,s);return this._state=this._deepFreeze(r),r}catch{return this._state=this._deepFreeze(y),y}}_migrateState(e){return e?e._version!==H?{...y,...e,_version:H}:e:y}_deepMerge(e,t){const s={...e};for(const r of Object.keys(t??{}))t[r]&&typeof t[r]=="object"&&!Array.isArray(t[r])?s[r]=this._deepMerge(e[r]??{},t[r]):s[r]=t[r];return s}_deepFreeze(e){return typeof e!="object"||e===null||Object.isFrozen(e)?e:(Object.keys(e).forEach(t=>this._deepFreeze(e[t])),Object.freeze(e))}_emitEventBus(e){const t=this._state;switch(e.type){case d.SET_USER_PROFILE:f.emit("user:profileUpdated",{user:t.user});break;case d.COMPLETE_ONBOARDING:f.emit("user:onboardingComplete",{user:t.user});break;case d.ADD_TO_STACK:f.emit("stack:itemAdded",{supplementId:e.payload.supplementId??e.payload.id,name:e.payload.name});break;case d.REMOVE_FROM_STACK:f.emit("stack:itemRemoved",{supplementId:e.payload.supplementId});break;case d.CLEAR_STACK:f.emit("stack:cleared",{});break;case d.ADD_CHECKIN:f.emit("checkin:added",{supplementId:e.payload.supplementId,timestamp:e.payload.timestamp||Date.now()});break;case d.SET_RECOMMENDATIONS:f.emit("ai:recommendationsReady",{items:t.recommendations.items,profileHash:t.recommendations.profileHash});break;case d.INVALIDATE_RECOMMENDATIONS:f.emit("ai:recommendationsInvalid",{});break;case d.SET_TIER:f.emit("premium:unlocked",{tier:e.payload.tier});break;case d.SET_ROUTE:f.emit("ui:routeChanged",{route:e.payload.route});break;case d.SHOW_TOAST:f.emit("ui:toastRequested",{message:e.payload.message,type:e.payload.type||"info",duration:e.payload.duration??3e3});break}}_calculateStreak(e=this.checkins){if(!e||e.length===0)return 0;const t=[...new Set(e.map(a=>a.date))].sort().reverse();if(t.length===0)return 0;const s=P(),r=X(1);if(t[0]!==s&&t[0]!==r)return 0;let n=0,o=new Date(t[0]);for(let a=0;a<t.length;a++){const l=new Date(t[a]),p=Math.abs(o-l),m=Math.ceil(p/(1e3*60*60*24));if(a===0||m<=1)n++,o=l;else break}return n}calculateStreak(e=this.checkins){return this._calculateStreak(e)}getTodayCheckins(){const e=P();return this.checkins.filter(t=>t.date===e)}getState(e){return this.get(e)}setState(e,t,s={}){if(e==="favorites"){this.dispatch({type:d.SET_FAVORITES,payload:t});return}if(e==="settings.theme"){if(t!=="light"&&t!=="dark")throw new Error("Tema inválido");this.dispatch({type:d.SET_THEME,payload:{theme:t}});return}const r=e.split("."),n=typeof t=="function"?t(this.get(e)):t,o=this._state,a=this._setPath(this.export(),r,n),l=this._deepFreeze({...a,_lastUpdated:Date.now()});this._history.push(o),this._history.length>20&&this._history.shift(),this._state=l,this._persist(),this._subscribers.forEach(m=>{try{m(this._state)}catch{}});const p=this._pathSubscribers.get(e);if(p){const m=e.split(".").reduce((u,h)=>u?.[h],o);p.forEach(u=>{try{u(n,m)}catch{}})}f.emit("state:changed",{path:e,value:n,fullState:this.export()})}_setPath(e,t,s){if(t.length===0)return s;const[r,...n]=t;return{...e,[r]:this._setPath(e[r]??{},n,s)}}observe(e,t){return this.subscribe(e,t)}exportState(){return this.export()}importState(e){this.hydrate(e)}setDebug(e){this._debug=!!e}};E(A,"_instance",null);let U=A;const C=U.getInstance(),b={home:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>'},list:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'},stack:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>'},checkin:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',filled:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/></svg>'},favorites:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'},history:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>'},dosage:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>'},profile:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.7 0 4-1.3 4-4s-1.3-4-4-4-4 1.3-4 4 1.3 4 4 4zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>'},faq:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>'},settings:{outlined:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9z"/></svg>',filled:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.6.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>'},theme:{sun:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',moon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'},plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'},z=[{group:null,items:[{id:"home",path:"/",label:"Início",bottomNav:!1,icon:b.home}]},{group:"EXPLORAR",items:[{id:"list",path:"/list",label:"Lista",bottomNav:!0,bottomOrder:0,icon:b.list}]},{group:"MEU PROTOCOLO",items:[{id:"my-stack",path:"/my-stack",label:"Stack",bottomNav:!0,bottomOrder:1,icon:b.stack},{id:"checkin",path:"/checkin",label:"Check-in",bottomNav:!0,bottomOrder:2,featured:!0,icon:b.checkin},{id:"favorites",path:"/favorites",label:"Favoritos",bottomNav:!0,bottomOrder:3,icon:b.favorites},{id:"history",path:"/history",label:"Histórico",bottomNav:!0,bottomOrder:4,icon:b.history},{id:"dosage",path:"/dosage",label:"Calculadora",bottomNav:!1,icon:b.dosage}]},{group:"SUPORTE",items:[{id:"profile",path:"/profile",label:"Perfil",bottomNav:!1,icon:b.profile},{id:"faq",path:"/faq",label:"FAQ",bottomNav:!1,icon:b.faq},{id:"settings",path:"/settings",label:"Config",bottomNav:!1,icon:b.settings}]}],c=class c{static init(){c._injectStyles(),c._renderSidebar(),c._renderBottomNav(),c._renderMobileTopbar(),c._setupClickDelegation(),c._setupScrollAutoHide(),c._hasCheckinToday()||c.setBadge("checkin",!0),c._checkinUnsub&&(c._checkinUnsub(),c._checkinUnsub=null),c._checkinUnsub=f.on("checkin:added",()=>{c._hasCheckinToday()&&c.setBadge("checkin",!1)})}static updateActive(e){const t=e.split("?")[0]||"/",s=t==="/home"?"/":t;document.querySelectorAll(".sb-item").forEach(r=>{const n=r.dataset.navPath,o=n===s||s==="/"&&n==="/";r.classList.toggle("is-active",o),r.setAttribute("aria-current",o?"page":"false")}),document.querySelectorAll(".bn-item").forEach(r=>{const o=r.dataset.navPath===s;r.classList.toggle("is-active",o),r.setAttribute("aria-current",o?"page":"false")})}static setBadge(e,t){c._badgeStates[e]=t;const s=document.querySelector(`.sb-item[data-nav-id="${e}"] .sb-badge`);s&&(s.hidden=!t);const r=document.querySelector(`.bn-item[data-nav-id="${e}"] .bn-badge`);r&&(r.hidden=!t)}static hide(){document.getElementById("sidebar-nav")?.style.setProperty("display","none","important"),document.getElementById("bottom-nav")?.style.setProperty("display","none","important"),document.getElementById("mobile-topbar")?.style.setProperty("display","none","important")}static show(){document.getElementById("sidebar-nav")?.style.removeProperty("display"),document.getElementById("bottom-nav")?.style.removeProperty("display"),document.getElementById("mobile-topbar")?.style.removeProperty("display")}static _renderSidebar(){const e=document.getElementById("sidebar-nav");if(!e)return;const t=c._getSidebarSubtitle(),s=c._getThemeIcon(),r=z.map(({group:n,items:o})=>{const a=o.map(l=>`
        <button class="sb-item" data-nav-id="${l.id}" data-nav-path="${l.path}"
          aria-label="${l.label}" aria-current="false">
          <span class="sb-item__icon">${l.icon.outlined}</span>
          <span class="sb-item__label">${l.label}</span>
          ${l.id==="checkin"?'<span class="sb-badge" hidden aria-label="Check-in pendente"></span>':""}
        </button>`).join("");return n?`
        <div class="sb-group">
          <span class="sb-group__label">${n}</span>
          ${a}
        </div>`:a}).join("");e.innerHTML=`
      <div class="sb-inner">
        <div class="sb-header">
          <span class="sb-logo">SupliList</span>
          <span class="sb-subtitle">${t}</span>
        </div>
        <div class="sb-nav">
          ${r}
        </div>
        <div class="sb-footer">
          <button id="btn-theme" class="sb-theme-btn" aria-label="Alternar tema claro/escuro">
            <span class="sb-item__icon">${s}</span>
            <span>Alternar Tema</span>
          </button>
          <button class="sb-fab" data-nav-path="/my-stack" aria-label="Adicionar ao Meu Stack">
            ${b.plus}
            Adicionar ao Stack
          </button>
        </div>
      </div>`}static _renderBottomNav(){const e=document.getElementById("bottom-nav");if(!e)return;const s=z.flatMap(r=>r.items).filter(r=>r.bottomNav).sort((r,n)=>r.bottomOrder-n.bottomOrder).map(r=>{const n=r.featured?"bn-item--featured":"",o=r.featured?r.icon.filled:r.icon.outlined,a=r.featured?24:22;return`
        <button class="bn-item ${n}" data-nav-id="${r.id}" data-nav-path="${r.path}"
          aria-label="${r.label}" aria-current="false">
          <span class="bn-icon" style="${r.featured?"":`width:${a}px;height:${a}px`}">${o}</span>
          ${r.featured?"":`<span class="bn-label">${r.label}</span>`}
          ${r.id==="checkin"?'<span class="bn-badge" hidden aria-label="Check-in pendente"></span>':""}
        </button>`}).join("");e.innerHTML=s}static _renderMobileTopbar(){const e=document.getElementById("mobile-topbar");if(!e)return;const t=c._getThemeIcon();e.innerHTML=`
      <span class="mt-logo">SupliList</span>
      <div class="mt-actions">
        <button id="btn-theme-mobile" class="mt-icon-btn" aria-label="Alternar tema">
          ${t}
        </button>
        <button class="mt-icon-btn" data-nav-path="/profile" aria-label="Meu Perfil">
          <div class="mt-avatar">S</div>
        </button>
      </div>`}static _setupClickDelegation(){c._clickHandler&&(document.removeEventListener("click",c._clickHandler),c._clickHandler=null),c._clickHandler=e=>{const t=e.target.closest("[data-nav-path]");if(!t)return;e.preventDefault();const s=t.getAttribute("data-nav-path");s&&(window.history.pushState(null,null,s),window.dispatchEvent(new PopStateEvent("popstate")))},document.addEventListener("click",c._clickHandler)}static _setupScrollAutoHide(){const e=document.getElementById("router-outlet"),t=document.getElementById("bottom-nav");if(!e||!t)return;c._scrollHandler&&(e.removeEventListener("scroll",c._scrollHandler),c._scrollHandler=null);let s=0;c._scrollHandler=()=>{const r=e.scrollTop,n=r>s&&r>80;t.classList.toggle("bn--hidden",n),s=r},e.addEventListener("scroll",c._scrollHandler,{passive:!0})}static _getSidebarSubtitle(){try{const e=C.user?.objective;return{bulk:"Foco em Hipertrofia",cut:"Foco em Emagrecimento",strength:"Foco em Força",endurance:"Foco em Performance",general:"Saúde & Longevidade"}[e]||"Suplementação Inteligente"}catch{return"Suplementação Inteligente"}}static _hasCheckinToday(){try{const e=P();return(C.checkins||[]).some(t=>t.date===e)}catch{return!0}}static _getThemeIcon(){return(document.documentElement.getAttribute("data-theme")||"dark")==="dark"?b.theme.sun:b.theme.moon}static _injectStyles(){if(c._styleInjected)return;c._styleInjected=!0;const e=document.createElement("style");e.setAttribute("data-nav","true"),e.textContent=`
      /* ── SIDEBAR ── */
      #sidebar-nav {
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .sb-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 20px 12px 16px;
        overflow: hidden;
      }
      .sb-header {
        padding: 4px 8px 18px;
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
        margin-bottom: 10px;
        flex-shrink: 0;
      }
      .sb-logo {
        display: block;
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: -0.03em;
        color: var(--color-brand, #7C3AED);
        margin-bottom: 3px;
        text-decoration: none;
      }
      .sb-subtitle {
        display: block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--color-text-muted, #555);
      }
      .sb-nav {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 2px;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .sb-nav::-webkit-scrollbar { display: none; }
      .sb-group { margin-top: 14px; }
      .sb-group__label {
        display: block;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: var(--color-text-muted, #555);
        padding: 0 10px 5px;
        text-transform: uppercase;
      }
      .sb-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 9px 10px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: var(--color-text-secondary, #9A9A9A);
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        position: relative;
        transition: background 0.15s ease, color 0.15s ease;
        min-height: 40px;
      }
      .sb-item:hover {
        background: var(--color-surface-hover, rgba(255,255,255,0.04));
        color: var(--color-text-primary, #F2F2F2);
      }
      .sb-item.is-active {
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        color: var(--color-text-primary, #F2F2F2);
        font-weight: 600;
      }
      .sb-item.is-active::before {
        content: '';
        position: absolute;
        left: 0; top: 6px; bottom: 6px;
        width: 2px;
        border-radius: 0 2px 2px 0;
        background: var(--color-brand, #7C3AED);
      }
      .sb-item__icon {
        width: 20px; height: 20px;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .sb-item__label { flex: 1; }
      .sb-badge {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        flex-shrink: 0;
      }
      .sb-footer {
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        padding-top: 10px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
      }
      .sb-theme-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px; border-radius: 8px; border: none;
        background: transparent;
        color: var(--color-text-secondary, #9A9A9A);
        font-family: 'Inter', sans-serif; font-size: 13px;
        cursor: pointer; transition: background 0.15s ease; width: 100%;
        min-height: 40px;
      }
      .sb-theme-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); color: var(--color-text-primary); }
      .sb-fab {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 11px 16px; border-radius: 10px; border: none;
        background: var(--color-brand, #7C3AED); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; transition: background 0.15s ease, transform 0.12s ease;
      }
      .sb-fab:hover { background: var(--color-brand-hover, #6D28D9); }
      .sb-fab:active { transform: scale(0.98); }

      /* ── BOTTOM NAV ── */
      #bottom-nav {
        background: rgba(8, 8, 8, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        display: flex;
        align-items: center;
        justify-content: space-around;
        box-shadow: 0 -30px 40px -10px rgba(8,8,8,0.6);
        transition: transform 0.25s ease;
      }
      #bottom-nav.bn--hidden { transform: translateY(100%); }
      .bn-item {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 3px; flex: 1;
        padding: 8px 4px 6px; background: transparent; border: none;
        cursor: pointer; color: var(--color-text-muted, #555);
        font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 500;
        transition: color 0.15s ease; min-height: 48px; position: relative;
        -webkit-tap-highlight-color: transparent;
      }
      .bn-item:hover { color: var(--color-text-secondary, #9A9A9A); }
      .bn-item.is-active { color: var(--color-brand, #7C3AED); }
      .bn-item--featured { flex: 0 0 68px; }
      .bn-item--featured .bn-icon {
        width: 48px; height: 48px; border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        display: flex; align-items: center; justify-content: center;
        color: #fff;
        box-shadow: 0 4px 14px rgba(124,58,237,0.45);
        transform: translateY(-8px);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .bn-item--featured:active .bn-icon { transform: translateY(-5px) scale(0.95); }
      .bn-item--featured.is-active .bn-icon { box-shadow: 0 4px 20px rgba(124,58,237,0.65); }
      .bn-icon {
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
      }
      .bn-label { line-height: 1; }
      .bn-badge {
        position: absolute; top: 8px; right: calc(50% - 16px);
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        border: 2px solid var(--color-bg-primary, #080808);
      }

      /* ── MOBILE TOPBAR ── */
      #mobile-topbar {
        background: rgba(8,8,8,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
      }
      .mt-logo {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: -0.03em;
        color: var(--color-brand, #7C3AED);
      }
      .mt-actions { display: flex; align-items: center; gap: 4px; }
      .mt-icon-btn {
        background: none; border: none; cursor: pointer;
        padding: 8px; border-radius: 8px;
        color: var(--color-text-secondary, #9A9A9A);
        display: flex; align-items: center; justify-content: center;
        min-width: 44px; min-height: 44px;
        transition: background 0.15s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .mt-icon-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); }
      .mt-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        border: 1.5px solid var(--color-brand, #7C3AED);
        color: var(--color-brand, #7C3AED);
        font-size: 12px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
    `,document.head.appendChild(e)}};E(c,"_styleInjected",!1),E(c,"_badgeStates",{}),E(c,"_scrollHandler",null),E(c,"_checkinUnsub",null),E(c,"_clickHandler",null);let k=c;class ee{constructor(e,t){this.routes=e,this.container=t,this.currentPage=null,window.addEventListener("popstate",()=>this.handleRoute())}start(){this.handleRoute()}navigate(e){window.history.pushState(null,null,e),this.handleRoute()}matchRoute(e){const[t,s]=e.split("?"),r=t||"/",n={};s&&s.split("&").forEach(o=>{const[a,l]=o.split("=");a&&(n[decodeURIComponent(a)]=decodeURIComponent(l||""))});for(const o of this.routes){const a=te(o.path,r);if(a!==null)return{route:o,params:{...a,...n}}}return null}async handleRoute(){const e=window.location.pathname||"/",t=window.location.search||"",s=this.matchRoute(e+t);if(!s){if(this.currentPage&&typeof this.currentPage.unmount=="function")try{await this.currentPage.unmount()}catch{}this.container.innerHTML='<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);"><p style="font-size:2rem;margin-bottom:1rem;">404</p><p>Página não encontrada.</p></div>',this.currentPage=null;return}const{route:r,params:n}=s;if(this.currentPage&&typeof this.currentPage.unmount=="function")try{await this.currentPage.unmount()}catch{}this.container.innerHTML="",this.currentPage=null;try{const a=(await r.load()).default;this.currentPage=new a(this.container,n),await this.currentPage.mount(),typeof window.plausible=="function"&&window.plausible("pageview",{u:"https://suplilist.com"+e+t})}catch{this.container.innerHTML='<p style="color:var(--color-error);padding:2rem;">Erro ao carregar a página. Tente novamente.</p>'}k.updateActive(e)}}function te(i,e){const t=i.replace(/^\//,"").split("/"),s=e.replace(/^\//,"").split("/");if(t.length!==s.length)return null;const r={};for(let n=0;n<t.length;n++){const o=t[n],a=s[n];if(o.startsWith(":"))r[o.slice(1)]=decodeURIComponent(a);else if(o!==a)return null}return r}const re=[{path:"/onboarding",load:()=>g(()=>import("./onboarding-page-_g1FcZaT.js"),__vite__mapDeps([0,1,2]))},{path:"/",load:()=>g(()=>import("./home-page-Dxi8ciRj.js"),__vite__mapDeps([3,1,2]))},{path:"/home",load:()=>g(()=>import("./home-page-Dxi8ciRj.js"),__vite__mapDeps([3,1,2]))},{path:"/list",load:()=>g(()=>import("./list-page-BKDZh3Cl.js"),__vite__mapDeps([4,1,5,2,6,7]))},{path:"/my-stack",load:()=>g(()=>import("./my-stack-page-2thG0ifW.js"),__vite__mapDeps([8,1,6,2,7]))},{path:"/checkin",load:()=>g(()=>import("./checkin-page-DT3Q10Z2.js"),__vite__mapDeps([9,1,2]))},{path:"/history",load:()=>g(()=>import("./history-page-B31XNWQv.js"),__vite__mapDeps([10,1]))},{path:"/favorites",load:()=>g(()=>import("./favorites-page-q8eck3jf.js"),__vite__mapDeps([11,1,6]))},{path:"/dosage",load:()=>g(()=>import("./calculator-page-B2K9KsUN.js"),__vite__mapDeps([12,1,2,6]))},{path:"/profile",load:()=>g(()=>import("./profile-page-CcquDUGL.js"),__vite__mapDeps([13,2]))},{path:"/settings",load:()=>g(()=>import("./settings-page-I6L7xckS.js"),[])},{path:"/faq",load:()=>g(()=>import("./faq-page-DoPaIkog.js"),[])},{path:"/legal",load:()=>g(()=>import("./legal-page-CrT-ljEX.js"),[])}],se={"/onboarding":"Bem-vindo | SupliList","/":"SupliList | Suplementação Baseada em Evidências","/home":"SupliList | Suplementação Baseada em Evidências","/list":"Catálogo de Suplementos | SupliList","/my-stack":"Meu Stack | SupliList","/favorites":"Favoritos | SupliList","/checkin":"Check-in Diário | SupliList","/history":"Histórico | SupliList","/dosage":"Calculadora de Dosagem | SupliList","/profile":"Meu Perfil | SupliList","/settings":"Configurações | SupliList","/faq":"Perguntas Frequentes | SupliList","/legal":"Termos & Privacidade | SupliList"};function K(){const i=window.location.pathname;document.title=se[i]||"SupliList | Suplementação Baseada em Evidências"}function j(){const i=window.location.pathname,e=i==="/"||i==="/home"||i==="/onboarding";document.body.classList.toggle("body--landing",e)}document.addEventListener("DOMContentLoaded",()=>{k.init(),k.updateActive(window.location.pathname),j(),K(),window.addEventListener("popstate",()=>{j(),K(),window.location.pathname==="/"||window.location.pathname==="/home"||window.location.pathname==="/onboarding"?k.hide():k.show()});const i=document.querySelector("#router-outlet"),e=new ee(re,i);window.__router=e;const t=C.user.onboardingComplete,s=C.stack&&C.stack.length>0;!t&&!s&&window.location.pathname!=="/onboarding"&&window.history.replaceState(null,null,"/onboarding"),e.start();const r=localStorage.getItem(V.THEME)||localStorage.getItem("theme");(r==="light"||r==="dark")&&document.documentElement.setAttribute("data-theme",r);function n(){const p=(document.documentElement.getAttribute("data-theme")||"dark")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",p),localStorage.setItem(V.THEME,p);const m=p==="dark"?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',u=document.getElementById("btn-theme"),h=document.getElementById("btn-theme-mobile");u&&(u.querySelector(".sb-item__icon").innerHTML=m);const O=h?.querySelector("svg")??h;O&&O!==h?O.outerHTML=m:h&&(h.innerHTML=m)}document.addEventListener("click",l=>{(l.target.closest("#btn-theme")||l.target.closest("#btn-theme-mobile"))&&n()});const o=document.getElementById("app-loading");o&&(o.style.opacity="0",setTimeout(()=>{o.style.display="none"},300));function a({message:l,type:p="info",duration:m=3e3}){const u=document.getElementById("toast-container");if(!u)return;const h=document.createElement("div");h.className=`toast toast--${p}`,h.textContent=l,u.appendChild(h),setTimeout(()=>{h.style.opacity="0",setTimeout(()=>h.remove(),300)},m)}f.on("toast:show",a),f.on("ui:toastRequested",a)});export{d as A,W as E,V as S,f as e,Q as l,X as o,C as s,P as t};
