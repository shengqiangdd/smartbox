const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-C2QlMff_.js","assets/rolldown-runtime-b3L32Ng1.js","assets/vendor-lucide-CGTQRX6j.js","assets/vendor-router-DKtXqnLv.js","assets/vendor-state-DbOB7GbH.js","assets/index-B6pevAnH.css"])))=>i.map(i=>d[i]);
import{r as G}from"./rolldown-runtime-b3L32Ng1.js";import{$ as X,C as O,E as W,Ft as J,H as M,It as D,Lt as K,Tt as L,_ as $,ct as B,et as V,f as U,lt as Y,n as H,o as Q,x as Z}from"./vendor-lucide-CGTQRX6j.js";import{i as ee}from"./vendor-router-DKtXqnLv.js";import{a as te,i as q,r as z}from"./index-C2QlMff_.js";import{n as se}from"./websocket-PwStSdX1.js";var n=G(K(),1);async function ae(){try{const r=await fetch("/api/plugins");if(!r.ok)throw new Error(`HTTP ${r.status}: ${r.statusText}`);return(await r.json()).plugins||[]}catch(r){return console.error("[PluginManager] Failed to fetch plugins:",r),[]}}async function re(r){const h=await fetch(r);if(!h.ok)throw new Error(`Failed to load plugin JS: HTTP ${h.status}`);return await h.text()}function ne(r){z.getState().unregisterPlugin(r),q.unregister(r)}var e=te(),A=null;function F(){return A||ee(()=>import("./index-C2QlMff_.js").then(r=>r.t).then(r=>{A=r.useFileStore}),__vite__mapDeps([0,1,2,3,4,5])),A}function le({manifest:r,pluginCode:h,onReady:x,onCommandRegistered:w,onPanelRegistered:b,onNotification:S,onError:g,editorContent:R,editorLanguage:P}){const c=(0,n.useRef)(null),[_,C]=(0,n.useState)(!1),[I,v]=(0,n.useState)(!0),[y,E]=(0,n.useState)(null);(0,n.useRef)(new Map);const T=(0,n.useRef)(null),f=(0,n.useRef)(null),s=(0,n.useRef)(!1),l=(0,n.useCallback)(()=>{const a=`
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e2e8f0; overflow: auto; }
        #plugin-root { min-height: 100%; padding: 4px; }
      </style>
    `,o=JSON.stringify(r.id);return`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer">${a}</head><body><div id="plugin-root"></div><script>${`
(function() {
  'use strict';

  var messageSeq = 0;
  var pendingCalls = {};
  var isRegistered = false;

  function sendToHost(type, payload) {
    var seq = ++messageSeq;
    window.parent.postMessage({
      source: 'smartbox-plugin-sandbox',
      pluginId: ${o},
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
  var STORAGE_PREFIX = 'smartbox_plugin_' + ${o} + '_';
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
    getPluginId: function() { return ${o}; },
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
          try { handler(); } catch(e) { console.error('[Plugin] Command error:', e); }
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
    ${h}
  } catch(e) {
    sendToHost('pluginError', { error: e.message || String(e) });
  }
})();
`}<\/script></body></html>`},[r.id,r.name,h]);return(0,n.useEffect)(()=>{const a=c.current;if(a){v(!0),E(null),C(!1),f.current&&(URL.revokeObjectURL(f.current),f.current=null);try{const o=l(),d=new Blob([o],{type:"text/html; charset=utf-8"}),m=URL.createObjectURL(d);return f.current=m,a.src=m,()=>{f.current&&(URL.revokeObjectURL(f.current),f.current=null)}}catch(o){const d=o.message||"Failed to create sandbox";E(d),v(!1),g?.(d)}}},[r.id,h]),(0,n.useEffect)(()=>{if(s.current)return;s.current=!0;const a=o=>{const d=o.data;if(!(!d||d.source!=="smartbox-plugin-sandbox")&&d.pluginId===r.id)switch(d.type){case"sandboxReady":C(!0),v(!1),x?.(T.current);break;case"registerCommand":{const m=d.payload.command;m?.id&&w?.(m);break}case"showNotification":{const{message:m,type:j}=d.payload;S?.(m||"",j||"info");break}case"pluginError":{const m=d.payload.error;E(m),v(!1),g?.(m);break}case"setEditorContent":{const m=F();if(m){const j=m.getState(),t=d.payload.content;j.activeTabId&&t!==void 0&&j.updateFileContent(j.activeTabId,t)}break}case"getEditorContent":{const m=F();if(m){const j=m.getState(),t=j.openTabs?.find(N=>N.id===j.activeTabId),i=c.current;i?.contentWindow&&i.contentWindow.postMessage({source:"smartbox-host",type:"editorContentUpdate",content:t?.content??null,language:t?.language??null},"*")}break}}};return window.addEventListener("message",a),()=>{window.removeEventListener("message",a),s.current=!1}},[r.id,x,w,S,g]),(0,n.useEffect)(()=>{T.current={executeCommand:(a,o)=>{c.current?.contentWindow?.postMessage({source:"smartbox-host",type:"executeCommand",commandId:a,args:o||[]},"*")},updateEditorContent:(a,o)=>{c.current?.contentWindow?.postMessage({source:"smartbox-host",type:"editorContentUpdate",content:a,language:o},"*")},destroy:()=>{const a=c.current;a&&(a.src="about:blank")},iframe:c.current,reload:(a,o)=>{}}},[]),(0,e.jsxs)("div",{className:"relative h-full w-full overflow-hidden rounded-lg bg-slate-900/50",children:[I&&!y&&(0,e.jsx)("div",{className:"absolute inset-0 z-10 flex items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)("div",{className:"mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:"沙箱加载中..."})]})}),y&&(0,e.jsx)("div",{className:"absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-4",children:(0,e.jsxs)("div",{className:"max-w-xs text-center",children:[(0,e.jsx)("p",{className:"mb-1 text-sm text-red-400",children:"沙箱加载失败"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:y})]})}),(0,e.jsx)("iframe",{ref:c,title:`沙箱: ${r.name}`,className:"h-full w-full border-0",sandbox:"allow-scripts",style:{background:"transparent"}})]})}var oe="/api/market/index";function ie(r){switch(r?.toLowerCase()){case"easy":case"入门":return"text-emerald-400 bg-emerald-500/10";case"medium":case"中级":return"text-amber-400 bg-amber-500/10";case"hard":case"高级":return"text-red-400 bg-red-500/10";default:return"text-slate-500 bg-slate-800"}}function ce(){const[r,h]=(0,n.useState)([]),[x,w]=(0,n.useState)(!0),[b,S]=(0,n.useState)(null),[g,R]=(0,n.useState)(""),[P,c]=(0,n.useState)({}),[_,C]=(0,n.useState)(null),I=z(s=>s.plugins),v=new Set(I.map(s=>s.manifest.id)),y=(0,n.useCallback)(async()=>{w(!0),S(null);try{const s=await fetch(oe);if(!s.ok)throw new Error(`HTTP ${s.status}: ${s.statusText}`);h((await s.json()).plugins||[])}catch(s){S(s.message||"Failed to load market plugins")}finally{w(!1)}},[]);(0,n.useEffect)(()=>{y()},[y]);const E=async s=>{c(l=>({...l,[s.id]:{status:"installing",message:"正在下载..."}}));try{const l=await fetch("/api/plugins/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pluginId:s.id,manifestUrl:s.manifestUrl,pluginUrl:s.pluginUrl})}),a=await l.json();l.ok?c(o=>({...o,[s.id]:{status:"success",message:"安装成功，请刷新插件列表"}})):c(o=>({...o,[s.id]:{status:"error",message:a.error||"安装失败"}}))}catch(l){c(a=>({...a,[s.id]:{status:"error",message:l.message||"网络错误"}}))}},T=async s=>{if(confirm(`确定卸载插件 "${s}" ？
已安装的插件目录将被删除。`)){c(l=>({...l,[s]:{status:"installing",message:"正在卸载..."}}));try{const l=await fetch("/api/plugins/uninstall",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pluginId:s})});if(l.ok)c(a=>({...a,[s]:{status:"success",message:"已卸载"}}));else{const a=await l.json();c(o=>({...o,[s]:{status:"error",message:a.error||"卸载失败"}}))}}catch(l){c(a=>({...a,[s]:{status:"error",message:l.message||"网络错误"}}))}}},f=r.filter(s=>{if(!g.trim())return!0;const l=g.toLowerCase();return s.name.toLowerCase().includes(l)||s.id.toLowerCase().includes(l)||s.description.toLowerCase().includes(l)||s.author.toLowerCase().includes(l)||s.tags?.some(a=>a.toLowerCase().includes(l))});return(0,e.jsxs)("div",{className:"flex h-full flex-col",children:[(0,e.jsxs)("div",{className:"mb-3 flex items-center justify-between",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(M,{size:16,className:"text-sky-400"}),(0,e.jsx)("h3",{className:"text-sm font-medium text-slate-300",children:"插件市场"}),r.length>0&&(0,e.jsxs)("span",{className:"rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400",children:[r.length," 个可用"]})]}),(0,e.jsxs)("button",{onClick:y,disabled:x,className:"btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300",children:[(0,e.jsx)(L,{size:12,className:x?"animate-spin":""}),"刷新"]})]}),(0,e.jsxs)("div",{className:"relative mb-3",children:[(0,e.jsx)($,{size:14,className:"pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"}),(0,e.jsx)("input",{className:"w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pl-9 pr-3 text-xs text-slate-300 placeholder-slate-600 outline-none transition-colors focus:border-sky-500/50 focus:bg-slate-800",placeholder:"搜索插件名称、标签、作者...",value:g,onChange:s=>R(s.target.value)}),g&&(0,e.jsx)("button",{onClick:()=>R(""),className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400",children:(0,e.jsx)(H,{size:14})})]}),x&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(L,{size:24,className:"mx-auto mb-2 animate-spin text-slate-500"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:"正在加载市场列表..."})]})}),!x&&b&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(D,{size:32,className:"mx-auto mb-2 text-red-400"}),(0,e.jsx)("p",{className:"text-xs text-red-400",children:b}),(0,e.jsx)("button",{onClick:y,className:"mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700",children:"重试"})]})}),!x&&!b&&f.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)($,{size:32,className:"mx-auto mb-2 text-slate-600"}),(0,e.jsx)("p",{className:"text-xs text-slate-500",children:g?"没有匹配的插件":"市场暂无可用插件"})]})}),!x&&!b&&f.length>0&&(0,e.jsx)("div",{className:"flex-1 space-y-2 overflow-y-auto pr-1",children:f.map(s=>{const l=v.has(s.id),a=P[s.id],o=_===s.id;return(0,e.jsxs)("div",{className:`rounded-lg border transition-all ${l?"border-emerald-700/30 bg-emerald-900/10":"border-slate-700/30 bg-slate-900/40 hover:border-slate-600/50"}`,children:[(0,e.jsxs)("div",{className:"flex items-start gap-3 p-3",children:[(0,e.jsx)("div",{className:"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800",children:(0,e.jsx)(O,{size:16,className:"text-slate-400"})}),(0,e.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)("h4",{className:"text-sm font-medium text-slate-200",children:s.name}),(0,e.jsxs)("span",{className:"rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500",children:["v",s.version]}),l&&(0,e.jsx)("span",{className:"rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400",children:"已安装"})]}),(0,e.jsx)("p",{className:"mt-0.5 text-xs text-slate-500 line-clamp-2",children:s.description}),(0,e.jsxs)("div",{className:"mt-1.5 flex flex-wrap items-center gap-1.5",children:[(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:["作者: ",s.author]}),s.tags?.map(d=>(0,e.jsx)("span",{className:`rounded px-1.5 py-0.5 text-[9px] ${ie(d)}`,children:d},d)),s.downloads!==void 0&&(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:["↓ ",s.downloads]})]})]}),(0,e.jsxs)("div",{className:"flex shrink-0 items-center gap-1",children:[(0,e.jsx)("button",{onClick:()=>C(o?null:s.id),className:"btn btn-ghost rounded-lg p-1.5 text-slate-600 hover:text-slate-400",children:(0,e.jsx)(B,{size:14,className:`transition-transform ${o?"rotate-180":""}`})}),l?(0,e.jsx)("button",{onClick:()=>T(s.id),disabled:a?.status==="installing",className:"btn btn-ghost rounded-lg p-1.5 text-red-500/60 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40",title:"卸载",children:(0,e.jsx)(Q,{size:14})}):(0,e.jsxs)("button",{onClick:()=>E(s),disabled:a?.status==="installing",className:`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${a?.status==="success"?"bg-emerald-500/10 text-emerald-400":"bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"} disabled:opacity-40`,children:[a?.status==="installing"?(0,e.jsx)(L,{size:12,className:"animate-spin"}):a?.status==="success"?(0,e.jsx)(J,{size:12}):(0,e.jsx)(V,{size:12}),a?.message||"安装"]})]})]}),o&&s.manifestUrl&&(0,e.jsx)("div",{className:"border-t border-slate-700/30 px-3 py-2",children:(0,e.jsxs)("div",{className:"flex items-center gap-3 text-[11px] text-slate-600",children:[(0,e.jsxs)("span",{children:["ID: ",(0,e.jsx)("code",{className:"text-slate-500",children:s.id})]}),s.updatedAt&&(0,e.jsxs)("span",{children:["更新: ",new Date(s.updatedAt).toLocaleDateString("zh-CN")]}),(0,e.jsxs)("a",{href:s.manifestUrl.replace("/manifest.json",""),target:"_blank",rel:"noopener noreferrer",className:"ml-auto flex items-center gap-1 text-sky-500/60 hover:text-sky-400",children:[(0,e.jsx)(X,{size:10}),"源码"]})]})})]},s.id)})}),!x&&!b&&r.length>0&&(0,e.jsx)("div",{className:"mt-2 text-center text-[10px] text-slate-700",children:"插件运行在 iframe 沙箱中，安全隔离"})]})}function ge(){const[r,h]=(0,n.useState)("installed"),[x,w]=(0,n.useState)([]),[b,S]=(0,n.useState)(!0),[g,R]=(0,n.useState)(null),P=(0,n.useRef)({}),c=(0,n.useRef)({}),_=(0,n.useRef)({}),C=(0,n.useRef)(!1),[I,v]=(0,n.useState)(0),y=z(t=>t.plugins),E=z(t=>t.enablePlugin),T=z(t=>t.disablePlugin),f=(0,n.useCallback)(async()=>{if(!C.current){C.current=!0,S(!0),R(null);try{const t=await ae();w(t);const i={},N={};for(const u of t){try{i[u.id]=await re(u.entry)}catch(p){console.error(`[PluginsPage] Failed to fetch code for "${u.id}":`,p)}N[u.id]=Date.now()+Math.random()}P.current=i,_.current=N,c.current={};const k=z.getState();for(const u of t)k.getPlugin(u.id)||k.registerPlugin({id:u.id,name:u.name,version:u.version,description:u.description,author:u.author,icon:u.icon,entry:u.entry,commands:u.commands.map(p=>({id:p.id,name:p.label||p.id,description:p.description,icon:p.icon})),panels:u.panels.map(p=>({id:p.id,name:p.title||p.id,icon:p.icon,position:"main"}))},{});v(u=>u+1)}catch(t){R(t.message||"加载插件失败")}finally{S(!1)}}},[]);(0,n.useEffect)(()=>(f(),se().on("plugins-changed",()=>{a()})),[]);const s=t=>y.some(i=>i.manifest.id===t&&i.enabled),l=(t,i)=>{i?T(t):E(t)},a=()=>{for(const t of x)ne(t.id);P.current={},c.current={},_.current={},C.current=!1,w([]),v(0),f()},o=(0,n.useCallback)((t,i)=>{c.current={...c.current,[t]:!0},v(N=>N+1)},[]),d=P.current,m=c.current,j=_.current;return(0,e.jsxs)("div",{className:"flex h-full flex-col p-6",children:[(0,e.jsx)("div",{className:"mb-4",children:(0,e.jsxs)("div",{className:"flex items-center justify-between",children:[(0,e.jsxs)("div",{className:"flex items-center gap-3",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(O,{size:20,className:"text-slate-400"}),(0,e.jsx)("h2",{className:"text-lg font-semibold text-slate-200",children:"插件"})]}),(0,e.jsxs)("div",{className:"flex rounded-lg border border-slate-700/50 bg-slate-900 p-0.5",children:[(0,e.jsxs)("button",{onClick:()=>h("installed"),className:`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${r==="installed"?"bg-slate-700/60 text-slate-200 shadow-sm":"text-slate-500 hover:text-slate-300"}`,children:[(0,e.jsx)(O,{size:13}),"已安装",x.length>0&&(0,e.jsx)("span",{className:"ml-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400",children:x.length})]}),(0,e.jsxs)("button",{onClick:()=>h("market"),className:`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${r==="market"?"bg-slate-700/60 text-slate-200 shadow-sm":"text-slate-500 hover:text-slate-300"}`,children:[(0,e.jsx)(M,{size:13}),"市场"]})]})]}),r==="installed"&&(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[x.length>0&&(0,e.jsxs)("span",{className:"flex items-center gap-1 text-[11px] text-emerald-500/70",children:[(0,e.jsx)(U,{size:12}),"沙箱隔离"]}),(0,e.jsxs)("button",{onClick:a,disabled:b,className:"btn-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200",children:[(0,e.jsx)(Z,{size:14,className:b?"animate-spin":""}),"刷新"]})]})]})}),r==="installed"&&(0,e.jsxs)(e.Fragment,{children:[b&&x.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(L,{size:32,className:"mx-auto mb-3 animate-spin text-slate-500"}),(0,e.jsx)("p",{className:"text-sm text-slate-500",children:"正在加载插件..."})]})}),g&&!b&&I>=0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(D,{size:40,className:"mx-auto mb-3 text-red-400"}),(0,e.jsx)("p",{className:"text-sm text-red-400",children:g}),(0,e.jsx)("button",{onClick:a,className:"mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700",children:"重试"})]})}),!b&&!g&&x.length===0&&(0,e.jsx)("div",{className:"flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-700/50",children:(0,e.jsxs)("div",{className:"text-center",children:[(0,e.jsx)(O,{size:48,className:"mx-auto mb-3 text-slate-600"}),(0,e.jsx)("p",{className:"text-sm text-slate-500",children:"没有安装任何插件"}),(0,e.jsx)("p",{className:"mt-1 text-xs text-slate-600",children:"将插件放入 plugins/ 目录后自动识别"})]})}),x.length>0&&(0,e.jsxs)("div",{className:"flex flex-1 gap-4 overflow-hidden",children:[(0,e.jsx)("div",{className:"w-72 shrink-0 space-y-3 overflow-y-auto pr-2",children:x.map(t=>{const i=s(t.id),N=m[t.id];return(0,e.jsx)("div",{className:`rounded-lg border p-4 transition-colors ${i?"border-slate-600/50 bg-slate-800/50":"border-slate-700/30 bg-slate-900/50"}`,children:(0,e.jsxs)("div",{className:"flex items-start justify-between",children:[(0,e.jsxs)("div",{className:"flex-1",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)("h3",{className:"text-sm font-medium text-slate-200",children:t.name}),(0,e.jsxs)("span",{className:"rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500",children:["v",t.version]}),!N&&d[t.id]&&(0,e.jsx)(L,{size:12,className:"animate-spin text-amber-400"}),!d[t.id]&&(0,e.jsx)("span",{className:"text-[10px] text-slate-600",children:"⏳ 代码未加载"})]}),(0,e.jsx)("p",{className:"mt-1 text-xs text-slate-500",children:t.description}),(0,e.jsxs)("div",{className:"mt-2 flex items-center gap-3 text-[11px] text-slate-600",children:[(0,e.jsxs)("span",{children:["作者: ",t.author]}),t.commands?.length>0&&(0,e.jsxs)("span",{children:[t.commands.length," 个命令"]})]}),t.commands&&t.commands.length>0&&(0,e.jsx)("div",{className:"mt-2 flex flex-wrap gap-1.5",children:t.commands.map(k=>(0,e.jsxs)("button",{onClick:()=>{i&&q.executeCommand(t.id,k.id)},disabled:!i,title:k.description||k.label||k.id,className:`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors ${i?"bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200":"bg-slate-800/30 text-slate-600 cursor-not-allowed"}`,children:[i&&(0,e.jsx)(W,{size:8,className:"shrink-0"}),k.label||k.id]},k.id))})]}),(0,e.jsx)("button",{onClick:()=>l(t.id,i),disabled:!N,className:`ml-4 flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${i?"border-emerald-600/50 bg-emerald-500/10 text-emerald-400":"border-slate-700 text-slate-600 hover:border-slate-600 hover:text-slate-400"} ${N?"":"cursor-not-allowed opacity-50"}`,title:i?"禁用":"启用",children:i?(0,e.jsx)(Y,{size:14}):(0,e.jsx)(H,{size:14})})]})},t.id)})}),(0,e.jsxs)("div",{className:"flex-1 overflow-hidden rounded-lg border border-slate-700/30 bg-slate-900/30",children:[(0,e.jsxs)("div",{className:"border-b border-slate-700/30 px-4 py-2 flex items-center justify-between",children:[(0,e.jsx)("h3",{className:"text-xs font-medium text-slate-400",children:"沙箱运行状态"}),(0,e.jsxs)("span",{className:"text-[10px] text-slate-600",children:[Object.keys(m).filter(t=>m[t]).length,"/",x.length," 就绪"]})]}),(0,e.jsx)("div",{className:"grid grid-cols-2 gap-4 p-4",children:x.filter(t=>d[t.id]).map(t=>(0,e.jsxs)("div",{className:"rounded-lg border border-slate-700/30 bg-slate-900/50",children:[(0,e.jsxs)("div",{className:"flex items-center justify-between border-b border-slate-700/30 px-3 py-1.5",children:[(0,e.jsx)("span",{className:"text-xs font-medium text-slate-400",children:t.name}),(0,e.jsxs)("span",{className:"flex items-center gap-1 text-[10px] text-emerald-500/70",children:[(0,e.jsx)(U,{size:10}),m[t.id]?"沙箱就绪":"加载中"]})]}),(0,e.jsx)("div",{className:"h-32",children:j[t.id]&&(0,e.jsx)(le,{manifest:{id:t.id,name:t.name,version:t.version,description:t.description,author:t.author,icon:t.icon,entry:t.entry},pluginCode:d[t.id]||"",onReady:i=>o(t.id,i),onError:i=>console.error(`[Plugins] ${t.name} error:`,i)},j[t.id])})]},t.id))})]})]})]}),r==="market"&&(0,e.jsx)("div",{className:"flex-1 overflow-hidden",children:(0,e.jsx)(ce,{})})]})}export{ge as default};
