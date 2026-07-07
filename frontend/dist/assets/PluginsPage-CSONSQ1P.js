const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BvCmaW6C.js","assets/rolldown-runtime-b3L32Ng1.js","assets/vendor-lucide-q_bIbyN1.js","assets/vendor-router-CW0N_wrM.js","assets/vendor-state-CuQn5NMc.js","assets/index-C-tS2tOl.css"])))=>i.map(i=>d[i]);
import{r as X}from"./rolldown-runtime-b3L32Ng1.js";import{A as W,E as A,Ft as J,Pt as K,Ut as V,Y as z,at as q,b as $,bt as B,h as M,jt as D,kt as Y,n as H,s as Q,vt as Z,w as ee}from"./vendor-lucide-q_bIbyN1.js";import{o as F}from"./vendor-router-CW0N_wrM.js";import{C as R,E as te,w as L}from"./index-BvCmaW6C.js";import{n as se}from"./websocket-DpzQs84E.js";var n=X(V(),1);async function ae(){try{const r=await fetch("/api/plugins");if(!r.ok)throw new Error(`HTTP ${r.status}: ${r.statusText}`);return(await r.json()).plugins||[]}catch(r){return console.error("[PluginManager] Failed to fetch plugins:",r),[]}}async function ne(r){const b=await fetch(r);if(!b.ok)throw new Error(`Failed to load plugin JS: HTTP ${b.status}`);return await b.text()}function re(r){R.getState().unregisterPlugin(r),L.unregister(r)}var e=te();function le({manifest:r,pluginCode:b,onReady:m,onCommandRegistered:k,onPanelRegistered:j,onNotification:S,onError:p,editorContent:_,editorLanguage:w}){const x=(0,n.useRef)(null),[y,v]=(0,n.useReducer)((g,c)=>c,{status:"loading"}),P=(0,n.useRef)(!1),E=(0,n.useRef)(null),N=(0,n.useRef)(!1),T=(0,n.useCallback)(()=>{const g=Math.random().toString(36).slice(2,18),c=JSON.stringify(r.id);return`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src 'self'; img-src 'self' data: https:; style-src 'unsafe-inline'; script-src 'nonce-${g}'; connect-src 'self' https:; font-src 'self' data:;"></head><body><div id="plugin-root"></div><script nonce="${g}">${`
(function() {
  'use strict';

  var messageSeq = 0;
  var pendingCalls = {};
  var isRegistered = false;

  function sendToHost(type, payload) {
    var seq = ++messageSeq;
    window.parent.postMessage({
      source: 'smartbox-plugin-sandbox',
      pluginId: ${c},
      seq: seq,
      type: type,
      payload: payload || {}
    }, '*');
    return seq;
  }

  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === 'smartbox-host') {
      var msg = event.data;
      if (msg.seq && pendingCalls[msg.seq]) {
        var pending = pendingCalls[msg.seq];
        clearTimeout(pending.timer);
        delete pendingCalls[msg.seq];
        if (msg.error) { pending.reject(new Error(msg.error)); }
        else { pending.resolve(msg.result); }
      }
    }
  });

  // ── 受限 localStorage ──
  var STORAGE_PREFIX = 'smartbox_plugin_' + ${c} + '_';
  var MAX_STORAGE = 51200;

  function getStorageUsage() {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) { total += (key.length + (localStorage.getItem(key) || '').length); }
    }
    return total;
  }

  var sandboxStorage = {
    getItem: function(key) { try { return localStorage.getItem(STORAGE_PREFIX + key); } catch(e) { return null; } },
    setItem: function(key, value) {
      try {
        var fullKey = STORAGE_PREFIX + key;
        var oldVal = localStorage.getItem(fullKey);
        var oldLen = oldVal ? oldVal.length : 0;
        var newLen = value ? value.length : 0;
        var usage = getStorageUsage() - oldLen + newLen;
        if (usage > MAX_STORAGE) { console.warn('[Sandbox] Storage quota exceeded'); return; }
        localStorage.setItem(fullKey, value);
      } catch(e) {}
    },
    removeItem: function(key) { try { localStorage.removeItem(STORAGE_PREFIX + key); } catch(e) {} },
    clear: function() {
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.forEach(function(k) { localStorage.removeItem(k); });
      } catch(e) {}
    },
    get length() {
      var count = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) count++;
      }
      return count;
    }
  };

  // ── 编辑器内容缓存（由主应用推送） ──
  var _editorContent = null;
  var _editorLanguage = null;

  // ── 插件状态 ──
  var __commandHandlers__ = {};

  // ── 受限 API ──
  var pluginAPI = Object.freeze({
    registerCommand: function(idOrDef, secondArg) {
      // 兼容两种调用方式：
      // 方式1: registerCommand('id', { label, description, execute })
      // 方式2: registerCommand({ id, label, description }, handler)
      var id, label, desc, handler;
      if (typeof idOrDef === 'string') {
        id = idOrDef;
        label = (secondArg && secondArg.label) || id;
        desc = (secondArg && secondArg.description) || '';
        handler = (secondArg && secondArg.execute) || secondArg;
      } else {
        id = idOrDef.id;
        label = idOrDef.label || id;
        desc = idOrDef.description || '';
        handler = secondArg;
      }
      if (!id) return;
      __commandHandlers__[id] = handler;
      isRegistered = true;
      sendToHost('registerCommand', { command: { id: id, label: label, description: desc } });
    },
    getEditorContent: function() { return _editorContent; },
    setEditorContent: function(content) {
      sendToHost('setEditorContent', { content: content });
    },
    getCurrentFileLanguage: function() { return _editorLanguage; },
    showNotification: function(message, type) {
      sendToHost('showNotification', { message: String(message), type: type || 'info' });
    },
    storage: Object.freeze({
      get: function(key) { return sandboxStorage.getItem(key); },
      set: function(key, value) { sandboxStorage.setItem(key, value); },
      remove: function(key) { sandboxStorage.removeItem(key); },
      clear: function() { sandboxStorage.clear(); }
    }),
    getRootElement: function() { return document.getElementById('plugin-root'); },
    getPluginId: function() { return ${c}; },
    getPluginInfo: function() { return Object.freeze(JSON.parse('${JSON.stringify(r).replace(/'/g,"\\\\'")}')); }
  });

  window.SmartBox = Object.freeze({
    getPluginAPI: function() { return pluginAPI; }
  });

  // ── 接受主应用消息 ──
  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === 'smartbox-host') {
      var msg = event.data;
      if (msg.type === 'executeCommand') {
        var handler = __commandHandlers__[msg.commandId];
        if (handler) {
          try { handler(msg.args || []); } catch(e) { console.error('[Plugin] Command error:', e); }
        }
      } else if (msg.type === 'editorContentUpdate') {
        // 主应用推送编辑器内容更新
        if (msg.content !== undefined) _editorContent = msg.content;
        if (msg.language !== undefined) _editorLanguage = msg.language;
      }
    }
  });

  // ── 请求当前编辑器内容（初始化缓存） ──
  sendToHost('getEditorContent', {});

  sendToHost('sandboxReady', {});

  // ── 执行插件代码 ──
  try {
    ${b}
  } catch(e) {
    sendToHost('pluginError', { error: e.message || String(e) });
  }
})();
`}<\/script></body></html>`},[r,b]);return(0,n.useEffect)(()=>{const g=x.current;if(g){v({status:"loading"});try{return g.srcdoc=T(),()=>{}}catch(c){const t=c instanceof Error?c.message:"Failed to create sandbox";v({status:"error",message:t}),p?.(t)}}},[r.id,b]),(0,n.useEffect)(()=>{if(N.current)return;N.current=!0;function g(c){const t=c.data;if(!(!t||typeof t!="object")&&t.source==="smartbox-plugin-sandbox"&&typeof t.pluginId=="string"&&typeof t.type=="string"&&!(!t.payload||typeof t.payload!="object"))switch(t.type){case"sandboxReady":P.current=!0,v({status:"ready"}),m?.(E.current);break;case"registerCommand":{const a=t.payload.command;a?.id&&k?.(a);break}case"showNotification":{const a=t.payload;S?.(a.message||"",a.type||"info");break}case"pluginError":{const a=t.payload.error;v({status:"error",message:a}),p?.(a);break}case"setEditorContent":F(()=>import("./index-BvCmaW6C.js").then(a=>a.n).then(a=>{const o=a.useFileStore.getState(),d=t.payload.content;o.activeTabId&&d!==void 0&&o.updateFileContent(o.activeTabId,d)}),__vite__mapDeps([0,1,2,3,4,5]));break;case"getEditorContent":F(()=>import("./index-BvCmaW6C.js").then(a=>a.n).then(a=>{const o=a.useFileStore.getState(),d=o.openTabs?.find(O=>O.id===o.activeTabId),C=x.current;C?.contentWindow&&C.contentWindow.postMessage({source:"smartbox-host",type:"editorContentUpdate",content:d?.content??null,language:d?.language??null},"*")}),__vite__mapDeps([0,1,2,3,4,5]));break}}return window.addEventListener("message",g),()=>{window.removeEventListener("message",g),N.current=!1}},[m,k,S,p]),(0,n.useEffect)(()=>{const g={executeCommand:(c,t)=>{x.current?.contentWindow?.postMessage({source:"smartbox-host",type:"executeCommand",commandId:c,args:t||[]},"*")},updateEditorContent:(c,t)=>{x.current?.contentWindow?.postMessage({source:"smartbox-host",type:"editorContentUpdate",content:c,language:t},"*")},destroy:()=>{const c=x.current;c&&(c.src="about:blank")},iframe:x.current,reload:(c,t)=>{}};E.current=g},[]),(0,e.jsxs)("div",{className:"relative h-full w-full overflow-hidden rounded-lg bg-slate-900/50",children:[y.status==="loading"&&(0,e.jsx)("div",{className:"absolute inset-0 z-10 flex items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)("div",{className:"mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:"沙箱加载中..."})]})}),y.status==="error"&&(0,e.jsx)("div",{className:"absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-4",children:(0,e.jsxs)("div",{className:"max-w-xs text-center",children:[(0,e.jsx)("p",{className:"mb-1 text-sm text-red-400",children:"沙箱加载失败"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:y.message})]})}),(0,e.jsx)("iframe",{ref:x,title:`沙箱: ${r.name}`,className:"h-full w-full border-0",sandbox:"allow-scripts allow-same-origin allow-popups allow-forms",style:{background:"transparent"}})]})}var oe="/api/market/index";function ie(r){switch(r?.toLowerCase()){case"easy":case"入门":return"text-emerald-400 bg-emerald-500/10";case"medium":case"中级":return"text-amber-400 bg-amber-500/10";case"hard":case"高级":return"text-red-400 bg-red-500/10";default:return"text-slate-500 bg-slate-800"}}function ce(){const[r,b]=(0,n.useState)([]),[m,k]=(0,n.useState)(!0),[j,S]=(0,n.useState)(null),[p,_]=(0,n.useState)(""),[w,x]=(0,n.useState)({}),[y,v]=(0,n.useState)(null),P=R(t=>t.plugins),E=new Set(P.map(t=>t.manifest.id)),N=(0,n.useCallback)(async()=>{k(!0),S(null);try{const t=await fetch(oe);if(!t.ok)throw new Error(`HTTP ${t.status}: ${t.statusText}`);const a=await t.json();b(a.plugins||[])}catch(t){const a=t instanceof Error?t.message:"Failed to load market plugins";S(a)}finally{k(!1)}},[]);(0,n.useEffect)(()=>{const t=setTimeout(()=>N(),0);return()=>clearTimeout(t)},[N]);const T=async t=>{x(a=>({...a,[t.id]:{status:"installing",message:"正在下载..."}}));try{const a=await fetch("/api/plugins/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pluginId:t.id,manifestUrl:t.manifestUrl,pluginUrl:t.pluginUrl})}),o=await a.json();a.ok?x(d=>({...d,[t.id]:{status:"success",message:"安装成功，请刷新插件列表"}})):x(d=>({...d,[t.id]:{status:"error",message:o.error||"安装失败"}}))}catch(a){const o=a instanceof Error?a.message:"网络错误";x(d=>({...d,[t.id]:{status:"error",message:o}}))}},g=async t=>{if(confirm(`确定卸载插件 "${t}" ？
已安装的插件目录将被删除。`)){x(a=>({...a,[t]:{status:"installing",message:"正在卸载..."}}));try{const a=await fetch("/api/plugins/uninstall",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pluginId:t})});if(a.ok)x(o=>({...o,[t]:{status:"success",message:"已卸载"}}));else{const o=await a.json();x(d=>({...d,[t]:{status:"error",message:o.error||"卸载失败"}}))}}catch(a){const o=a instanceof Error?a.message:"网络错误";x(d=>({...d,[t]:{status:"error",message:o}}))}}},c=r.filter(t=>{if(!p.trim())return!0;const a=p.toLowerCase();return t.name.toLowerCase().includes(a)||t.id.toLowerCase().includes(a)||t.description.toLowerCase().includes(a)||t.author.toLowerCase().includes(a)||t.tags?.some(o=>o.toLowerCase().includes(a))});return(0,e.jsxs)("div",{className:"flex h-full flex-col",children:[(0,e.jsxs)("div",{className:"mb-3 flex items-center justify-between",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(q,{size:16,className:"text-sky-400"}),(0,e.jsx)("h3",{className:"text-sm font-medium text-slate-300",children:"插件市场"}),r.length>0&&(0,e.jsxs)("span",{className:"rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400",children:[r.length," 个可用"]})]}),(0,e.jsxs)("button",{onClick:N,disabled:m,className:"btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300",children:[(0,e.jsx)(z,{size:12,className:m?"animate-spin":""}),"刷新"]})]}),(0,e.jsxs)("div",{className:"relative mb-3",children:[(0,e.jsx)($,{size:14,className:"pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-600"}),(0,e.jsx)("input",{className:"w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pr-3 pl-9 text-xs text-slate-300 placeholder-slate-600 transition-colors outline-none focus:border-sky-500/50 focus:bg-slate-800",placeholder:"搜索插件名称、标签、作者...",value:p,onChange:t=>_(t.target.value)}),p&&(0,e.jsx)("button",{onClick:()=>_(""),className:"absolute top-1/2 right-3 -translate-y-1/2 text-slate-600 hover:text-slate-400",children:(0,e.jsx)(H,{size:14})})]}),m&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(z,{size:24,className:"mx-auto mb-2 animate-spin text-slate-500"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:"正在加载市场列表..."})]})}),!m&&j&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(D,{size:32,className:"mx-auto mb-2 text-red-400"}),(0,e.jsx)("p",{className:"text-xs text-red-400",children:j}),(0,e.jsx)("button",{onClick:N,className:"mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700",children:"重试"})]})}),!m&&!j&&c.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)($,{size:32,className:"mx-auto mb-2 text-slate-600"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:p?"没有匹配的插件":"市场暂无可用插件"})]})}),!m&&!j&&c.length>0&&(0,e.jsx)("div",{className:"flex-1 space-y-2 overflow-y-auto pr-1",children:c.map(t=>{const a=E.has(t.id),o=w[t.id],d=y===t.id;return(0,e.jsxs)("div",{className:`rounded-lg border transition-all ${a?"border-emerald-700/30 bg-emerald-900/10":"border-slate-700/30 bg-slate-900/40 hover:border-slate-600/50"}`,children:[(0,e.jsxs)("div",{className:"flex items-start gap-3 p-3",children:[(0,e.jsx)("div",{className:"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800",children:(0,e.jsx)(A,{size:16,className:"text-slate-400"})}),(0,e.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)("h4",{className:"text-sm font-medium text-slate-200",children:t.name}),(0,e.jsxs)("span",{className:"rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500",children:["v",t.version]}),a&&(0,e.jsx)("span",{className:"rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400",children:"已安装"})]}),(0,e.jsx)("p",{className:"mt-0.5 line-clamp-2 text-xs text-slate-500",children:t.description}),(0,e.jsxs)("div",{className:"mt-1.5 flex flex-wrap items-center gap-1.5",children:[(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:["作者: ",t.author]}),t.tags?.map(C=>(0,e.jsx)("span",{className:`rounded px-1.5 py-0.5 text-[9px] ${ie(C)}`,children:C},C)),t.downloads!==void 0&&(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:["↓ ",t.downloads]})]})]}),(0,e.jsxs)("div",{className:"flex shrink-0 items-center gap-1",children:[(0,e.jsx)("button",{onClick:()=>v(d?null:t.id),className:"btn btn-ghost rounded-lg p-1.5 text-slate-600 hover:text-slate-400",children:(0,e.jsx)(K,{size:14,className:`transition-transform ${d?"rotate-180":""}`})}),a?(0,e.jsx)("button",{onClick:()=>g(t.id),disabled:o?.status==="installing",className:"btn btn-ghost rounded-lg p-1.5 text-red-500/60 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40",title:"卸载",children:(0,e.jsx)(Q,{size:14})}):(0,e.jsxs)("button",{onClick:()=>T(t),disabled:o?.status==="installing",className:`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${o?.status==="success"?"bg-emerald-500/10 text-emerald-400":"bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"} disabled:opacity-40`,children:[o?.status==="installing"?(0,e.jsx)(z,{size:12,className:"animate-spin"}):o?.status==="success"?(0,e.jsx)(Y,{size:12}):(0,e.jsx)(B,{size:12}),o?.message||"安装"]})]})]}),d&&t.manifestUrl&&(0,e.jsx)("div",{className:"border-t border-slate-700/30 px-3 py-2",children:(0,e.jsxs)("div",{className:"flex items-center gap-3 text-[11px] text-slate-600",children:[(0,e.jsxs)("span",{children:["ID: ",(0,e.jsx)("code",{className:"text-slate-500",children:t.id})]}),t.updatedAt&&(0,e.jsxs)("span",{children:["更新: ",new Date(t.updatedAt).toLocaleDateString("zh-CN")]}),(0,e.jsxs)("a",{href:t.manifestUrl.replace("/manifest.json",""),target:"_blank",rel:"noopener noreferrer",className:"ml-auto flex items-center gap-1 text-sky-500/60 hover:text-sky-400",children:[(0,e.jsx)(Z,{size:10}),"源码"]})]})})]},t.id)})}),!m&&!j&&r.length>0&&(0,e.jsx)("div",{className:"mt-2 text-center text-[10px] text-slate-700",children:"插件运行在 iframe 沙箱中，安全隔离"})]})}function ge(){const[r,b]=(0,n.useState)("installed"),[m,k]=(0,n.useState)([]),[j,S]=(0,n.useState)(!0),[p,_]=(0,n.useState)(null),[w,x]=(0,n.useState)({}),[y,v]=(0,n.useState)({}),[P,E]=(0,n.useState)({}),N=(0,n.useRef)(!1),T=(0,n.useRef)([]),[g,c]=(0,n.useState)(0),t=R(s=>s.plugins),a=R(s=>s.enablePlugin),o=R(s=>s.disablePlugin),d=(0,n.useCallback)(async()=>{S(!0),_(null);try{const s=await ae();k(s),T.current=s;const i={},u={};for(const f of s){try{i[f.id]=await ne(f.entry)}catch(h){const G=h instanceof Error?h.message:String(h);console.error(`[PluginsPage] Failed to fetch code for "${f.id}":`,G)}u[f.id]=Date.now()+Math.random()}x(i),E(u),v({});const l=R.getState();for(const f of s)l.getPlugin(f.id)||l.registerPlugin({id:f.id,name:f.name,version:f.version,description:f.description,author:f.author,icon:f.icon,entry:f.entry,commands:f.commands.map(h=>({id:h.id,name:h.label||h.id,description:h.description,icon:h.icon})),panels:f.panels.map(h=>({id:h.id,name:h.title||h.id,icon:h.icon,position:"main"}))},{});c(f=>f+1)}catch(s){const i=s instanceof Error?s.message:"加载插件失败";_(i)}finally{S(!1)}},[]),C=s=>t.some(i=>i.manifest.id===s&&i.enabled),O=(s,i)=>{i?o(s):a(s)},I=(0,n.useCallback)(()=>{for(const s of m)re(s.id);x({}),v({}),E({}),N.current=!1,k([]),c(0),d()},[m,d]);(0,n.useEffect)(()=>{const s=setTimeout(()=>d(),0),i=se().on("plugins-changed",()=>{I()});return()=>{clearTimeout(s),i()}},[d,I]);const U=(0,n.useCallback)((s,i)=>{v(l=>({...l,[s]:!0})),c(l=>l+1);const u=T.current.find(l=>l.id===s);u&&L.register(s,{id:u.id,name:u.name,version:u.version,description:u.description,author:u.author,icon:u.icon,entry:u.entry,commands:(u.commands||[]).map(l=>({id:l.id,name:l.label||l.id,label:l.label,description:l.description,icon:l.icon})),panels:(u.panels||[]).map(l=>({id:l.id,name:l.title||l.id,icon:l.icon,position:"main"}))},i)},[]);return(0,e.jsxs)("div",{className:"flex h-full flex-col p-4 sm:p-6",children:[(0,e.jsx)("div",{className:"mb-4",children:(0,e.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[(0,e.jsxs)("div",{className:"flex flex-wrap items-center gap-3",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(A,{size:20,className:"text-slate-400"}),(0,e.jsx)("h2",{className:"text-lg font-semibold text-slate-200",children:"插件"})]}),(0,e.jsxs)("div",{className:"flex rounded-lg border border-slate-700/50 bg-slate-900 p-0.5",children:[(0,e.jsxs)("button",{onClick:()=>b("installed"),className:`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${r==="installed"?"bg-slate-700/60 text-slate-200 shadow-sm":"text-slate-500 hover:text-slate-300"}`,children:[(0,e.jsx)(A,{size:13}),"已安装",m.length>0&&(0,e.jsx)("span",{className:"ml-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400",children:m.length})]}),(0,e.jsxs)("button",{onClick:()=>b("market"),className:`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${r==="market"?"bg-slate-700/60 text-slate-200 shadow-sm":"text-slate-500 hover:text-slate-300"}`,children:[(0,e.jsx)(q,{size:13}),"市场"]})]})]}),r==="installed"&&(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[m.length>0&&(0,e.jsxs)("span",{className:"flex items-center gap-1 text-[11px] text-emerald-500/70",children:[(0,e.jsx)(M,{size:12}),"沙箱隔离"]}),(0,e.jsxs)("button",{onClick:I,disabled:j,className:"btn-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200",children:[(0,e.jsx)(ee,{size:14,className:j?"animate-spin":""}),"刷新"]})]})]})}),r==="installed"&&(0,e.jsxs)(e.Fragment,{children:[j&&m.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(z,{size:32,className:"mx-auto mb-3 animate-spin text-slate-500"}),(0,e.jsx)("p",{className:"text-sm text-slate-500",children:"正在加载插件..."})]})}),p&&!j&&g>=0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(D,{size:40,className:"mx-auto mb-3 text-red-400"}),(0,e.jsx)("p",{className:"text-sm text-red-400",children:p}),(0,e.jsx)("button",{onClick:I,className:"mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700",children:"重试"})]})}),!j&&!p&&m.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-700/50",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(A,{size:48,className:"mx-auto mb-3 text-slate-600"}),(0,e.jsx)("p",{className:"text-sm text-slate-500",children:"没有安装任何插件"}),(0,e.jsx)("p",{className:"mt-1 text-xs text-slate-600",children:"将插件放入 plugins/ 目录后自动识别"})]})}),m.length>0&&(0,e.jsxs)("div",{className:"flex flex-1 flex-col gap-4 overflow-hidden sm:flex-row",children:[(0,e.jsx)("div",{className:"max-h-[40vh] w-full shrink-0 space-y-3 overflow-y-auto sm:max-h-none sm:w-72 sm:pr-2",children:m.map(s=>{const i=C(s.id),u=y[s.id];return(0,e.jsx)("div",{className:`rounded-lg border p-4 transition-colors ${i?"border-slate-600/50 bg-slate-800/50":"border-slate-700/30 bg-slate-900/50"}`,children:(0,e.jsxs)("div",{className:"flex items-start justify-between",children:[(0,e.jsxs)("div",{className:"flex-1",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)("h3",{className:"text-sm font-medium text-slate-200",children:s.name}),(0,e.jsxs)("span",{className:"rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500",children:["v",s.version]}),!u&&w[s.id]&&(0,e.jsx)(z,{size:12,className:"animate-spin text-amber-400"}),!w[s.id]&&(0,e.jsx)("span",{className:"text-[10px] text-slate-600",children:"⏳ 代码未加载"})]}),(0,e.jsx)("p",{className:"mt-1 text-xs text-slate-500",children:s.description}),(0,e.jsxs)("div",{className:"mt-2 flex items-center gap-3 text-[11px] text-slate-600",children:[(0,e.jsxs)("span",{children:["作者: ",s.author]}),s.commands?.length>0&&(0,e.jsxs)("span",{children:[s.commands.length," 个命令"]})]}),s.commands&&s.commands.length>0&&(0,e.jsx)("div",{className:"mt-2 flex flex-wrap gap-1.5",children:s.commands.map(l=>(0,e.jsxs)("button",{onClick:()=>{i&&(L.executeCommand(s.id,l.id),window.dispatchEvent(new CustomEvent("smartbox-notification",{detail:{message:`已执行: ${s.name} → ${l.label||l.id}（查看下方沙箱输出）`,type:"info",duration:4e3}})),window.innerWidth<640&&setTimeout(()=>{document.querySelector("[data-sandbox-area]")?.scrollIntoView({behavior:"smooth",block:"start"})},200))},disabled:!i,title:l.description||l.label||l.id,className:`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${i?"bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200":"cursor-not-allowed bg-slate-800/30 text-slate-600"}`,children:[i&&(0,e.jsx)(W,{size:10,className:"shrink-0"}),l.label||l.id]},l.id))})]}),(0,e.jsx)("button",{onClick:()=>O(s.id,i),disabled:!u,className:`ml-4 flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${i?"border-emerald-600/50 bg-emerald-500/10 text-emerald-400":"border-slate-700 text-slate-600 hover:border-slate-600 hover:text-slate-400"} ${u?"":"cursor-not-allowed opacity-50"}`,title:i?"禁用":"启用",children:i?(0,e.jsx)(J,{size:14}):(0,e.jsx)(H,{size:14})})]})},s.id)})}),(0,e.jsxs)("div",{"data-sandbox-area":!0,className:"flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-700/30 bg-slate-900/30",children:[(0,e.jsxs)("div",{className:"flex shrink-0 items-center justify-between border-b border-slate-700/30 px-4 py-2",children:[(0,e.jsx)("h3",{className:"text-xs font-medium text-slate-400",children:"沙箱运行状态"}),(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:[Object.keys(y).filter(s=>y[s]).length,"/",m.filter(s=>w[s.id]).length," 就绪"]})]}),(0,e.jsx)("div",{className:"flex-1 overflow-y-auto p-3 sm:p-4",children:m.filter(s=>w[s.id]).length===0?(0,e.jsx)("div",{className:"flex items-center justify-center py-12 text-center",children:(0,e.jsx)("p",{className:"text-xs text-slate-600",children:"沙箱加载中，请稍候..."})}):(0,e.jsx)("div",{className:"grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",children:m.filter(s=>w[s.id]).map(s=>(0,e.jsxs)("div",{className:"rounded-lg border border-slate-700/30 bg-slate-900/50",children:[(0,e.jsxs)("div",{className:"flex items-center justify-between border-b border-slate-700/30 px-3 py-1.5",children:[(0,e.jsx)("span",{className:"text-xs font-medium text-slate-400",children:s.name}),(0,e.jsxs)("span",{className:"flex items-center gap-1 text-[10px] text-emerald-500/70",children:[(0,e.jsx)(M,{size:10}),y[s.id]?"沙箱就绪":"加载中"]})]}),(0,e.jsx)("div",{className:"flex h-48 items-center justify-center sm:h-32",children:P[s.id]?(0,e.jsx)(le,{manifest:{id:s.id,name:s.name,version:s.version,description:s.description,author:s.author,icon:s.icon,entry:s.entry},pluginCode:w[s.id]||"",onReady:i=>U(s.id,i),onError:i=>console.error(`[Plugins] ${s.name} error:`,i)},P[s.id]):(0,e.jsx)("span",{className:"text-[10px] text-slate-600",children:"点击左侧命令按钮执行"})})]},s.id))})})]})]})]}),r==="market"&&(0,e.jsx)("div",{className:"flex-1 overflow-hidden",children:(0,e.jsx)(ce,{})})]})}export{ge as default};
