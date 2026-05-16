// ══════════════ MAPEAMENTOS E REGRAS DE NEGÓCIO ══════════════

// ══════════════ STATE ══════════════
let S = {
  version: null,
  checked:{},open:{},notes:{},wishlist:{},stack:{},
  tab:'lista',cat:'Todos',goal:'',showDone:true,showExtra:true,goalFilter:'',priceFilter:'',
  cmpSel:[],rSel:[],history:[],cycleStart:{},cycleNote:{},cyclePause:{},
  cfg:{isAdmin:false,showStars:true,showPdose:true,confetti:true,theme:'dark',delay:280,
       alertInteractions:true,alertCycles:true,toasts:true,
       expandOnClick:true,confirmUncheck:false,autoSync:true,defaultSort:'priority'},
  lastSave:null
};
let _confDone=false,_stickyItem=null;
const STORAGE_KEY='suplilist_v3';
let fuse = null;


// ══════════════ SYNC SYSTEM ══════════════
let _syncDebounceTimer=null;
let _syncStatus='idle'; 

function _setSyncUI(status,msg){
  _syncStatus=status;
  const simpleEls=[document.getElementById('ls'),document.getElementById('last-save')];
  simpleEls.forEach(el=>{if(el)el.textContent=msg;});
  const ls2=document.getElementById('ls2');
  if(ls2){const txt=ls2.querySelector('span:last-child');if(txt)txt.textContent=msg;}
  const indicator=document.getElementById('sync-indicator');
  if(indicator){
    indicator.className='sync-dot';
    if(status==='syncing')indicator.classList.add('syncing');
    else if(status==='done')indicator.classList.add('done');
    else if(status==='error')indicator.classList.add('error');
    else if(status==='pending')indicator.classList.add('pending');
  }
}

function _doSave(){
  _setSyncUI('syncing','Salvando no dispositivo…');
  S.lastSave=new Date().toISOString();
  S.version = APP_VERSION; // Persiste a versão atual para validação futura
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(S));
    const t='Salvo no Dispositivo às '+new Date(S.lastSave).toLocaleTimeString('pt-BR');
    _setSyncUI('done',t);
  }catch(e){
    _setSyncUI('error','Erro ao salvar localmente');
    toast('⚠️','Erro ao salvar — armazenamento cheio','error',{duration:4000});
  }
}

function save(){
  _setSyncUI('pending','Aguardando salvamento…');
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer=setTimeout(_doSave,600);
}

function syncNow(){
  clearTimeout(_syncDebounceTimer);
  _doSave();
  toast('💾','Dados salvos localmente','success',{duration:2000,progress:false});
}

function load(){
  try{
    const r=localStorage.getItem(STORAGE_KEY);
    if(r){
      const d=JSON.parse(r);

      // Validação de Schema / Migration
      const savedVersion = d.version || '0';
      if (savedVersion !== APP_VERSION) {
        console.warn(`[Version Control] Detectada v${savedVersion}. Atual: v${APP_VERSION}`);
        
        const migratedData = runMigrations(d, savedVersion, APP_VERSION);
        
        if (migratedData) {
          console.info("[Migration] Sucesso: Dados convertidos para v" + APP_VERSION);
          S = { ...S, ...migratedData };
        } else {
          // Fallback: Se não houver regra de migração, resetamos para evitar quebra silenciosa
          console.error("[Migration] Incompatibilidade crítica. Executando reset amigável.");
          toast('📢', 'Seus dados foram resetados após atualização para garantir estabilidade.', 'info', { duration: 7000 });
          S.version = APP_VERSION;
          save();
          return; // Aborta carregamento dos dados obsoletos
        }
      } else {
        S={...S,...d};
      }

      S.cfg={...S.cfg,...(d.cfg||{})};
      S.stack={...S.stack,...(d.stack||{})};
      S.cycleStart={...S.cycleStart,...(d.cycleStart||{})};
      S.cycleNote={...S.cycleNote,...(d.cycleNote||{})};
      S.cyclePause={...S.cyclePause,...(d.cyclePause||{})};
      // S.imgs foi removido, não é mais necessário carregar imagens base64
    }
  }catch(e){}
  if(!S.stack)S.stack={};
  if(!S.cycleStart)S.cycleStart={};
  if(!S.cycleNote)S.cycleNote={};
  if(!S.cyclePause)S.cyclePause={};
  if(!S.rSel)S.rSel=[];
  if(!S.cmpSel)S.cmpSel=[];
  if(!S.history)S.history=[];
}

/**
 * Transforma dados de schemas antigos para o schema atual.
 * @param {Object} d - Dados brutos vindos do localStorage.
 * @param {string} oldV - Versão salva no disco.
 * @param {string} newV - Versão APP_VERSION definida em data.js.
 * @returns {Object|null} - Dados migrados ou null para forçar reset.
 */
function runMigrations(d, oldV, newV) {
  // Exemplo de uso futuro: if(oldV === '14.0') { d.novoCampo = []; return d; }
  return null; // Por padrão, resetar se o schema divergir e não houver regra específica.
}


// ══════════════ THEME E CONFIGS GERAIS ══════════════
function setTheme(t){
  S.cfg.theme=t;
  document.body.setAttribute('data-theme',t);
  document.querySelectorAll('.th-opt').forEach(el=>el.classList.remove('on'));
  document.getElementById('th-'+t)?.classList.add('on');
  document.querySelectorAll('.cfg-th').forEach(el=>el.classList.remove('on'));
  document.getElementById('cfgth-'+t)?.classList.add('on');
  document.getElementById('theme-pop').classList.remove('on');
  const btn=document.getElementById('theme-toggle-btn');
  if(btn)btn.setAttribute('aria-expanded','false');
  save();
}

function toggleThemePop(){
  const pop=document.getElementById('theme-pop');
  const btn=document.getElementById('theme-toggle-btn');
  const isOpen=pop.classList.toggle('on');
  if(btn) btn.setAttribute('aria-expanded',isOpen?'true':'false');
}

function syncCfgThemeGrid(){
  const t=S.cfg.theme||'dark';
  document.querySelectorAll('.cfg-th').forEach(el=>el.classList.remove('on'));
  document.getElementById('cfgth-'+t)?.classList.add('on');
}

function toggleCfgExtra(){S.showExtra=!S.showExtra;applyCfg();renderList();save();}
function toggleCfgDone(){S.showDone=!S.showDone;applyCfg();renderList();save();}

function toggleAdminMode() {
  // Solicita senha apenas se estiver tentando ATIVAR o modo admin
  if (!S.cfg.isAdmin) {
    const pw = prompt("Digite a senha de administrador para acessar as ferramentas mestre:");
    if (pw !== "admin123") { // Você pode alterar "admin123" para a senha que desejar
      toast('🚫', 'Acesso negado: Senha incorreta', 'error');
      return;
    }
  }

  S.cfg.isAdmin = !S.cfg.isAdmin;
  const sec = document.getElementById('admin-section');
  if (sec) {
    if (S.cfg.isAdmin) {
      sec.style.setProperty('display', 'block', 'important');
    } else {
      sec.style.setProperty('display', 'none', 'important');
    }
  }
  save();
  const msg = S.cfg.isAdmin ? 'Modo Administrador Ativado' : 'Modo Administrador Desativado';
  toast(S.cfg.isAdmin ? '🛠️' : '🔒', msg, 'info');
}

function runDatabaseAudit() {
  if (!S.cfg.isAdmin) return;

  const total = IT.length;
  const manualLinks = IT.filter(i => PRODUCT_LINKS[i.id]).length;
  const missingManual = IT.filter(i => !PRODUCT_LINKS[i.id]);
  const withImages = IT.filter(i => SUPP_IMGS[i.id]).length;

  console.group("📊 Relatório de Auditoria - SupliList");
  console.log(`Total de Itens: ${total}`);
  console.log(`Links Manuais: ${manualLinks} (${Math.round(manualLinks/total*100)}%)`);
  console.log(`Imagens Mapeadas: ${withImages} (${Math.round(withImages/total*100)}%)`);
  
  if (missingManual.length > 0) {
    console.warn("⚠️ Itens operando apenas com busca automática (sem link direto no links.js):");
    missingManual.forEach(i => console.log(`- ID ${i.id}: ${i.name}`));
  } else {
    console.log("✅ Todos os itens possuem links manuais!");
  }
  console.groupEnd();

  toast('📊', `Auditoria: ${manualLinks}/${total} links manuais. Veja o console (F12).`, 'info', {duration: 5000});
}

function copyToClipboard(){
  const checked=IT.filter(i=>S.checked[i.id]).map(i=>'✅ '+i.name);
  const pending=IT.filter(i=>!S.checked[i.id]&&i.pr!=='extra').map(i=>'☐ '+i.name);
  const txt=[...checked,...pending].join('\n');
  navigator.clipboard.writeText(txt)
    .then(()=>toast('📋','Lista copiada para a área de transferência','success',{duration:2600}))
    .catch(()=>toast('⚠️','Não foi possível copiar','error',{duration:2600}));
}

function updateStorageSize(){
  const el=document.getElementById('storage-size');
  if(!el) return;
  try{
    const raw=localStorage.getItem(STORAGE_KEY)||'';
    const kb=(new Blob([raw]).size/1024).toFixed(1);
    el.textContent=kb+' KB';
  }catch(e){el.textContent='—';}
}

document.addEventListener('click',e=>{
  const p=document.getElementById('theme-pop');
  const btn=document.getElementById('theme-toggle-btn');
  if(p&&!p.contains(e.target)&&btn&&!btn.contains(e.target)){
    p.classList.remove('on');
    btn.setAttribute('aria-expanded','false');
  }
});


// ══════════════ NAV E ROTEAMENTO ══════════════
const PAGES=['home','lista','stack','wishlist','recipe','dose','compare','history','interact','faq','terms','config'];

function go(p, pushState=true){
  PAGES.forEach(pg=>{
    document.getElementById('p-'+pg)?.classList.remove('on');
    const tab=document.getElementById('nt-'+pg);
    if(tab){tab.classList.remove('on');tab.setAttribute('aria-selected','false');}
  });
  document.getElementById('p-'+p)?.classList.add('on');
  const activeTab=document.getElementById('nt-'+p);
  if(activeTab){activeTab.classList.add('on');activeTab.setAttribute('aria-selected','true');}
  
  S.tab=p;save();

  // Wrapper para capturar erros de runtime em cada seção
  const safeRender = (sectionId, sectionName, renderFn) => {
    try {
      renderFn();
    } catch (error) {
      console.group(`🚨 [Boundary] Falha na Seção: ${sectionName}`);
      console.error("Erro:", error);
      console.info("Ação:", S.tab);
      try {
        console.info("Dados Locais:", JSON.parse(localStorage.getItem(STORAGE_KEY)));
      } catch(e) {}
      console.groupEnd();

      const container = document.getElementById(`p-${sectionId}`);
      if (container) {
        container.innerHTML = `
          <div class="empty" style="padding:40px; border:1px dashed var(--red); background:var(--redd); border-radius:16px; margin:20px 0;">
            <div class="empty-ico" style="color:var(--red); filter:none;">🚫</div>
            <div class="empty-title" style="color:var(--tx)">Algo deu errado.</div>
            <p class="empty-sub">Ocorreu um erro inesperado na seção ${sectionName}.</p>
            <button class="btn bg" onclick="go('${sectionId}')" style="margin-top:16px">Tentar recarregar seção</button>
          </div>
        `;
      }
    }
  };

  if(p==='home') safeRender('home', 'Início', () => { initHomeReveal(); });
  
  if(p==='lista') safeRender('lista', 'Lista de Suplementos', () => { renderAll(); });

  if(p==='stack') safeRender('stack', 'Minha Stack', () => { 
    initStackSel(); 
    renderStack(); 
    renderCycles(); 
  });

  if(p==='wishlist') safeRender('wishlist', 'Favoritos', () => renderWishlist());

  if(p==='recipe') safeRender('recipe', 'Gerador de Receita', () => renderRecipeSel());

  if(p==='dose') safeRender('dose', 'Calculadora de Dose', () => renderDose());

  if(p==='compare') safeRender('compare', 'Comparador', () => renderCmp());

  if(p==='history') safeRender('history', 'Histórico', () => {
    initHist();
    renderHist();
  });

  if(p==='interact') safeRender('interact', 'Interações', () => renderInteract());

  if(p==='faq') safeRender('faq', 'FAQ', () => renderFaq());

  if(p==='terms') safeRender('terms', 'Termos de Uso', () => initTermsNav());

  if(p==='config') safeRender('config', 'Configurações', () => {
    syncCfgThemeGrid();
    updateStorageSize();
  });

  if(typeof bnSelect==='function')bnSelect(p);
  if(typeof syncBnBadges==='function')syncBnBadges();
  
  window.scrollTo({top:0,behavior:'smooth'});
  if(pushState){
    window.history.pushState({tab:p}, '', '#'+p);
  }
}

window.addEventListener('popstate', e=>{
  const tab = e.state?.tab || 'lista';
  go(tab, false); 
});


// ══════════════ RENDERIZAÇÃO DA LISTA E UI ══════════════
const MAIN=IT.filter(i=>i.pr!=='extra');
function doneCnt(){return IT.filter(i=>S.checked[i.id]).length;}
function allCats(){return['Todos',...new Set(MAIN.map(i=>i.cat))];}
function pdose(i){const p=bestMarketplacePrice(i);return i.doses&&p?Math.round((p/i.doses)*100)/100:null;}

function filtered(){
  const q=(document.getElementById('search')?.value||'').toLowerCase();
  const srt=document.getElementById('sort')?.value||'priority';
  const gf=document.getElementById('f-goal')?.value||'';
  const pf=document.getElementById('f-price')?.value||'';
  if(!fuse) fuse = new Fuse(IT, { keys: ['name', 'tags'], threshold: 0.3 });
  let baseList;
  if(q){
    const results = fuse.search(q);
    baseList = results.map(r => r.item);
  } else {
    baseList = IT;
  }
  let list=baseList.filter(i=>{
    if(i.pr==='extra'&&!S.showExtra) return false;
    if(!S.showDone&&S.checked[i.id]) return false;
    if(S.cat!=='Todos'&&i.cat!==S.cat) return false;
    if(gf&&!(i.goals||[]).includes(gf)) return false;
    if(pf){
      const [lo,hi]=pf.includes('+')?[parseInt(pf),999]:[...pf.split('-').map(Number)];
      if(i.pm<lo||i.pm>hi) return false;
    }
    return true;
  });
  if(srt==='name') list.sort((a,b)=>a.name.localeCompare(b.name,'pt'));
  else if(srt==='cat') list.sort((a,b)=>a.cat.localeCompare(b.cat,'pt'));
  else if(srt==='score') list.sort((a,b)=>b.sc-a.sc);
  else if(srt==='cost') list.sort((a,b)=>(a.pm||0)-(b.pm||0));
  else if(srt==='pdose') list.sort((a,b)=>(pdose(a)||99)-(pdose(b)||99));
  else list.sort((a,b)=>PRIO[a.pr]-PRIO[b.pr]);
  return list;
}

function starsHTML(n){
  if(!S.cfg.showStars) return '';
  return`<div class="stars">${[...Array(5)].map((_,i)=>`<div class="star${i<n?' on':''}"></div>`).join('')}</div>`;
}

function renderBuySection(it, idx) {
  // links.js já aplicou amazonAff() + mlAff() + utm() — usar direto, sem re-processar
  const azUrl   = it.linkAmazon || '';
  const spUrl   = it.linkShopee || '';
  const mlUrl   = it.linkML    || '';
  const spPrice = it.pm || 20;
  const mlp     = mlPrice(it);
  const azp     = azPrice(it);
  const pd      = pdose(it);

  const markets = [
    { cls:'mc-sp', url: spUrl, ico: '🛍️', name: 'Shopee',      price: spPrice, cta: 'Comprar no Shopee'      },
    { cls:'mc-ml', url: mlUrl, ico: '🛒', name: 'Merc. Livre',  price: mlp,    cta: 'Comprar no Merc. Livre'  },
    { cls:'mc-az', url: azUrl, ico: '📦', name: 'Amazon',       price: azp,    cta: 'Comprar no Amazon'       },
  ].filter(m => m.url);

  if (!markets.length) return '';

  const bestPrice = Math.min(...markets.map(m => m.price));

  const cardsHtml = markets.map(m => {
    const isBest = m.price === bestPrice;
    return `<a class="mkt-card ${m.cls}" href="${m.url}" target="_blank" rel="sponsored noopener noreferrer" onclick="event.stopPropagation()">
      ${isBest ? `<span class="mkt-best">✓ Melhor custo</span>` : ''}
      <div class="mkt-ico">${m.ico}</div>
      <div class="mkt-name">${m.name}</div>
      <div class="mkt-price"><sup>R$</sup>${m.price}</div>
      <span class="mkt-cta">${m.cta}</span>
      ${pd ? `<div class="mkt-pdose">~R$${pd}/dose</div>` : ''}
    </a>`;
  }).join('');

  return `<div class="mkt-panel">
    <div class="mkt-title">🏪 ONDE COMPRAR — <span>${it.name.toUpperCase()}</span></div>
    <div class="mkt-cards">${cardsHtml}</div>
  </div>`;
}

function itemHTML(it,idx){
  const done=S.checked[it.id],open=S.open[it.id],isX=it.pr==='extra';
  const cc=CAT[it.cat]?.cls||'cV',ico=CAT[it.cat]?.ico||'🌿';
  const pd=pdose(it);
  const badgeHTML=it.badge==='hot'?'<span class="badge badge-hot">🔥 Popular</span>':it.badge==='best'?'<span class="badge badge-best">★ Melhor C/B</span>':it.badge==='val'?'<span class="badge badge-val">💰 Econômico</span>':'';
  const activeImg=(typeof SUPP_IMGS !== 'undefined' && SUPP_IMGS[it.id])||'';
  const imgHTML=activeImg
    ? `<div class="item-img-wrap" aria-label="Imagem de ${it.name}"><img class="item-img" src="${activeImg}" alt="${it.name}" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none'"></div>`
    : `<div class="item-img-wrap item-img-placeholder" aria-hidden="true"><span style="font-size:28px">${CAT[it.cat]?.ico||'🌿'}</span></div>`;
  
  return`<div class="item${done?' done':''}${open?' open':''}" id="item-${it.id}" style="animation-delay:${idx*.022}s" role="listitem">
  <div class="itop" onclick="togItem(${it.id})" aria-expanded="${open?'true':'false'}" role="button" aria-controls="dp-${it.id}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togItem(${it.id})}">
    <div class="cbw" onclick="event.stopPropagation()">
      <input class="cb" type="checkbox" id="cb${it.id}"${done?' checked':''} onchange="chk(${it.id})" aria-label="Marcar ${it.name} como comprado">
      <label class="cbl" for="cb${it.id}" aria-hidden="true"></label>
    </div>
    ${imgHTML}
    <div class="ibody">
      <div class="irow">
        <span class="iname">${it.name}</span>
        <span class="ctag ${cc}" aria-label="Categoria: ${it.cat}">${ico} ${it.cat}</span>
        ${badgeHTML}
        ${isX?'<span class="xtag" aria-label="Item extra opcional">✨ Extra</span>':''}
      </div>
      <div class="imeta">
        ${starsHTML(it.sc)}
        <span class="mp" aria-label="Preço estimado: R$ ${it.pm}">~R$${it.pm}</span>
        ${pd&&S.cfg.showPdose?`<span class="pdose-tag" aria-label="Preço por dose: R$ ${pd}">R$${pd}/dose</span>`:''}
      </div>
      ${(it.dm||it.dn)?`<div class="dose-badge-row" aria-label="Dosagem recomendada">
        ${it.dm?`<span class="dose-badge" title="Dose manhã${it.dp?' / pré-treino':''}"><span class="dose-ico">${it.dp?'⚡':'🌅'}</span>${it.dm}</span>`:''}
        ${it.dn&&it.dn!==it.dm?`<span class="dose-badge" title="Dose noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>`:''}
        ${it.dn&&it.dn===it.dm?`<span class="dose-badge" title="Dose: manhã e noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>`:''}
      </div>`:''}
    </div>
    <div class="iright">
      <button class="wl-btn${S.wishlist[it.id]?' on':''}" onclick="event.stopPropagation();togWl(${it.id})" title="${S.wishlist[it.id]?'Remover dos favoritos':'Adicionar aos favoritos'}" aria-label="${S.wishlist[it.id]?'Remover '+it.name+' dos favoritos':'Adicionar '+it.name+' aos favoritos'}" aria-pressed="${S.wishlist[it.id]?'true':'false'}">${S.wishlist[it.id]?'❤️':'🤍'}</button>
      <span class="eico" aria-hidden="true">▼</span>
    </div>
  </div>
  <div class="dpanel" id="dp-${it.id}" role="region" aria-label="Detalhes de ${it.name}">
    <div class="dbox">
      ${renderBuySection(it,idx)}

      <div class="dtitle">${it.name}</div>
      <div class="dtext">${it.desc}</div>
      <div class="dtags" aria-label="Tags">${(it.tags||[]).map(t=>`<span class="dtag">${t}</span>`).join('')}</div>
      ${it.dose?`<div class="ddose" role="note">💊 ${it.dose}</div>`:''}
      ${it.warn?`<div class="dwarn" role="alert">⚠️ ${it.warn}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn" style="height:32px;font-size:11px;background:var(--rosedim);color:var(--rose);border-color:rgba(244,114,182,.25)" onclick="event.stopPropagation();addToStack(${it.id})" aria-label="Adicionar ${it.name} à stack">💪 Adicionar à stack</button>
        <button class="ref-btn" onclick="event.stopPropagation();openRef(${it.id})" aria-label="Ver referências científicas para ${it.name}">🔬 Estudos Científicos</button>
      </div>
      <div class="note-row">
        <textarea class="note-ta" id="note-${it.id}" placeholder="Nota: marca, preço pago, lote…" rows="2" aria-label="Nota pessoal sobre ${it.name}" onblur="saveNote(${it.id})"></textarea>
        <button class="note-btn" onclick="saveNote(${it.id})" aria-label="Salvar nota para ${it.name}">💾</button>
      </div>
    </div>
  </div>
</div>`;
}

function renderList(){
  const list=filtered(),srt=document.getElementById('sort')?.value||'priority';
  const fc=document.getElementById('filter-count');
  if(fc){
    const q=(document.getElementById('search')?.value||'').trim();
    const gf=document.getElementById('f-goal')?.value||'';
    const pf=document.getElementById('f-price')?.value||'';
    const isFiltered=q||gf||pf||S.cat!=='Todos';
    fc.textContent=list.length+' resultado'+(list.length!==1?'s':'');
    fc.classList.toggle('has-filter',!!isFiltered);
    fc.style.display=list.length>0||isFiltered?'':'none';
  }
  if(!list.length){
    const q=(document.getElementById('search')?.value||'').trim();
    const title = q ? 'Nenhum resultado' : 'Lista vazia';
    const sub = q 
      ? `Nenhum suplemento corresponde a "<strong style="color:var(--tx)">${q}</strong>"`
      : 'Parece que nenhum item atende aos filtros atuais.';
    const btnLabel = q ? 'Limpar busca' : 'Ver todos';
    const btnFn = q ? 'clearSearch()' : "setCat('Todos')";
    
    document.getElementById('list').innerHTML = emptyStateHTML('🌿', title, sub, btnLabel, btnFn);
    return;
  }
  let html='',idx=0;
  if(srt==='priority'){
    const g={};list.forEach(i=>{if(!g[i.pr])g[i.pr]=[];g[i.pr].push(i);});
    ['alta','media','baixa','extra'].forEach(p=>{
      if(!g[p]?.length) return;
      html+=`<div class="sec ${PCLS[p]}"><span class="sdot"></span>${PLBL[p]} (${g[p].length})</div>`;
      g[p].forEach(it=>{html+=itemHTML(it,idx++);});
    });
  } else {list.forEach(it=>{html+=itemHTML(it,idx++);});}
  document.getElementById('list').innerHTML=html;
  list.forEach(it => {
    const ta = document.getElementById(`note-${it.id}`);
    if(ta) ta.value = S.notes[it.id] || '';
  });
}

function renderChips(){
  const el=document.getElementById('chips');if(!el) return;
  el.innerHTML=allCats().map(c=>{
    const n=c==='Todos'?MAIN.length:MAIN.filter(i=>i.cat===c).length;
    const ico=c==='Todos'?'🌐':CAT[c]?.ico||'';
    return`<button class="chip${S.cat===c?' on':''}" onclick="setCat('${c}')">${ico} ${c} <span class="cn">${n}</span></button>`;
  }).join('');
}

function renderStats(){
  const total=IT.length,done=doneCnt(),pct=Math.round((done/total)*100);
  const urg=IT.filter(i=>i.pr==='alta'&&!S.checked[i.id]).length;
  ['s-tot','s-pend','s-done','s-urg'].forEach((id,i)=>{
    const el=document.getElementById(id);if(el)el.textContent=[total,total-done,done,urg][i];
  });
  
  // Trata o progresso zerado no widget da Landing Page
  const pctText = document.getElementById('pct');
  if(pctText) {
    pctText.textContent = pct === 0 ? '0% iniciado' : pct + '%';
    pctText.style.color = pct === 0 ? 'var(--tx3)' : 'var(--accent)';
  }

  const hsTotal=document.getElementById('hs-total');if(hsTotal)hsTotal.textContent=total;
  const hsCats=document.getElementById('hs-cats');if(hsCats)hsCats.textContent=allCats().length-1;
  const cfgTotal=document.getElementById('cfg-total-supps');if(cfgTotal)cfgTotal.textContent=total;
  const pf=document.getElementById('pf');if(pf)pf.style.width=pct+'%';
  const pc=document.getElementById('pct');if(pc)pc.textContent=pct+'%';
  const nbLista=document.getElementById('nb-lista'); if(nbLista) nbLista.textContent=total-done;
  const wlC=Object.values(S.wishlist).filter(Boolean).length;
  const nbWl=document.getElementById('nb-wl');if(nbWl)nbWl.textContent=wlC;
  const stC=Object.keys(S.stack).length;
  const nbSt=document.getElementById('nb-stack');if(nbSt)nbSt.textContent=stC;
  if(pct===100&&done>0&&S.cfg.confetti&&!_confDone){_confDone=true;confetti();}
  
  if(typeof syncBnBadges==='function')syncBnBadges();
}

/**
 * Gera o HTML padronizado para estados vazios (Empty States)
 */
function emptyStateHTML(ico, title, sub, btnLabel, btnFn) {
  return `<div class="empty">
    <div class="empty-ico">${ico}</div>
    <div class="empty-title">${title}</div>
    <p class="empty-sub">${sub}</p>
    ${btnLabel ? `<button class="empty-action" onclick="${btnFn}">${btnLabel}</button>` : ''}
  </div>`;
}

function renderToggs(){
  ['tsw','tesw'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.className='tog'+([S.showDone,S.showExtra][i]?' on':'');});
}

function renderAll(){renderStats();renderChips();renderList();renderToggs();}


// ══════════════ AÇÕES DE ITEMS ══════════════
function togItem(id){
  S.open[id]=!S.open[id];
  const itemEl=document.getElementById('item-'+id);
  if(!itemEl){renderList();return;}
  const panel=document.getElementById('dp-'+id);
  const eico=itemEl.querySelector('.eico');
  const itop=itemEl.querySelector('.itop');
  if(S.open[id]){
    itemEl.classList.add('open');
    if(panel)panel.style.display='block';
    if(eico){eico.style.transform='rotate(180deg)';eico.style.color='var(--accent)';}
    if(itop)itop.setAttribute('aria-expanded','true');
  } else {
    itemEl.classList.remove('open');
    if(panel)panel.style.display='none';
    if(eico){eico.style.transform='';eico.style.color='';}
    if(itop)itop.setAttribute('aria-expanded','false');
  }
}

function chk(id){
  if(S.cfg.confirmUncheck&&S.checked[id]){
    confirmModal({
      title:'Desmarcar item',
      msg:`Remover <strong>${IT.find(i=>i.id===id)?.name||'este item'}</strong> da lista de comprados?`,
      ico:'↩',
      okLabel:'Desmarcar',
      cancelLabel:'Manter',
      danger:false,
      okColor:'var(--amber)',
    }).then(ok=>{
      if(!ok) return;
      S.checked[id]=false;save();renderAll();
      toast('↩','Desmarcado','warn',{duration:2800});
    });
    return;
  }
  S.checked[id]=!S.checked[id];save();renderAll();
  if(S.checked[id]){
    const name=IT.find(i=>i.id===id)?.name||'Item';
    toast('✔',`${name} marcado como comprado!`,'success',{
      duration:3600,
      undo:()=>{S.checked[id]=false;save();renderAll();}
    });
    const el=document.getElementById('item-'+id);
    if(el){el.classList.add('just-checked');setTimeout(()=>el.classList.remove('just-checked'),600);}
  }
}

function saveNote(id){
  const el=document.getElementById('note-'+id);
  if(el){S.notes[id]=el.value;save();toast('💾','Nota salva','success',{duration:2200,progress:false});}
}

function setCat(c){S.cat=c;renderList();renderChips();}

function setGoal(g){
  S.goalFilter=g==='all'?'':g;
  document.querySelectorAll('.hcat').forEach(el=>el.classList.remove('on'));
  document.getElementById('hcat-'+g)?.classList.add('on');
  const sel=document.getElementById('f-goal');if(sel)sel.value=S.goalFilter;
  renderList();
}

function toggleDone(){S.showDone=!S.showDone;save();renderAll();}
function toggleExtra(){S.showExtra=!S.showExtra;save();renderAll();}

function checkAll(){
  const prev={...S.checked};
  IT.forEach(i=>S.checked[i.id]=true);save();renderAll();
  toast('✔','Todos marcados como comprados!','success',{
    duration:4000,
    undo:()=>{S.checked=prev;save();renderAll();}
  });
}

function uncheckAll(){
  const prev={...S.checked};
  S.checked={};_confDone=false;save();renderAll();
  toast('↺','Lista limpa','info',{
    duration:4000,
    undo:()=>{S.checked=prev;save();renderAll();}
  });
}

function resetAll(){
  confirmModal({
    title:'Resetar checklist',
    msg:'Desmarcar todos os itens comprados e zerar o progresso?',
    ico:'🔄',
    okLabel:'Resetar',
    cancelLabel:'Cancelar',
    danger:false,
    okColor:'var(--amber)',
  }).then(ok=>{
    if(!ok) return;
    const prev={...S.checked};
    S.checked={};_confDone=false;save();renderAll();
    toast('🔄','Checklist resetado','warn',{
      duration:4000,
      undo:()=>{S.checked=prev;save();renderAll();}
    });
  });
}

function openAll(){
  const pend=IT.filter(i=>!S.checked[i.id]&&i.pr!=='extra');
  if(!pend.length){toast('✔','Todos os itens já foram comprados!','success',{duration:2800});return;}
  pend.forEach((it,i)=>setTimeout(()=>window.open(utm(it.linkShopee||it.shopee,'shopee','affiliate','suplilist',i+1),'_blank'),i*S.cfg.delay));
  toast('↗',`Abrindo ${pend.length} links…`,'info',{duration:3000});
}

/**
 * Faz um fetch acompanhando o progresso do download.
 */
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

  const contentLength = response.headers.get('content-length');
  if (!contentLength || !response.body) return response.json();

  const total = parseInt(contentLength, 10);
  let loaded = 0;
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress) onProgress(Math.round((loaded / total) * 100));
  }

  const allChunks = new Uint8Array(loaded);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8").decode(allChunks));
}

/**
 * Executa uma tarefa assíncrona com estados explícitos de Loading e Error.
 * @param {string} containerId - ID do elemento onde o erro/loading será exibido.
 * @param {string} taskName - Nome amigável da operação.
 * @param {Function} taskFn - Função que retorna uma Promise (o fetch).
 * @param {Function} renderFn - Função de renderização para o estado de sucesso (Data).
 */
async function runAsync(containerId, taskName, taskFn, renderFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Estado: LOADING
  const originalHTML = container.innerHTML;
  container.innerHTML = `
    <div class="empty" style="padding:60px; opacity:0.8;">
      <div class="sync-dot syncing" style="width:32px; height:32px; margin-bottom:20px;"></div>
      <div class="empty-title">Carregando ${taskName}…</div>
      <p class="empty-sub" id="${containerId}-prog-lbl">Iniciando download...</p>
      <div class="prog-track" style="width:240px; margin: 16px auto; height: 6px; display:none;" id="${containerId}-prog-track">
         <div class="prog-fill" id="${containerId}-prog-bar" style="width:0%"></div>
      </div>
    </div>
  `;

  const onProgress = (pct) => {
    const bar = document.getElementById(`${containerId}-prog-bar`);
    const track = document.getElementById(`${containerId}-prog-track`);
    const lbl = document.getElementById(`${containerId}-prog-lbl`);
    if (track) track.style.display = 'block';
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = `Baixando ${taskName}: ${pct}%`;
  };

  try {
    // 2. Estado: DATA (Sucesso)
    const result = await taskFn(onProgress);
    if (renderFn) {
      renderFn(result);
    } else {
      container.innerHTML = originalHTML; // Fallback para o estado anterior
    }
    return result;
  } catch (error) {
    // 3. Estado: ERROR
    console.error(`🚨 [API Error] ${taskName}:`, error);
    
    container.innerHTML = `
      <div class="empty" style="padding:40px; border:1px dashed var(--red); background:var(--redd); border-radius:16px;">
        <div class="empty-ico" style="color:var(--red); filter:none;">⚠️</div>
        <div class="empty-title">Falha ao carregar ${taskName}</div>
        <p class="empty-sub">${error.message || 'Verifique sua conexão e tente novamente.'}</p>
        <button class="btn bg" onclick="runAsync('${containerId}', '${taskName}', ${taskFn.name}, ${renderFn ? renderFn.name : 'null'})" style="margin-top:16px">
          Tentar novamente
        </button>
      </div>
    `;
    
    toast('❌', `Erro ao atualizar ${taskName}`, 'error');
    throw error;
  }
}

/**
 * Exemplo prático: Atualização de preços com o novo padrão.
 */
async function refreshPrices() {
  const updateTask = async (onProgress) => {
    // Simulando o fetch de um JSON grande de preços
    const data = await fetchWithProgress('https://api.exemplo.com/prices.json', onProgress);
    return data;
  };

  const finalizeUI = () => {
    const ageEl = document.getElementById('cache-age');
    if (ageEl) ageEl.textContent = '0 min';
    const fresh = document.querySelector('.price-fresh');
    if (fresh) {
      fresh.className = 'price-fresh live';
      fresh.innerHTML = '<span class="dot"></span> Cache ativo';
    }
    renderList(); // Recarrega a lista para mostrar os preços "frescos"
    toast('✅', 'Preços atualizados com sucesso!', 'success');
  };

  await runAsync('list', 'Preços', updateTask, finalizeUI);
}


// ══════════════ MODAL DE REFERÊNCIAS (STUDIES) ══════════════
let _currentRefTab='resumo';

function switchStudyTab(tab){
  _currentRefTab=tab;
  document.querySelectorAll('.stab').forEach(el=>{
    el.classList.toggle('on', el.textContent.toLowerCase().includes(tab==='resumo'?'resu':tab==='estudos'?'studo':tab==='mecanismo'?'meca':'segur'));
  });
  document.querySelectorAll('.stab-panel').forEach(el=>el.classList.remove('on'));
  const p=document.getElementById('stab-'+tab);if(p)p.classList.add('on');
}

function openRef(id){
  const it=IT.find(i=>i.id===id);if(!it) return;
  document.getElementById('ref-modal-name').textContent=it.name;
  document.getElementById('ref-modal-cat').textContent=it.cat+' · '+it.tags.slice(0,3).join(' · ');
  const sd=(typeof STUDIES !== 'undefined' && STUDIES[id]) ? STUDIES[id] : null;
  const pubmedQ=encodeURIComponent(it.name+' supplement');
  let html='';
  
  if(sd){
    const evDots=[...Array(5)].map((_,i)=>`<div class="ev-dot${i<sd.ev?' on':''}"></div>`).join('');
    // RESUMO
    html+=`<div class="stab-panel on" id="stab-resumo">
      <div class="ev-bar"><span class="ev-label">Nível de Evidência</span><div class="ev-dots">${evDots}</div><span class="ev-score">${sd.ev}/5</span></div>
      <div class="ref-entry"><div class="ref-detail" style="font-size:14px;color:var(--tx)">${sd.resumo}</div></div>
      <div class="ref-entry"><div class="ref-source"><span class="ref-source-badge">💊 Dosagem Oficial</span></div>
        <div class="ref-title" style="margin-top:8px">${it.dose}</div>
        ${it.warn?`<div style="margin-top:8px;font-size:13px;color:var(--amber);background:var(--ambd);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 12px;line-height:1.6">⚠️ ${it.warn}</div>`:''}
      </div>
    </div>`;
    // ESTUDOS
    html+=`<div class="stab-panel" id="stab-estudos">`;
    sd.estudos.forEach(e=>{
      html+=`<div class="ref-entry">
        <div class="ref-entry-header">
          <span class="ref-source"><span class="ref-source-badge">${e.tipo}</span></span>
          <span class="ref-year-badge">${e.ano}</span>
          <span class="ref-journal">${e.journal}</span>
        </div>
        <div class="ref-title">${e.titulo}</div>
        <div class="ref-finding">📊 ${e.achado}</div>
        <div class="ref-detail">${e.detalhe}</div>
        ${e.pmid?`<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/${e.pmid}" target="_blank" rel="noopener noreferrer">🔬 PubMed ${e.pmid} ↗</a>`:`<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver no PubMed ↗</a>`}
      </div>`;
    });
    html+=`<a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔍 Ver todos os estudos no PubMed ↗</a>`;
    html+=`</div>`;
    // MECANISMO
    html+=`<div class="stab-panel" id="stab-mecanismo"><div class="mech-grid">`;
    sd.mecanismo.forEach(m=>{
      html+=`<div class="mech-card"><div class="mech-icon">${m.ico}</div><div class="mech-label">${m.label}</div><div class="mech-val">${m.val}</div></div>`;
    });
    html+=`</div></div>`;
    // SEGURANÇA
    html+=`<div class="stab-panel" id="stab-seguranca"><div class="safety-grid">`;
    sd.seguranca.forEach(s=>{
      html+=`<div class="safety-item ${s.tipo}"><div class="safety-ico">${s.tipo==='ok'?'✅':s.tipo==='warn'?'⚠️':'🚫'}</div><div><div class="safety-label">${s.label}</div><div class="safety-text">${s.texto}</div></div></div>`;
    });
    html+=`</div></div>`;
  } else {
    html=`<div class="stab-panel on" id="stab-resumo"><div class="ref-entry"><div class="ref-detail">${it.desc||'Dados científicos detalhados em breve.'}</div></div><a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver estudos no PubMed ↗</a></div>
    <div class="stab-panel" id="stab-estudos"><div class="ref-entry"><div class="ref-detail">Banco de estudos em expansão. Clique no link abaixo para ver pesquisas publicadas.</div><a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 PubMed ↗</a></div></div>
    <div class="stab-panel" id="stab-mecanismo"><div class="ref-entry"><div class="ref-detail">Informações de mecanismo em breve.</div></div></div>
    <div class="stab-panel" id="stab-seguranca"><div class="safety-item ok"><div class="safety-ico">✅</div><div><div class="safety-label">Uso responsável</div><div class="safety-text">${it.warn||'Consulte um profissional de saúde antes de iniciar qualquer suplementação.'}</div></div></div></div>`;
  }
  
  document.getElementById('ref-modal-body').innerHTML=html;
  _currentRefTab='resumo';
  document.querySelectorAll('.stab').forEach((el,i)=>el.classList.toggle('on',i===0));
  document.getElementById('ref-overlay').classList.add('on');
  document.getElementById('ref-overlay').setAttribute('aria-hidden','false');
}

function closeRef(){
  document.getElementById('ref-overlay').classList.remove('on');
  document.getElementById('ref-overlay').setAttribute('aria-hidden','true');
}


// ══════════════ STICKY BAR ══════════════
function showSticky(id){
  const it=IT.find(i=>i.id===id);if(!it) return;
  _stickyItem=it;
  const best = getBestDeal(it);
  document.getElementById('sb-name').textContent=it.name;
  document.getElementById('sb-price').textContent=`~R$${best.price} · Melhor: ${best.name}`;
  document.getElementById('sb-btn').onclick=()=>window.open(utm(best.url,best.src,'sticky','suplilist',0),'_blank');
  document.getElementById('sticky-bar').classList.add('show');
}

function closeSticky(){document.getElementById('sticky-bar').classList.remove('show');_stickyItem=null;}


// ══════════════ WISHLIST ══════════════
function togWl(id){
  S.wishlist[id]=!S.wishlist[id];save();renderAll();
  const name=IT.find(i=>i.id===id)?.name||'Item';
  if(S.wishlist[id]){
    toast('❤️',`${name} adicionado aos favoritos`,'success',{duration:2400,undo:()=>{S.wishlist[id]=false;save();renderAll();}});
  } else {
    toast('🤍',`${name} removido dos favoritos`,'info',{duration:2200,undo:()=>{S.wishlist[id]=true;save();renderAll();}});
  }
}

function renderWishlist(){
  const el=document.getElementById('wl-list');if(!el) return;
  const items=IT.filter(i=>S.wishlist[i.id]);
  if(!items.length){
    el.innerHTML = emptyStateHTML('🤍', 'Favoritos vazios', 'Sua lista de desejos está limpa. Adicione itens clicando no coração dos suplementos.', 'Explorar lista', "go('lista')");
    return;
  }
  let html='';items.forEach((it,i)=>{html+=itemHTML(it,i);});
  el.innerHTML=html;
}

function clearWl(){
  confirmModal({
    title:'Limpar favoritos',
    msg:'Remover todos os itens dos favoritos?',
    ico:'🤍',
    okLabel:'Limpar',
    cancelLabel:'Cancelar',
    danger:false,
    okColor:'var(--amber)',
  }).then(ok=>{
    if(!ok) return;
    const prev={...S.wishlist};
    S.wishlist={};save();renderWishlist();renderStats();
    toast('🤍','Favoritos limpos','warn',{duration:3600,undo:()=>{S.wishlist=prev;save();renderWishlist();renderStats();}});
  });
}

function buyAllWl(){
  const items=IT.filter(i=>S.wishlist[i.id]);
  if(!items.length){toast('🤍','Nenhum favorito para marcar','info',{duration:2200});return;}
  items.forEach(i=>S.checked[i.id]=true);
  save();renderAll();renderWishlist();
  toast('✔',`${items.length} favorito${items.length!==1?'s':''} marcado${items.length!==1?'s':''} como comprado${items.length!==1?'s':''}!`,'success',{duration:3000});
}


// ══════════════ MY STACK E CICLOS ══════════════
function initStackSel(){
  const el=document.getElementById('stack-sel');if(!el) return;
  el.innerHTML=IT.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
}

function addStack(){
  const sel=document.getElementById('stack-sel'),qty=document.getElementById('stack-qty');
  if(!sel||!qty) return;
  const id=parseInt(sel.value),q=parseFloat(qty.value)||100;
  const it=IT.find(i=>i.id===id);if(!it) return;
  S.stack[id]={id,name:it.name,qty:q,started:new Date().toISOString()};
  save();renderStack();renderStats();
  toast('💪',`${it.name} adicionado à stack`,'success',{duration:2800});
  qty.value='';
}

function addToStack(id){
  const it=IT.find(i=>i.id===id);if(!it) return;
  S.stack[id]={id,name:it.name,qty:100,started:new Date().toISOString()};
  save();renderStats();
  toast('💪',`${it.name} adicionado à stack`,'success',{duration:2800});
}

function removeFromStack(id){delete S.stack[id];save();renderStack();renderStats();}

function renderStack(){
  const el=document.getElementById('stack-list');if(!el) return;
  const items=Object.values(S.stack);
  if(!items.length){
    el.innerHTML = emptyStateHTML('💪', 'Stack vazia', 'Você não está monitorando nenhum suplemento no momento.', 'Adicionar primeiro item', "document.getElementById('stack-sel').focus()");
    return;
  }

  const monthlyCost=items.reduce((sum,it)=>{
    const src=IT.find(i=>i.id===it.id);
    if(src?.pm&&src?.doses) return sum+(bestMarketplacePrice(src)/src.doses)*30;
    if(src?.pm) return sum+bestMarketplacePrice(src);
    return sum;
  },0);

  const stackNames=items.map(it=>it.name.toLowerCase());
  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  const dangerAlerts=INTERACT_DATA.filter(i=>i.type==='danger'&&stackNames.some(n=>i.title.toLowerCase().includes(n)));

  let alertsHTML='';
  if(dangerAlerts.length&&S.cfg.alertInteractions){
    alertsHTML=`<div style="background:var(--redd);border:1px solid rgba(255,68,85,.3);border-radius:10px;padding:12px 15px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">🚫 Alerta de Interação no Seu Stack</div>
      ${dangerAlerts.map(a=>`<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">• ${a.title}</div>`).join('')}
    </div>`;
  }

  const costHTML=`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;font-size:12px">
    <span style="color:var(--tx3)">💰 Custo mensal estimado do stack</span>
    <strong style="font-family:var(--fm);color:var(--accent)">~R$${monthlyCost.toFixed(0)}</strong>
  </div>`;

  el.innerHTML=alertsHTML+costHTML+`<div class="stack-grid">${items.map(it=>{
    const src=IT.find(i=>i.id===it.id);
    const started=new Date(it.started),now=new Date(),days=Math.floor((now-started)/86400000);
    const dpd=src?.dm?parseFloat(src.dm)||2:2;
    const total=it.qty,rem=Math.max(0,total-days*dpd),pct=Math.round((rem/total)*100);
    const daysLeft=Math.round(rem/dpd);
    return`<div class="stack-item">
      <button class="stack-del" onclick="removeFromStack(${it.id})">✕</button>
      <div class="stack-name">${it.name}</div>
      <div class="stack-meta">~${daysLeft} dias restantes · ${rem.toFixed(0)}g</div>
      <div class="stack-bar"><div class="stack-fill" style="width:${pct}%;background:${pct<20?'var(--red)':pct<40?'var(--amber)':'var(--accent)'}"></div></div>
      ${daysLeft<=7?'<div style="font-size:9px;color:var(--red);margin-top:4px">⚠️ Recompra necessária!</div>':''}
    </div>`;
  }).join('')}</div>`;
}

function renderCycles(){
  const el=document.getElementById('cyc-grid');
  const sumEl=document.getElementById('cyc-summary');
  if(!el) return;

  const customCycles=S._customCycles||[];
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const allCycles=[...CYCLES_DATA,...customCycles];

  let nActive=0,nWarn=0,nPause=0,nIdle=0;
  allCycles.forEach(c=>{
    const st=cycStatus(c);
    if(st.state==='active') nActive++;
    else if(st.state==='warn') {nActive++;nWarn++;}
    else if(st.state==='over') nWarn++;
    else if(st.state==='pause') nPause++;
    else nIdle++;
  });
  
  if(sumEl){
    sumEl.innerHTML=`
      <div class="cyc-sum-card active"><div class="cyc-sum-n">${nActive}</div><div class="cyc-sum-l">Em uso</div></div>
      <div class="cyc-sum-card warn"><div class="cyc-sum-n">${nWarn}</div><div class="cyc-sum-l">Pausar em breve</div></div>
      <div class="cyc-sum-card pause"><div class="cyc-sum-n">${nPause}</div><div class="cyc-sum-l">Em pausa</div></div>
      <div class="cyc-sum-card"><div class="cyc-sum-n">${nIdle}</div><div class="cyc-sum-l">Não iniciados</div></div>
    `;
  }

  if(!allCycles.length){
    el.innerHTML=`<div class="cyc-empty"><div class="cyc-empty-ico">⏱</div><div class="cyc-empty-title">Nenhum ciclo cadastrado</div><div class="cyc-empty-sub">Adicione um ciclo personalizado abaixo para começar.</div></div>`;
    return;
  }
  el.innerHTML=allCycles.map((c,idx)=>cycCardHTML(c,idx)).join('');
  allCycles.forEach((c,idx) => {
    const ta = document.getElementById(`cyc-note-${idx}`);
    if(ta) ta.value = S.cycleNote[c.name] || '';
  });
}

function cycStatus(c){
  const start=S.cycleStart[c.name];
  const pauseStart=S.cyclePause[c.name];
  if(pauseStart){
    const pD=new Date(pauseStart),now=new Date();
    const pauseDay=Math.floor((now-pD)/86400000);
    const remPause=Math.max(0,(c.pausa||30)-pauseDay);
    return{state:'pause',pauseDay,remPause,diff:0,pct:0,rem:0};
  }
  if(!start) return{state:'idle',diff:0,pct:0,rem:0};
  const startD=new Date(start),now=new Date();
  const diff=Math.max(0,Math.floor((now-startD)/86400000));
  const pct=Math.min(100,Math.round((diff/c.max)*100));
  const rem=Math.max(0,c.max-diff);
  if(diff>=c.max) return{state:'over',diff,pct,rem:0,startD};
  if(rem<=14) return{state:'warn',diff,pct,rem,startD};
  return{state:'active',diff,pct,rem,startD};
}

function cycCardHTML(c,idx){
  const st=cycStatus(c);
  const cor=c.cor||'var(--accent)';
  const note=S.cycleNote[c.name]||'';
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const isCustom=!CYCLES_DATA.find(x=>x.name===c.name);

  let barBg,badgeClass,badgeLabel,badgeDot=true;
  if(st.state==='active'){barBg=cor;badgeClass='st-active';badgeLabel='● Em uso';}
  else if(st.state==='warn'){barBg='var(--amber)';badgeClass='st-warn';badgeLabel='⚠ Pausar em breve';}
  else if(st.state==='over'){barBg='var(--red)';badgeClass='st-over';badgeLabel='⏸ Pausa necessária';}
  else if(st.state==='pause'){barBg='var(--blue)';badgeClass='st-pause';badgeLabel='☁ Em pausa';}
  else{barBg='var(--bg5)';badgeClass='st-idle';badgeLabel='○ Não iniciado';badgeDot=false;}

  const cardClass=`cyc-card${st.state==='active'?' cyc-active':st.state==='warn'?' cyc-warning':st.state==='over'?' cyc-overdue':st.state==='pause'?' cyc-paused':' cyc-idle'}`;

  let fillBg;
  if(st.state==='over') fillBg='var(--red)';
  else if(st.state==='warn') fillBg=`linear-gradient(90deg,${cor},var(--amber))`;
  else if(st.state==='active') fillBg=`linear-gradient(90deg,${cor},${cor}cc)`;
  else if(st.state==='pause') fillBg='var(--blue)';
  else fillBg='var(--bg5)';

  let fillPct=st.pct;
  if(st.state==='pause'){
    fillPct=Math.min(100,Math.round((st.pauseDay/(c.pausa||30))*100));
  }

  const startStr=st.startD?st.startD.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'—';
  const endDate=st.startD?new Date(st.startD.getTime()+c.max*86400000):null;
  const endStr=endDate?endDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'—';

  const progLabel=st.state==='idle'?'Não iniciado':
    st.state==='pause'?`Pausa: dia ${st.pauseDay}/${c.pausa||30}`:
    `Dia ${st.diff} de ${c.max}`;

  const pctColor=st.state==='over'?'var(--red)':st.state==='warn'?'var(--amber)':'var(--accent)';

  let actionsBtns='';
  if(st.state==='idle'){
    actionsBtns=`<button class="cyc-btn cyc-btn-start" onclick="startCyc('${c.name}')">▶ Iniciar ciclo</button>`;
  } else if(st.state==='pause'){
    const remStr=st.remPause>0?`${st.remPause}d restantes`:'Pausa concluída!';
    actionsBtns=`
      <button class="cyc-btn cyc-btn-start" onclick="resumeCyc('${c.name}')">▶ Retomar</button>
      <button class="cyc-btn cyc-btn-stop" onclick="stopCyc('${c.name}')">✕ Encerrar</button>
    `;
  } else {
    actionsBtns=`
      <button class="cyc-btn cyc-btn-reset" onclick="resetCyc('${c.name}')">↺ Reiniciar</button>
      <button class="cyc-btn cyc-btn-pause" onclick="pauseCyc('${c.name}')">⏸ Pausar agora</button>
      <button class="cyc-btn cyc-btn-stop" onclick="stopCyc('${c.name}')">✕ Encerrar</button>
    `;
  }
  if(isCustom) actionsBtns+=`<button class="cyc-btn" onclick="removeCustomCyc('${c.name}')" title="Remover ciclo">🗑</button>`;

  const hasMeta=!!(c.motivo||c.dica||c.refs);
  const metaHTML=hasMeta?`
    <button class="cyc-expand-btn" id="cyc-exp-${idx}" onclick="toggleCycDetail('${idx}')">
      <span>Ver detalhes científicos</span>
      <span class="cyc-expand-ico">▼</span>
    </button>
    ${c.motivo?`<div class="cyc-motivo" id="cyc-motivo-${idx}"><strong>Por que ciclar?</strong>${c.motivo}</div>`:''}
    ${c.dica?`<div class="cyc-dica" id="cyc-dica-${idx}"><span class="cyc-dica-ico">💡</span><span>${c.dica}</span></div>`:''}
    ${c.refs?`<div class="cyc-ref" id="cyc-ref-${idx}">📚 ${c.refs}</div>`:''}
  `:'';

  const pauseBar=st.state==='over'?`
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">⏸</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--red)">Pausa necessária!</strong><span style="font-size:10px">Pausar por ${c.pausa||30} dias antes de reiniciar.</span></div>
      <div class="cyc-pause-bar-days">${c.pausa||30}d</div>
    </div>
  `:st.state==='pause'?`
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">🔄</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--blue)">Em pausa — ${st.remPause>0?`${st.remPause} dias restantes`:'✅ Pode retomar!'}</strong><span style="font-size:10px">Pausa de ${c.pausa||30} dias · Dia ${st.pauseDay}/${c.pausa||30}</span></div>
    </div>
  `:'';

  return`<div class="${cardClass}" id="cyc-card-${idx}" style="animation:pageIn .3s ease ${idx*.06}s both">
  <div class="cyc-status-bar" style="background:${barBg}"></div>
  <div class="cyc-card-head">
    <div class="cyc-ico">${c.ico||'⏱'}</div>
    <div class="cyc-meta">
      <div class="cyc-name" title="${c.name}">${c.name}</div>
      <div class="cyc-cat">
        <div class="cyc-cat-dot" style="background:${cor}"></div>
        ${c.cat||'Suplemento'}
      </div>
    </div>
    <div class="cyc-badge ${badgeClass}">${badgeDot?'<div class="cyc-badge-dot"></div>':''}${badgeLabel.replace(/[●⚠⏸☁○]/,'').trim()}</div>
  </div>
  <div class="cyc-card-body">
    ${pauseBar}
    <div class="cyc-prog-wrap">
      <div class="cyc-prog-labels">
        <span>${progLabel}</span>
        <span class="cyc-prog-pct" style="color:${pctColor}">${st.state==='idle'?'—':fillPct+'%'}</span>
      </div>
      <div class="cyc-track">
        <div class="cyc-fill${st.state==='idle'?' cyc-shimmer-off':''}" style="width:${fillPct}%;background:${fillBg}"></div>
      </div>
    </div>
    ${st.state!=='idle'&&st.state!=='pause'?`
    <div class="cyc-info-rows">
      <div class="cyc-info-row"><span class="cyc-info-ico">📅</span><span>Início</span><span class="cyc-info-val">${startStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">🏁</span><span>Término previsto</span><span class="cyc-info-val">${endStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">⏸</span><span>Pausa programada</span><span class="cyc-info-val">${c.pausa||30} dias</span></div>
      ${st.rem>0?`<div class="cyc-info-row"><span class="cyc-info-ico">⏳</span><span>Dias restantes</span><span class="cyc-info-val" style="color:${st.rem<=14?'var(--amber)':'var(--tx)'}">${st.rem}d</span></div>`:''}
    </div>`:''}
    ${metaHTML}
  </div>
  <div class="cyc-note-row">
    <textarea class="cyc-note" id="cyc-note-${idx}" rows="2" placeholder="Nota: marca, efeitos, observações…" onblur="saveCycNote('${c.name}',this.value)" aria-label="Nota do ciclo ${c.name}"></textarea>
  </div>
  <div class="cyc-actions">${actionsBtns}</div>
</div>`;
}

function toggleCycDetail(idx){
  const btn=document.getElementById(`cyc-exp-${idx}`);
  const els=['cyc-motivo','cyc-dica','cyc-ref'].map(id=>document.getElementById(`${id}-${idx}`)).filter(Boolean);
  const isOpen=btn?.classList.contains('open');
  if(btn) btn.classList.toggle('open',!isOpen);
  els.forEach(el=>el.classList.toggle('expanded',!isOpen));
}

function startCyc(n){
  S.cycleStart[n]=new Date().toISOString();
  delete S.cyclePause[n];
  save();renderCycles();
  toast('▶',`Ciclo de ${n} iniciado`,'success',{duration:3000});
}

function pauseCyc(n){
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const c=CYCLES_DATA.find(c=>c.name===n)||{pausa:30};
  S.cyclePause[n]=new Date().toISOString();
  delete S.cycleStart[n];
  save();renderCycles();
  toast('⏸',`Ciclo pausado — ${c.pausa}d de descanso`,'info',{duration:3200});
}

function resumeCyc(n){
  S.cycleStart[n]=new Date().toISOString();
  delete S.cyclePause[n];
  save();renderCycles();
  toast('▶',`Ciclo de ${n} retomado`,'success',{duration:2800});
}

function resetCyc(n){
  confirmModal({
    title:'Reiniciar ciclo',
    msg:`Reiniciar o ciclo de <strong>${n}</strong> a partir de hoje? O histórico de início será perdido.`,
    ico:'↺',
    okLabel:'Reiniciar',
    cancelLabel:'Cancelar',
    danger:false,
    okColor:'var(--amber)',
  }).then(ok=>{
    if(!ok) return;
    S.cycleStart[n]=new Date().toISOString();
    delete S.cyclePause[n];
    save();renderCycles();
    toast('↺',`Ciclo de ${n} reiniciado`,'warn',{duration:2800});
  });
}

function stopCyc(n){
  confirmModal({
    title:'Encerrar ciclo',
    msg:`Encerrar o ciclo de <strong>${n}</strong>? Isso remove o rastreamento de progresso.`,
    ico:'✕',
    okLabel:'Encerrar',
    cancelLabel:'Cancelar',
    danger:true,
  }).then(ok=>{
    if(!ok) return;
    delete S.cycleStart[n];
    delete S.cyclePause[n];
    save();renderCycles();
    toast('✕',`Ciclo de ${n} encerrado`,'error',{duration:2600});
  });
}

function saveCycNote(n,v){
  if(!S.cycleNote)S.cycleNote={};
  S.cycleNote[n]=v.trim();
  save();
}

function addCustomCyc(){
  const nameEl=document.getElementById('cyc-custom-name');
  const maxEl=document.getElementById('cyc-custom-max');
  const pausaEl=document.getElementById('cyc-custom-pausa');
  const name=(nameEl?.value||'').trim();
  if(!name){
    toast('⚠️','Digite o nome do suplemento','warn',{duration:2400});
    nameEl?.focus();return;
  }
  if(!S._customCycles)S._customCycles=[];
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  if([...CYCLES_DATA,...S._customCycles].find(c=>c.name===name)){
    toast('⚠️','Já existe um ciclo com esse nome','warn',{duration:2600});return;
  }
  S._customCycles.push({name,ico:'🧪',max:parseInt(maxEl?.value||90),pausa:parseInt(pausaEl?.value||30),cat:'Personalizado',cor:'var(--violet)'});
  if(nameEl)nameEl.value='';
  save();renderCycles();
  toast('✅',`Ciclo de ${name} criado — ${maxEl?.value||90}d uso / ${pausaEl?.value||30}d pausa`,'success',{duration:3200});
}

function removeCustomCyc(n){
  confirmModal({
    title:'Remover ciclo',
    msg:`Remover o ciclo personalizado de <strong>${n}</strong>? O progresso será perdido.`,
    ico:'🗑',
    okLabel:'Remover',
    cancelLabel:'Cancelar',
    danger:true,
  }).then(ok=>{
    if(!ok) return;
    if(S._customCycles)S._customCycles=S._customCycles.filter(c=>c.name!==n);
    delete S.cycleStart[n];
    delete S.cyclePause[n];
    if(S.cycleNote)delete S.cycleNote[n];
    save();renderCycles();
    toast('🗑',`Ciclo de ${n} removido`,'error',{duration:2400});
  });
}


// ══════════════ RECEITAS E PROTOCOLOS ══════════════
let _recipeView='protocol'; 
let _activePreset=null;

function applyPreset(goal, btn){
  const ids=GOAL_MAP[goal]||[];
  if(_activePreset===goal){
    _activePreset=null;
    document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));
    S.rSel=[];
  } else {
    _activePreset=goal;
    document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));
    if(btn) btn.classList.add('on');
    const goalItems=IT.filter(i=>ids.includes(i.id));
    const alta=goalItems.filter(i=>i.pr==='alta').map(i=>i.id);
    const med=goalItems.filter(i=>i.pr==='media').map(i=>i.id).slice(0,4);
    S.rSel=[...new Set([...alta,...med])];
  }
  save();
  renderRecipeSel();
}

function filterRecipeSel(){
  const q=(document.getElementById('r-search')?.value||'').toLowerCase().trim();
  const cat=document.getElementById('r-cat-filter')?.value||'';
  let visible=0;
  document.querySelectorAll('#rsel-grid .rsel').forEach(el=>{
    const name=(el.dataset.name||'').toLowerCase();
    const elCat=el.dataset.cat||'';
    const show=(!q||name.includes(q))&&(!cat||elCat===cat);
    el.classList.toggle('filtered-out',!show);
    if(show) visible++;
  });
  const fc=document.getElementById('r-filtered-count');
  if(fc) fc.textContent=q||cat?`${visible} visíveis`:'';
}

function setRecipeView(v, btn){
  _recipeView=v;
  document.querySelectorAll('.rvtab').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderRecipeOut();
}

function renderRecipeSel(){
  const el=document.getElementById('rsel-grid');if(!el) return;
  el.innerHTML=IT.map(i=>{
    const picked=S.rSel.includes(i.id);
    const catCls=CAT[i.cat]?.cls||'cV';
    const catIco=CAT[i.cat]?.ico||'';
    return `<div class="rsel${picked?' pk':''}" onclick="togR(${i.id})" data-name="${i.name.toLowerCase()}" data-cat="${i.cat}">
      <div class="rcheck">${picked?'✓':''}</div>
      <div class="rsel-info">
        <div class="rsel-name" title="${i.name}">${i.name}</div>
        <div class="rsel-meta">
          <span class="rsel-cat ctag ${catCls}">${catIco} ${i.cat}</span>
          ${i.warn?'<span class="rsel-warn-dot" title="Tem aviso de segurança"></span>':''}
        </div>
      </div>
    </div>`;
  }).join('');
  
  const cnt=document.getElementById('r-count');
  if(cnt) cnt.textContent=S.rSel.length;
  filterRecipeSel();
  renderRecipeOut();
}

function togR(id){
  const idx=S.rSel.indexOf(id);
  if(idx>=0) S.rSel.splice(idx,1); else S.rSel.push(id);
  _activePreset=null;
  document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));
  save();
  renderRecipeSel();
}

function selAllR(){_activePreset=null;document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));S.rSel=IT.map(i=>i.id);save();renderRecipeSel();}
function clearR(){_activePreset=null;document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));S.rSel=[];save();renderRecipeSel();}
function selBought(){_activePreset=null;document.querySelectorAll('.rpreset').forEach(b=>b.classList.remove('on'));S.rSel=IT.filter(i=>S.checked[i.id]).map(i=>i.id);save();renderRecipeSel();toast('🛒','Usando suplementos comprados','info',{duration:2600});}

function copyRecipe(){
  const sel=IT.filter(i=>S.rSel.includes(i.id));
  if(!sel.length){toast('⚠️','Selecione ao menos um suplemento','warn',{duration:2600});return;}
  const pre=sel.filter(i=>i.dp&&i.dm);
  const ma=sel.filter(i=>i.dm&&!i.dp);
  const no=sel.filter(i=>i.dn);
  let txt='⚗️ MINHA RECEITA DE SUPLEMENTOS\n';
  txt+='═'.repeat(36)+'\n';
  if(pre.length){txt+='\n⚡ PRÉ-TREINO (30–45min antes)\n';pre.forEach(i=>{txt+=`  • ${i.name}: ${i.dm||i.dn}\n`;});}
  if(ma.length){txt+='\n🌅 MANHÃ\n';ma.filter(i=>!i.dp).forEach(i=>{txt+=`  • ${i.name}: ${i.dm}${i.dc?' (com refeição)':''}\n`;});}
  if(no.length){txt+='\n🌙 NOITE\n';no.forEach(i=>{txt+=`  • ${i.name}: ${i.dn}${i.dc?' (com refeição)':' (antes de dormir)'}\n`;});}
  txt+='\n⚠️ Consulte um profissional de saúde antes de iniciar.\n';
  navigator.clipboard?.writeText(txt).then(()=>toast('📋','Receita copiada para a área de transferência!','success',{duration:3000})).catch(()=>toast('❌','Erro ao copiar. Tente novamente.','error',{duration:3000}));
}

function exportRecipeTxt(){
  const sel=IT.filter(i=>S.rSel.includes(i.id));
  if(!sel.length){toast('⚠️','Selecione ao menos um suplemento','warn',{duration:2600});return;}
  const pre=sel.filter(i=>i.dp&&i.dm);
  const ma=sel.filter(i=>i.dm&&!i.dp);
  const no=sel.filter(i=>i.dn);
  let txt='RECEITA DE SUPLEMENTOS — SupliList Pro\n';
  txt+='Gerado em: '+new Date().toLocaleDateString('pt-BR')+'\n\n';
  if(pre.length){txt+='PRÉ-TREINO (30–45min antes)\n';pre.forEach(i=>{txt+=`  ${i.name}: ${i.dm||i.dn}\n`;});}
  if(ma.length){txt+='\nMANHÃ\n';ma.filter(i=>!i.dp).forEach(i=>{txt+=`  ${i.name}: ${i.dm}${i.dc?' (com refeição)':''}\n`;});}
  if(no.length){txt+='\nNOITE\n';no.forEach(i=>{txt+=`  ${i.name}: ${i.dn}\n`;});}
  const warn=sel.filter(i=>i.warn);
  if(warn.length){txt+='\nAVISOS\n';warn.forEach(i=>{txt+=`  ${i.name}: ${i.warn}\n`;});}
  txt+='\n⚠️ Consulte um profissional de saúde antes de iniciar qualquer suplementação.';
  const blob=new Blob([txt],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='minha-receita.txt';a.click();
  toast('⬇️','Receita baixada como .txt','success',{duration:2600});
}

function renderRecipeOut(){
  const el=document.getElementById('rout');if(!el) return;
  const tabsEl=document.getElementById('r-view-tabs');
  const sel=IT.filter(i=>S.rSel.includes(i.id));

  renderRecipeAlerts(sel);

  if(!sel.length){
    if(tabsEl) tabsEl.style.display='none';
    el.innerHTML=`<div class="recipe-empty">
      <div class="recipe-empty-ico">⚗️</div>
      <div class="recipe-empty-title">Nenhum suplemento selecionado</div>
      <div class="recipe-empty-sub">Escolha os suplementos que você tem ou use um preset acima para começar.</div>
    </div>`;
    return;
  }
  if(tabsEl) tabsEl.style.display='flex';

  const pre=sel.filter(i=>i.dp&&i.dm);
  const ma=sel.filter(i=>i.dm&&!i.dp);
  const no=sel.filter(i=>i.dn);
  const warns=sel.filter(i=>i.warn);
  const hasCycle=sel.filter(i=>i.cy);

  const totalItems=sel.length;
  const monthly=sel.filter(i=>i.pm&&i.doses).reduce((s,i)=>s+(bestMarketplacePrice(i)/i.doses)*30,0);

  let h=`<div class="rout">`;

  h+=`<div class="rout-head">
    <div class="rout-head-left">
      <h3>Sua Receita</h3>
      <p>${totalItems} suplemento${totalItems!==1?'s':''} · ${pre.length} pré-treino · ${ma.length} manhã · ${no.length} noite${hasCycle.length?' · '+hasCycle.length+' ciclados':''}</p>
    </div>
    <div class="rout-head-acts">
      <button class="btn" onclick="copyRecipe()" style="height:34px;font-size:11px">📋 Copiar</button>
      <button class="btn" onclick="exportRecipeTxt()" style="height:34px;font-size:11px">⬇ .txt</button>
    </div>
  </div>`;

  h+=`<div class="rout-body">`;

  if(_recipeView==='timeline'){
    h+=renderRecipeTimeline(pre, ma, no);
  } else {
    h+=renderRecipeProtocol(pre, ma, no, warns);
  }

  h+=`</div>`;

  if(monthly>0){
    h+=`<div class="rout-footer">
      <div class="rout-cost">💰 Custo mensal estimado: <strong>~R$${monthly.toFixed(0)}</strong></div>
      <div style="font-size:11px;color:var(--tx3)">baseado nos ${sel.filter(i=>i.pm&&i.doses).length} itens com preço</div>
    </div>`;
  }

  h+=`</div>`;
  el.innerHTML=h;
}

function renderRecipeProtocol(pre, ma, no, warns){
  let h='';
  function rowHTML(i, period){
    const dose=period==='noite'?(i.dn||'—'):(i.dm||i.dn||'—');
    const timing=period==='pre'?'30–45min antes':period==='noite'?(i.dc?'com refeição':'antes de dormir'):(i.dc?'com refeição':'em jejum');
    return `<div class="rmr">
      <div class="rmr-left">
        <div class="rmr-n">
          ${i.name}
          ${i.badge?`<span class="badge badge-${i.badge}">${i.badge==='best'?'⭐ Best':'🔥 '+i.badge}</span>`:''}
        </div>
        <div class="rmr-tags">
          ${i.warn?'<span class="rmr-warn">⚠️ aviso</span>':''}
          ${i.cy?`<span class="rmr-cycle">🔄 ${i.cy.max}d ciclo</span>`:''}
          ${i.dc?'<span class="rmr-food">🍽 com comida</span>':''}
        </div>
      </div>
      <span class="rmr-d">${dose}</span>
      <span class="rmr-t">${timing}</span>
    </div>`;
  }
  if(pre.length){
    h+=`<div class="rsec">
      <div class="rsec-head">⚡ Pré-Treino <span class="rsec-badge">${pre.length} item${pre.length!==1?'s':''}</span></div>
      ${pre.map(i=>rowHTML(i,'pre')).join('')}
    </div>`;
  }
  if(ma.filter(i=>!i.dp).length){
    const morn=ma.filter(i=>!i.dp);
    h+=`<div class="rsec">
      <div class="rsec-head">🌅 Manhã <span class="rsec-badge">${morn.length} item${morn.length!==1?'s':''}</span></div>
      ${morn.map(i=>rowHTML(i,'manha')).join('')}
    </div>`;
  }
  if(no.length){
    h+=`<div class="rsec">
      <div class="rsec-head">🌙 Noite <span class="rsec-badge">${no.length} item${no.length!==1?'s':''}</span></div>
      ${no.map(i=>rowHTML(i,'noite')).join('')}
    </div>`;
  }
  if(warns.length){
    h+=`<div style="background:var(--ambd);border:1px solid rgba(255,182,39,.25);border-radius:var(--r);padding:14px 16px;margin-top:4px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--amber);margin-bottom:8px">⚠️ Avisos de segurança</div>
      ${warns.map(i=>`<div style="font-size:12px;color:var(--tx2);margin-bottom:6px;line-height:1.6"><b style="color:var(--tx)">${i.name}:</b> ${i.warn}</div>`).join('')}
    </div>`;
  }
  if(!pre.length&&!ma.length&&!no.length){
    h+=`<div class="recipe-empty" style="padding:30px">
      <div class="recipe-empty-ico" style="font-size:36px">🤔</div>
      <div class="recipe-empty-title">Sem dados de horário</div>
      <div class="recipe-empty-sub">Esses suplementos não têm horário definido ainda.</div>
    </div>`;
  }
  return h;
}

function renderRecipeTimeline(pre, ma, no){
  const blocks=[
    {dot:'⚡',time:'Pré-Treino · 30–45min antes',items:pre,noteKey:'dm',noteExtra:'pré-atividade'},
    {dot:'🌅',time:'Manhã · ao acordar / café',items:ma.filter(i=>!i.dp),noteKey:'dm',noteExtra:null},
    {dot:'🌙',time:'Noite · antes de dormir',items:no,noteKey:'dn',noteExtra:null},
  ].filter(b=>b.items.length);

  if(!blocks.length) return `<div class="recipe-empty" style="padding:30px"><div class="recipe-empty-ico" style="font-size:36px">🕐</div><div class="recipe-empty-title">Sem horários definidos</div></div>`;

  let h='<div class="timeline-wrap">';
  blocks.forEach(b=>{
    h+=`<div class="tl-block">
      <div class="tl-dot">${b.dot}</div>
      <div class="tl-time">${b.time}</div>
      <div class="tl-items">
        ${b.items.map(i=>{
          const dose=b.noteKey==='dn'?(i.dn||'—'):(i.dm||'—');
          const note=b.noteExtra||(i.dc?'com refeição':i.dp?'pré-treino':i.dn&&b.noteKey==='dn'?'antes de dormir':'em jejum');
          return `<div class="tl-item">
            <span class="tl-item-name">${i.name}${i.warn?` <span style="font-size:10px;color:var(--amber)">⚠️</span>`:''}</span>
            <span class="tl-item-dose">${dose}</span>
            <span class="tl-item-note">${note}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });
  h+='</div>';
  return h;
}

function renderRecipeAlerts(sel){
  const alertsEl=document.getElementById('r-alerts');if(!alertsEl) return;
  if(!sel.length){alertsEl.innerHTML='';return;}

  const selIds=sel.map(i=>i.id);
  const selNames=sel.map(i=>i.name.toLowerCase());
  let alerts=[];

  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  INTERACT_DATA.forEach(int=>{
    if(int.type==='danger'||int.type==='warn'){
      const titleWords=int.title.toLowerCase().split(/[+·,\s]+/).filter(w=>w.length>3);
      const matches=titleWords.filter(w=>selNames.some(n=>n.includes(w)));
      if(matches.length>=1&&selNames.some(n=>titleWords.some(w=>n.includes(w)))){
        alerts.push({type:int.type==='danger'?'danger':'warn',ico:int.ico,title:int.title,msg:int.desc});
      }
    }
  });

  RECIPE_SYNERGIES.forEach(([ids,title,note])=>{
    const hitIds=ids.filter(id=>selIds.includes(id));
    if(hitIds.length===ids.length){
      alerts.push({type:'synergy',ico:'✨',title:`Sinergia: ${title}`,msg:note});
    }
  });

  if(!alerts.length){alertsEl.innerHTML='';return;}

  let h='<div class="recipe-alerts">';
  const order={danger:0,warn:1,synergy:2};
  alerts.sort((a,b)=>order[a.type]-order[b.type]).forEach(a=>{
    h+=`<div class="recipe-alert ${a.type}">
      <span class="recipe-alert-ico">${a.ico}</span>
      <div class="recipe-alert-body"><strong>${a.title}</strong>${a.msg}</div>
    </div>`;
  });
  h+='</div>';
  alertsEl.innerHTML=h;
}


// ══════════════ CALCULADORA DE DOSAGEM ══════════════
let _lastDoses={};

function syncWeightSlider(v){
  const num=document.getElementById('prof-weight');
  const disp=document.getElementById('weight-display');
  if(num) num.value=v;
  if(disp) disp.textContent=v;
  renderDose();
}

function syncWeightInput(v){
  const slider=document.getElementById('prof-weight-slider');
  const disp=document.getElementById('weight-display');
  if(slider) slider.value=v;
  if(disp) disp.textContent=v;
  renderDose();
}

function fmtDoseVal(v,unit){
  const rounded=unit==='mg'||unit==='mcg'||unit==='UI'?Math.round(v):(Math.round(v*10)/10);
  return String(rounded).replace('.',',')+'\u202f'+unit;
}

function doseRange(min,max,unit){
  const a=fmtDoseVal(min,unit),b=fmtDoseVal(max,unit);
  return a===b?a:`${a}–${b}`;
}

function parseDoseRange(doseStr){
  if(!doseStr) return null;
  const clean=String(doseStr).replace(/,/g,'.').replace(/\s+/g,'').replace(/\u202f/g,'');
  const m=clean.match(/^([\d.]+)(?:[–-]([\d.]+))?(mg|mcg|g|UI|cáps?|IU)$/i);
  if(!m) return null;
  return {min:parseFloat(m[1]),max:parseFloat(m[2]||m[1]),unit:m[3]};
}

function bodyProfile(w,h,sex,activity){
  const bmi=w/Math.pow((h||175)/100,2);
  const heightIn=(h||175)/2.54;
  const ibw=(sex==='feminino'?45.5:50)+2.3*Math.max(0,heightIn-60);
  const doseWeight=bmi>=30?ibw+0.4*(w-ibw):w;
  const act={sedentario:.9,moderado:1,ativo:1.1,atleta:1.2}[activity]||1;
  const stim=sex==='feminino'?.82:1;
  return {bmi,ibw,doseWeight,act,stim};
}

function calcDose(i, field, p){
  const raw=field==='dm'?i.dm:i.dn;
  const rule=DOSE_RULES[i.id];

  if(rule?.text) return rule.text;
  if(rule){
    let min=rule.min,max=rule.max;
    if(rule.byKg){
      const kf=rule.kgFactor||1;
      min=rule.min*kf*p.body.doseWeight;
      max=rule.max*kf*p.body.doseWeight;
    }
    if(rule.stim){min*=p.body.stim;max*=p.body.stim;}
    if(rule.actScale){min*=p.body.act;max*=p.body.act;}
    if(rule.cap){min=Math.min(min,rule.cap);max=Math.min(max,rule.cap);}
    return doseRange(min,max,rule.unit);
  }

  const parsed=parseDoseRange(raw);
  if(parsed){
    let {min,max,unit}=parsed;
    const actCats=['Aminoácido','Proteína'];
    const fixedCats=['Vitamina','Mineral','Hormônio','Antioxidante','Digestão','Sono','Adaptógeno','Longevidade','Vegetal','Articulações'];
    const cat=i.cat||'';

    if(actCats.some(c=>cat.includes(c))){
      min*=p.body.act;
      max*=p.body.act;
    } else if(!fixedCats.some(c=>cat.includes(c))){
      const wFactor=Math.pow(p.body.doseWeight/75,0.5);
      min*=wFactor;
      max*=wFactor;
      if(i.tags&&i.tags.some(t=>['estimulante','cafeína','dopamina'].includes(t))){
        min*=p.body.stim;max*=p.body.stim;
      }
    }
    const origParsed=parseDoseRange(raw);
    if(origParsed){min=Math.min(min,origParsed.max*2);max=Math.min(max,origParsed.max*2);}
    return doseRange(Math.max(min,0),Math.max(max,0),unit);
  }
  return raw||'—';
}

function isDoseByKg(i){
  if(DOSE_RULES[i.id]?.byKg) return true;
  const fixedCats=['Vitamina','Mineral','Hormônio','Antioxidante','Digestão','Sono','Adaptógeno','Longevidade','Vegetal','Articulações'];
  return !fixedCats.some(c=>(i.cat||'').includes(c));
}

function imcClass(bmi){
  if(bmi<18.5) return {cls:'imc-under',lbl:'Abaixo do peso'};
  if(bmi<25) return {cls:'imc-normal',lbl:'Normal'};
  if(bmi<30) return {cls:'imc-over',lbl:'Sobrepeso'};
  return {cls:'imc-obese',lbl:'Obesidade'};
}

function renderDose(){
  const profW=document.getElementById('prof-weight');
  const wtEl=document.getElementById('wt');
  const w=parseFloat(profW?.value)||parseFloat(wtEl?.value)||80;
  if(wtEl) wtEl.value=w; 
  const hgt=parseFloat(document.getElementById('prof-height')?.value)||175;
  const sex=document.getElementById('prof-sex')?.value||'masculino';
  const condition=document.getElementById('prof-condition')?.value||'';
  const goal=document.getElementById('prof-goal')?.value||'saude';
  const activity=document.getElementById('prof-activity')?.value||'moderado';
  const el=document.getElementById('dose-out');if(!el) return;
  const body=bodyProfile(w,hgt,sex,activity);
  const profile={w,hgt,sex,activity,body};

  const condWarns={
    hipertensao:{ico:'❤️',title:'Hipertensão',msg:'Evite Cafeína em doses altas. Prefira L-Teanina isolada. Ômega-3 e Magnésio são benéficos.'},
    diabetes:{ico:'🩸',title:'Diabetes',msg:'Berberina pode potencializar hipoglicemiantes — monitore glicemia. Cromo e Canela também.'},
    hipotireoidismo:{ico:'🦋',title:'Hipotireoidismo',msg:'Maca e Ashwagandha podem interagir com a tireoide. Consulte endocrinologista antes de usar.'},
    anticoagulante:{ico:'💊',title:'Anticoagulantes',msg:'Ômega-3, Feno-grego e Tongkat Ali aumentam risco de sangramento. Supervisão médica.'},
    imao:{ico:'🧠',title:'IMAO/Antidepressivos',msg:'Mucuna Pruriens é CONTRAINDICADA. Evite também Ashwagandha sem supervisão médica.'},
  };
  const actLabel={sedentario:'Sedentário',moderado:'Moderado',ativo:'Ativo',atleta:'Atleta'};
  const goalLabels={saude:'❤️ Saúde',hipertrofia:'💪 Hipertrofia',gordura:'🔥 Gordura',energia:'⚡ Energia',libido:'🌿 Libido',sono:'🌙 Sono',mulher:'♀️ Mulher',digestao:'🦠 Digestão',articulacoes:'🦴 Articulações',metabolismo:'🔥 Metabolismo',longevidade:'⏳ Longevidade'};

  const goalIds=GOAL_MAP[goal]||[];
  const allGoalItems=goalIds.length ? IT.filter(i=>goalIds.includes(i.id)) : IT.filter(i=>i.pr!=='extra');
  const pool=allGoalItems.length ? allGoalItems : IT.filter(i=>i.pr!=='extra');

  const preItems=pool.filter(i=>i.dp&&i.dm);
  const morItems=pool.filter(i=>i.dm&&!i.dp);
  const nigItems=pool.filter(i=>i.dn);
  const totalItems=new Set([...preItems,...morItems,...nigItems].map(i=>i.id)).size;

  let h='';

  if(condition&&condWarns[condition]){
    const cw=condWarns[condition];
    h+=`<div class="dose-alert"><span class="dose-alert-ico">${cw.ico}</span><div class="dose-alert-body"><strong>${cw.title}</strong><span>${cw.msg}</span></div></div>`;
  }

  const imc=imcClass(body.bmi);
  h+=`<div class="dose-summary">
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-w">${w}<small>kg</small></span><span class="dose-sum-l">Peso</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-h">${hgt}<small>cm</small></span><span class="dose-sum-l">Altura</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:13px">${SEX_LABEL[sex]||sex}</span><span class="dose-sum-l">Sexo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item">
      <span class="dose-sum-n" id="ds-bmi">${body.bmi.toFixed(1).replace('.',',')}</span>
      <span class="dose-sum-l">IMC <span class="imc-badge ${imc.cls}">${imc.lbl}</span></span>
    </div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-dw">${body.doseWeight.toFixed(0)}<small>kg</small></span><span class="dose-sum-l">Peso de cálculo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${totalItems}</span><span class="dose-sum-l">Suplementos</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${actLabel[activity]}</span><span class="dose-sum-l">Atividade</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${goalLabels[goal]||goal}</span><span class="dose-sum-l">Objetivo</span></div>
  </div>`;

  const scaledCount=pool.filter(i=>isDoseByKg(i)&&(i.dm||i.dn)).length;
  if(scaledCount>0){
    h+=`<div style="display:flex;align-items:center;gap:8px;background:var(--blued);border:1px solid rgba(77,166,255,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:var(--blue)">
      <span style="font-size:15px">⚖️</span>
      <span><strong>${scaledCount} suplementos</strong> têm doses ajustadas pelo seu peso (${body.doseWeight.toFixed(0)} kg de cálculo), sexo e nível de atividade. Altere o slider para ver as doses mudarem.</span>
    </div>`;
  }

  function rowsHTML(items, field){
    if(!items.length) return `<div class="dose-empty">Nenhum suplemento neste período para o objetivo selecionado.</div>`;
    return items.map(i=>{
      const dose=calcDose(i,field,profile);
      const cacheKey=`${i.id}_${field}`;
      const prev=_lastDoses[cacheKey];
      let deltaHTML='';
      if(prev&&prev!==dose){
        const getNum=s=>{const m=String(s).replace(/,/g,'.').match(/([\d.]+)/);return m?parseFloat(m[1]):0;};
        const n=getNum(dose),p2=getNum(prev);
        if(n>p2) deltaHTML=`<span class="dose-delta up">▲</span>`;
        else if(n<p2) deltaHTML=`<span class="dose-delta dn">▼</span>`;
      }
      _lastDoses[cacheKey]=dose;
      const warn=i.warn?`<span class="dose-warn-tag">⚠️</span>`:'';
      const cycle=i.cy?`<span class="dose-cycle-tag">${i.cy.max}d ciclo</span>`:'';
      const withFood=i.dc?`<span class="dose-food-tag">com comida</span>`:'';
      const kgBadge=isDoseByKg(i)?`<span class="dose-kg-badge">⚖️/kg</span>`:'';
      return `<div class="dose-row">
        <div class="dose-row-main">
          <span class="dose-name">${i.name}${kgBadge}</span>
          <div class="dose-tags-row">${warn}${cycle}${withFood}</div>
        </div>
        <span class="dose-amt">${dose||'—'}${deltaHTML}</span>
      </div>`;
    }).join('');
  }

  if(preItems.length){
    h+=`<div class="dose-period-card pre">
      <div class="proto-head">⚡ Pré-Treino <span class="dose-head-sub">30–45min antes</span></div>
      <div class="proto-body">${rowsHTML(preItems,'dm')}</div>
    </div>`;
  }
  h+=`<div class="proto-grid">
    <div class="dose-period-card">
      <div class="proto-head">🌅 Manhã <span class="dose-head-sub">${morItems.length} itens</span></div>
      <div class="proto-body">${rowsHTML(morItems,'dm')}</div>
    </div>
    <div class="dose-period-card">
      <div class="proto-head">🌙 Noite <span class="dose-head-sub">${nigItems.length} itens</span></div>
      <div class="proto-body">${rowsHTML(nigItems,'dn')}</div>
    </div>
  </div>`;

  const costItems=pool.filter(i=>i.pm&&i.doses);
  if(costItems.length){
    const monthly=costItems.reduce((s,i)=>s+(bestMarketplacePrice(i)/i.doses)*30,0);
    h+=`<div class="dose-cost-bar">
      <span>💰 Custo mensal estimado do protocolo</span>
      <strong>~R$${monthly.toFixed(0)}</strong>
    </div>`;
  }

  h+=`<p class="dose-disclaimer">⚠️ Protocolo educacional baseado em evidências científicas. Os valores com ⚖️/kg variam conforme seu perfil. Consulte um profissional de saúde antes de iniciar qualquer suplementação.</p>`;
  el.innerHTML=h;
}


// ══════════════ COMPARE ══════════════
function renderCmp(){
  const el=document.getElementById('cmp-grid');if(!el) return;
  el.innerHTML=IT.filter(i=>i.pr!=='extra').map(i=>`<div class="cmp-card${S.cmpSel.includes(i.id)?' sel':''}" onclick="togCmp(${i.id})">
    <div class="cmp-check">${S.cmpSel.includes(i.id)?'✓':''}</div>
    <div style="font-size:12px;font-weight:500;color:var(--tx);margin-bottom:4px">${i.name}</div>
    <span class="ctag ${CAT[i.cat]?.cls||'cV'}">${CAT[i.cat]?.ico||''} ${i.cat}</span>
    <div style="margin-top:6px">${starsHTML(i.sc)}</div>
  </div>`).join('');
  renderCmpOut();
}

function togCmp(id){
  const idx=S.cmpSel.indexOf(id);
  if(idx>=0)S.cmpSel.splice(idx,1);else if(S.cmpSel.length<4)S.cmpSel.push(id);
  else{toast('⚠️','Máximo 4 itens para comparar','warn',{duration:2800});return;}
  renderCmp();
}

function renderCmpOut(){
  const el=document.getElementById('cmp-out');if(!el) return;
  const sel=IT.filter(i=>S.cmpSel.includes(i.id));
  if(!sel.length){el.innerHTML='';return;}
  const fields=[
    ['Categoria',i=>i.cat],['Prioridade',i=>({alta:'🔴 Alta',media:'🟡 Média',baixa:'🟢 Baixa'}[i.pr]||i.pr)],
    ['Preço',i=>`~R$${i.pm}`],['Preço/Dose',i=>pdose(i)?`R$${pdose(i)}`:'—'],
    ['Dose Manhã',i=>i.dm||'—'],['Dose Noite',i=>i.dn||'—'],
    ['Ciclo',i=>i.cy?`${i.cy.max}d / ${i.cy.pausa}d pausa`:'Contínuo'],
    ['Eficácia',i=>starsHTML(i.sc)],['Aviso',i=>i.warn?'⚠️ Sim':'✅ Ok'],
  ];
  let h=`<div class="table-wrap"><table class="cmp-table"><thead><tr><th>Atributo</th>`;
  sel.forEach(i=>{h+=`<th class="cmp-name">${i.name}</th>`;});
  h+=`</tr></thead><tbody>`;
  fields.forEach(([lbl,fn])=>{h+=`<tr><td style="color:var(--tx3);font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">${lbl}</td>${sel.map(i=>`<td>${fn(i)}</td>`).join('')}</tr>`;});
  h+='</tbody></table></div>';
  el.innerHTML=h;
}


// ══════════════ HISTORY ══════════════
function initHist(){
  const sel=document.getElementById('hsel');if(!sel) return;
  sel.innerHTML=IT.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
  const d=document.getElementById('hdate');if(d)d.value=new Date().toISOString().split('T')[0];
}

function addHist(){
  const idEl=document.getElementById('hsel'),pEl=document.getElementById('hprice'),dEl=document.getElementById('hdate');
  if(!idEl||!pEl||!dEl) return;
  const price=parseFloat(pEl.value),date=dEl.value;
  if(!price||!date){toast('⚠️','Preencha preço e data','warn',{duration:2800});return;}
  const it=IT.find(i=>i.id===parseInt(idEl.value));
  S.history.push({id:parseInt(idEl.value),name:it?.name||'?',price,date,uid:Date.now()});
  save();renderHist();pEl.value='';toast('✅','Compra registrada!','success',{duration:2600});
}

function delHist(uid){S.history=S.history.filter(h=>h.uid!==uid);save();renderHist();}
function fmtR(v){return'R$ '+v.toFixed(2).replace('.',',');}

function renderHist(){
  const total=S.history.reduce((s,h)=>s+h.price,0);
  const tt=document.getElementById('ht-top');if(tt)tt.textContent=fmtR(total);
  const by={};S.history.forEach(h=>{const m=h.date.slice(0,7);by[m]=(by[m]||0)+h.price;});
  const months=Object.keys(by).sort().slice(-8),mx=Math.max(...months.map(m=>by[m]),1);
  const bEl=document.getElementById('bars');
  if(bEl)bEl.innerHTML=months.length?months.map(m=>{const pct=Math.round((by[m]/mx)*100);return`<div class="bar" style="height:${pct}%"><div class="bar-tip">${m.slice(5)+'/'+m.slice(2,4)}: ${fmtR(by[m])}</div></div>`}).join(''):'<div style="color:var(--tx3);font-size:11px;width:100%;text-align:center;align-self:center">Sem registros</div>';
  const sorted=[...S.history].sort((a,b)=>b.date.localeCompare(a.date));
  const lEl=document.getElementById('hlist');
  if(lEl)lEl.innerHTML=sorted.map(h=>`<div class="hitem"><span class="hitem-n">${h.name}</span><span class="hitem-p">${fmtR(h.price)}</span><span class="hitem-d">${h.date}</span><button class="hitem-del" onclick="delHist(${h.uid})">✕</button></div>`).join('')||'<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">Nenhuma compra registrada</div>';
  const htEl=document.getElementById('htotal');if(htEl)htEl.style.display=S.history.length?'flex':'none';
  const hvEl=document.getElementById('htval');if(hvEl)hvEl.textContent=fmtR(total);
  
  const bySupp={};S.history.forEach(h=>{bySupp[h.name]=(bySupp[h.name]||0)+h.price;});
  const topSupps=Object.entries(bySupp).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const tsEl=document.getElementById('htop-supps');
  if(tsEl)tsEl.innerHTML=topSupps.length
    ? topSupps.map(([name,val])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--tx)">${name}</span><span style="font-family:var(--fm);color:var(--accent)">${fmtR(val)}</span></div>`).join('')
    : '<div style="color:var(--tx3);font-size:11px">Sem dados ainda</div>';
}


// ══════════════ INTERACT ══════════════
function renderInteract(){
  const el=document.getElementById('ilist');if(!el) return;
  const stackNames=Object.keys(S.stack).map(id=>{const it=IT.find(i=>i.id===parseInt(id));return it?.name?.toLowerCase()||'';});
  
  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  
  const sorted=[...INTERACT_DATA].sort((a,b)=>{
    const aRel=stackNames.some(n=>a.title.toLowerCase().includes(n)||a.desc.toLowerCase().includes(n));
    const bRel=stackNames.some(n=>b.title.toLowerCase().includes(n)||b.desc.toLowerCase().includes(n));
    if(aRel&&!bRel) return -1;
    if(!aRel&&bRel) return 1;
    return 0;
  });
  el.innerHTML=sorted.map(i=>{
    const relevant=stackNames.some(n=>i.title.toLowerCase().includes(n)||i.desc.toLowerCase().includes(n));
    return`<div class="iitem ${i.type}${relevant?' iitem-stack-match':''}"><span class="iico">${i.ico}</span><div><div class="ititle">${i.title}${relevant?'<span class="iitem-stack-badge">🎯 Na sua stack</span>':''}</div><div class="idesc">${i.desc}</div></div></div>`;
  }).join('');
}


// ══════════════ CONFIG E EXPORTAÇÃO ══════════════
function toggleCfg(k){S.cfg[k]=!S.cfg[k];save();applyCfg();renderList();}

function nukeAll(){
  confirmModal({
    title:'Apagar tudo',
    msg:'<strong>APAGAR TODOS OS DADOS?</strong><br><br>Isso remove permanentemente sua lista, notas, histórico, stack e configurações. <strong>Irreversível.</strong>',
    ico:'🗑',
    okLabel:'Apagar tudo',
    cancelLabel:'Cancelar',
    danger:true,
  }).then(ok=>{
    if(!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('sb_collapsed');
    toast('🗑','Dados apagados. Recarregando…','error',{duration:1800,progress:false});
    setTimeout(()=>location.reload(),1800);
  });
}

function applyCfg(){
  const ALL_KEYS=['showStars','showPdose','confetti','alertInteractions','alertCycles','toasts','expandOnClick','confirmUncheck','autoSync'];
  ALL_KEYS.forEach(k=>{
    const el=document.getElementById('cfg-'+k);
    if(el)el.className='tog'+(S.cfg[k]?' on':'');
  });
  const exEl=document.getElementById('cfg-showExtra');if(exEl)exEl.className='tog'+(S.showExtra?' on':'');
  const dnEl=document.getElementById('cfg-showDone');if(dnEl)dnEl.className='tog'+(S.showDone?' on':'');
  const dsEl=document.getElementById('cfg-defaultSort');if(dsEl)dsEl.value=S.cfg.defaultSort||'priority';
}

function exportTxt(){
  let t='SUPLILIST v'+APP_VERSION+'\n'+'═'.repeat(50)+'\n';
  ['alta','media','baixa','extra'].forEach(p=>{
    const g=IT.filter(i=>i.pr===p);if(!g.length) return;
    t+=`\n[${PLBL[p].toUpperCase()}]\n`;
    g.forEach(i=>{
      const mlLink = i.linkML || (i.ml ? mlAff(i.ml) : '');
      const azLink = i.linkAmazon || (i.az ? amazonAff(i.az) : '');
      t+=`  ${S.checked[i.id]?'[✔]':'[ ]'} ${i.name}  ~R$${bestMarketplacePrice(i)}\n  Mercado Livre: ${mlLink}\n  Amazon: ${azLink}\n\n`;
    });
  });
  dl(t,'suplilist.txt','text/plain');toast('⬇','Lista exportada como .txt','success',{duration:2600});
}

function exportJSON(){
  const data={date:new Date().toISOString(),items:IT.map(i=>({...i,comprado:!!S.checked[i.id],nota:S.notes[i.id]||''})),history:S.history};
  dl(JSON.stringify(data,null,2),'suplilist.json','application/json');toast('⬇','Backup .json salvo','success',{duration:2600});
}

function importJSON(){document.getElementById('import-file')?.click();}

function handleImport(input){
  const file=input.files?.[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(Array.isArray(data.items)){
        data.items.forEach(item=>{
          if(item.comprado) S.checked[item.id]=true;
          if(item.nota) S.notes[item.id]=item.nota;
        });
      }
      if(Array.isArray(data.history)) S.history=[...S.history,...data.history].filter((h,i,arr)=>arr.findIndex(x=>x.uid===h.uid)===i);
      save();renderAll();
      toast('✅','Dados importados com sucesso!','success',{duration:3200});
    }catch(err){toast('⚠️','Arquivo inválido — verifique o .json exportado','error',{duration:3600});}
    input.value=''; 
  };
  reader.readAsText(file);
}

function testAffiliateLinks() {
    if (!S.cfg.isAdmin) {
        console.warn("Acesso negado: Modo administrador necessário.");
        return;
    }

    // Usando Creatina Monohidratada (ID 11) como produto de amostra para teste
    const testProduct = IT.find(i => i.id === 11);

    if (!testProduct) {
        toast('⚠️', 'Produto de teste (Creatina) não encontrado. Verifique o data.js.', 'error', { duration: 5000 });
        return;
    }

    // Os links já foram processados por applyProductLinks em links.js
    // Usamos as propriedades linkAmazon, linkShopee, linkML que já contêm as tags de afiliado e UTMs.

    const amazonTestUrl = testProduct.linkAmazon;
    if (amazonTestUrl) {
        window.open(amazonTestUrl, '_blank');
        console.log('Amazon Test URL:', amazonTestUrl);
    } else {
        toast('⚠️', 'Link da Amazon para Creatina não disponível.', 'warn', { duration: 3000 });
    }

    const mlTestUrl = testProduct.linkML;
    if (mlTestUrl) {
        window.open(mlTestUrl, '_blank');
        console.log('Mercado Livre Test URL:', mlTestUrl);
    } else {
        toast('⚠️', 'Link do Mercado Livre para Creatina não disponível.', 'warn', { duration: 3000 });
    }

    const shopeeTestUrl = testProduct.linkShopee;
    if (shopeeTestUrl) {
        window.open(shopeeTestUrl, '_blank');
        console.log('Shopee Test URL:', shopeeTestUrl);
    } else {
        toast('⚠️', 'Link da Shopee para Creatina não disponível.', 'warn', { duration: 3000 });
    }

    toast('🔗', 'Abrindo links de teste em novas abas. Verifique os parâmetros de afiliado.', 'info', { duration: 6000 });
}

function copyList(){
  const lines=IT.map(i=>{
    const p = bestMarketplacePrice(i);
    let text = `${S.checked[i.id]?'✔':'○'} ${i.name} (~R$${p})`;
    if(S.wishlist[i.id]) text += ' ❤️';
    
    const ml = i.linkML || "";
    const az = i.linkAmazon || "";
    const sh = i.linkShopee || "";
    
    return `${text}\n   🛒 ML: ${ml}\n   🛒 Amazon: ${az}\n   🛒 Shopee: ${sh}`;
  });
  navigator.clipboard?.writeText(lines.join('\n')).then(()=>toast('📋','Lista copiada!','success',{duration:2400,progress:false}));
}

function dl(c,fn,t){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:t}));a.download=fn;a.click();}

function confetti(){
  const cols=['#4edd9a','#4da6ff','#a78bfa','#f472b6','#f5a623','#fff'];
  for(let i=0;i<80;i++){
    const el=document.createElement('div');el.className='cf';
    el.style.cssText=`left:${Math.random()*100}vw;background:${cols[~~(Math.random()*cols.length)]};animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*.6}s;width:${6+Math.random()*7}px;height:${6+Math.random()*7}px`;
    document.body.appendChild(el);setTimeout(()=>el.remove(),4200);
  }
  toast('🎉','Lista 100% completa!','success',{
    title:'Parabéns! 🏆',
    sub:'Todos os suplementos foram comprados.',
    duration:5000,
  });
}


// ══════════════ TOAST & MODAL ══════════════
let _toastCount=0;
function toast(ico, msg, type, opts={}){
  const w=document.getElementById('toasts');
  if(!w) return;
  const t=document.createElement('div');
  const typeClass=type?` toast-${type}`:'';
  t.className=`toast in${typeClass}`;

  const title=opts.title||'';
  const duration=opts.duration||3400;
  const undoFn=opts.undo||null;
  const showProgress=opts.progress!==false;

  let inner=`<span class="toast-ico">${ico}</span>
  <span class="toast-body">
    ${title?`<span class="toast-title">${title}</span>`:''}
    <span class="${title?'toast-sub':'toast-title'}">${msg}</span>
  </span>`;
  if(undoFn){
    inner+=`<button class="toast-undo" id="tu-${++_toastCount}">Desfazer</button>`;
  }
  inner+=`<button class="toast-close" aria-label="Fechar">✕</button>`;
  if(showProgress){
    inner+=`<div class="toast-progress" style="width:100%;transition-duration:${duration}ms"></div>`;
  }
  t.innerHTML=inner;

  t.querySelector('.toast-close').addEventListener('click',()=>dismissToast(t));

  if(undoFn){
    t.querySelector('.toast-undo')?.addEventListener('click',()=>{
      undoFn();
      dismissToast(t);
      toast('↩','Ação desfeita','info',{duration:2000,progress:false});
    });
  }

  w.appendChild(t);

  if(showProgress){
    requestAnimationFrame(()=>{
      const pb=t.querySelector('.toast-progress');
      if(pb){pb.style.width='0%';}
    });
  }

  const all=[...w.querySelectorAll('.toast')];
  if(all.length>4) dismissToast(all[0]);

  const timer=setTimeout(()=>dismissToast(t), duration);
  t._timer=timer;
  t.addEventListener('mouseenter',()=>clearTimeout(t._timer));
  t.addEventListener('mouseleave',()=>{t._timer=setTimeout(()=>dismissToast(t),1200);});
  return t;
}

function dismissToast(t){
  if(!t||!t.isConnected) return;
  clearTimeout(t._timer);
  t.classList.remove('in');
  t.classList.add('out');
  setTimeout(()=>t.remove(),250);
}

function confirmModal(opts={}){
  return new Promise(resolve=>{
    const {
      title='Confirmar',
      msg='Tem certeza?',
      ico='⚠️',
      okLabel='Confirmar',
      cancelLabel='Cancelar',
      danger=true,
      okColor=null,
    }=opts;
    const color=okColor||(danger?'var(--red)':'var(--accent)');

    const overlay=document.createElement('div');
    overlay.className='confirm-overlay';
    overlay.innerHTML=`<div class="confirm-box" style="--cf-color:${color}">
      <span class="confirm-ico">${ico}</span>
      <div class="confirm-title">${title}</div>
      <div class="confirm-msg">${msg}</div>
      <div class="confirm-actions">
        <button class="confirm-cancel">${cancelLabel}</button>
        <button class="confirm-ok" style="background:${color}">${okLabel}</button>
      </div>
    </div>`;

    const close=(val)=>{
      overlay.style.animation='cfIn .18s ease reverse forwards';
      setTimeout(()=>{overlay.remove();resolve(val);},160);
    };

    overlay.querySelector('.confirm-cancel').addEventListener('click',()=>close(false));
    overlay.querySelector('.confirm-ok').addEventListener('click',()=>close(true));
    overlay.addEventListener('click',e=>{if(e.target===overlay)close(false);});
    document.addEventListener('keydown',function esc(e){
      if(e.key==='Escape'){close(false);document.removeEventListener('keydown',esc);}
      if(e.key==='Enter'){close(true);document.removeEventListener('keydown',esc);}
    });
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.querySelector('.confirm-ok')?.focus(),50);
  });
}


// ══════════════ SIDEBAR ══════════════
let sidebarCollapsed=false;
function toggleSidebar(){
  sidebarCollapsed=!sidebarCollapsed;
  const sb=document.getElementById('sidebar');
  const shell=document.getElementById('main-shell');
  const btn=document.getElementById('sb-toggle');
  if(sb)sb.classList.toggle('collapsed',sidebarCollapsed);
  if(shell)shell.classList.toggle('sidebar-collapsed',sidebarCollapsed);
  if(btn)btn.textContent=sidebarCollapsed?'▶':'◀';
  const pop=document.getElementById('theme-pop');
  if(pop)pop.style.left=sidebarCollapsed?'70px':'14px';
  try{localStorage.setItem('sb_collapsed',sidebarCollapsed?'1':'0');}catch(e){}
}

(function(){
  try{
    const saved=localStorage.getItem('sb_collapsed');
    if(saved==='1'){
      sidebarCollapsed=true;
      const sb=document.getElementById('sidebar');
      const shell=document.getElementById('main-shell');
      const btn=document.getElementById('sb-toggle');
      if(sb)sb.classList.add('collapsed');
      if(shell)shell.classList.add('sidebar-collapsed');
      if(btn)btn.textContent='▶';
      const pop=document.getElementById('theme-pop');
      if(pop)pop.style.left='70px';
    }
  }catch(e){}
})();


// ══════════════ FAQ ══════════════
let _faqCat='all';
function renderFaq(){
  const q=(document.getElementById('faq-search-inp')?.value||'').toLowerCase().trim();
  
  const FAQ_DATA_LOCAL = (typeof FAQ_DATA !== 'undefined') ? FAQ_DATA : [];
  
  let items=FAQ_DATA_LOCAL.filter(f=>{
    if(_faqCat!=='all'&&f.cat!==_faqCat) return false;
    if(q&&!f.q.toLowerCase().includes(q)&&!f.a.toLowerCase().includes(q)) return false;
    return true;
  });
  const el=document.getElementById('faq-list');if(!el) return;
  if(!items.length){el.innerHTML='<div class="faq-empty">🔍 Nenhuma pergunta encontrada.</div>';return;}
  const groups={plataforma:{ico:'💻',lbl:'Plataforma'},suplementos:{ico:'💊',lbl:'Suplementos'},compras:{ico:'🛒',lbl:'Compras'},seguranca:{ico:'🛡',lbl:'Segurança'},dados:{ico:'💾',lbl:'Dados'}};
  let html='';
  if(_faqCat==='all'){
    Object.entries(groups).forEach(([key,{ico,lbl}])=>{
      const g=items.filter(f=>f.cat===key);
      if(!g.length) return;
      html+=`<div class="faq-group"><div class="faq-group-title">${ico} ${lbl} (${g.length})</div>${g.map((f,i)=>faqItemHTML(f,key+i)).join('')}</div>`;
    });
  } else {
    html=items.map((f,i)=>faqItemHTML(f,_faqCat+i)).join('');
  }
  el.innerHTML=html;
}

function faqItemHTML(f,uid){
  return`<div class="faq-item" id="fi-${uid}">
    <div class="faq-q" onclick="togFaq('${uid}')" tabindex="0" role="button" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togFaq('${uid}')}">
      <div class="faq-q-txt">${f.q}</div>
      <div class="faq-ico">▼</div>
    </div>
    <div class="faq-a">${f.a}</div>
  </div>`;
}

function togFaq(uid){
  const el=document.getElementById('fi-'+uid);
  if(!el) return;
  const wasOpen=el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
  if(!wasOpen) el.classList.add('open');
}

function filterFaq(){renderFaq();}
function filterFaqCat(cat,btn){
  _faqCat=cat;
  document.querySelectorAll('.faq-cat').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderFaq();
}


// ══════════════ TERMS NAV ══════════════
function scrollToSection(id){
  const el=document.getElementById(id);if(!el) return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.terms-nav-item').forEach(i=>i.classList.remove('active'));
  const items=document.querySelectorAll('.terms-nav-item');
  const sections=['t-intro','t-uso','t-medico','t-afiliados','t-dados','t-ip','t-responsabilidade','t-alteracoes','t-contato'];
  const idx=sections.indexOf(id);
  if(items[idx])items[idx].classList.add('active');
}

let _termsObserver=null;
function initTermsNav(){
  if(_termsObserver){_termsObserver.disconnect();_termsObserver=null;}
  const sections=document.querySelectorAll('.terms-section');
  const navItems=document.querySelectorAll('.terms-nav-item');
  if(!sections.length) return;
  _termsObserver=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        navItems.forEach(n=>n.classList.remove('active'));
        const idx=[...sections].indexOf(e.target);
        if(navItems[idx])navItems[idx].classList.add('active');
      }
    });
  },{threshold:0.35,rootMargin:'0px 0px -40% 0px'});
  sections.forEach(s=>_termsObserver.observe(s));
}


// ══════════════ BOTTOM NAV ══════════════
const BN_PRIMARY=['home','lista','stack','wishlist','dose'];
const BN_DRAWER=['recipe','compare','history','interact','faq','terms','config'];

function bnSelect(p){
  BN_PRIMARY.forEach(id=>{
    const el=document.getElementById('bn-'+id);
    if(el)el.classList.toggle('on',id===p);
  });
  BN_DRAWER.forEach(id=>{
    const el=document.getElementById('bnd-'+id);
    if(el)el.classList.toggle('on',id===p);
  });
  const moreBtn=document.getElementById('bn-more-btn');
  if(moreBtn){
    moreBtn.classList.toggle('on',BN_DRAWER.includes(p));
    moreBtn.setAttribute('aria-expanded','false');
  }
  const drawer=document.getElementById('bn-drawer');
  if(drawer)drawer.classList.remove('on');
}

function toggleBnDrawer(){
  const drawer=document.getElementById('bn-drawer');
  const btn=document.getElementById('bn-more-btn');
  const isOpen=drawer.classList.toggle('on');
  if(btn)btn.setAttribute('aria-expanded',isOpen?'true':'false');
}

function syncBnBadges(){
  const pend=IT.filter(i=>!S.checked[i.id]&&i.pr!=='extra').length;
  const wl=Object.values(S.wishlist||{}).filter(Boolean).length;
  const st=Object.keys(S.stack||{}).length;
  const setBadge=(id,n)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.textContent=n;
    el.classList.toggle('vis',n>0);
  };
  setBadge('bn-badge-lista',pend);
  setBadge('bn-badge-wl',wl);
  setBadge('bn-badge-stack',st);
}


// ══════════════ HOME REVEAL ══════════════
function initHomeReveal(){
  setTimeout(()=>{
    const els=document.querySelectorAll('#p-home .hp-reveal');
    if(!els.length) return;
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');});
    },{threshold:0.08});
    els.forEach(el=>obs.observe(el));
  },80);
}


// ══════════════ EVENTOS GERAIS DE DOM ══════════════
document.addEventListener('click',e=>{
  const drawer=document.getElementById('bn-drawer');
  const btn=document.getElementById('bn-more-btn');
  const bnav=document.getElementById('bottom-nav');
  if(drawer&&drawer.classList.contains('on')&&bnav&&!bnav.contains(e.target)){
    drawer.classList.remove('on');
    if(btn)btn.setAttribute('aria-expanded','false');
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const overlay=document.getElementById('ref-overlay');
    if(overlay&&overlay.classList.contains('on'))closeRef();
    const tp=document.getElementById('theme-pop');
    if(tp&&tp.classList.contains('on')){tp.classList.remove('on');const btn=document.getElementById('theme-toggle-btn');if(btn)btn.setAttribute('aria-expanded','false');}
  }
  
  const tag=document.activeElement?.tagName?.toLowerCase();
  const inInput=tag==='input'||tag==='textarea'||tag==='select';
  
  if(e.key==='/'&&!inInput){
    e.preventDefault();
    const s=document.getElementById('search');
    if(s){
      if(S.tab!=='lista') go('lista');
      setTimeout(()=>{s.focus();s.select();},50);
    }
  }
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){
    e.preventDefault();
    go('lista');
    setTimeout(()=>{const s=document.getElementById('search');if(s){s.focus();s.select();}},80);
  }
  if(e.key==='Escape'&&document.activeElement?.id==='search'){
    clearSearch();
    document.activeElement.blur();
  }
});

document.addEventListener('change',e=>{
  if(e.target.classList.contains('cb')&&navigator.vibrate){
    navigator.vibrate(e.target.checked?[8,4,16]:[12]);
  }
});


// ══════════════ UX IMPROVEMENTS (IIFEs) ══════════════

// Search Clear
function onSearchInput(){
  renderList();
  const v=document.getElementById('search')?.value||'';
  const cl=document.getElementById('search-clear');
  if(cl)cl.classList.toggle('vis',v.length>0);
}

function clearSearch(){
  const s=document.getElementById('search');
  if(s){s.value='';s.focus();}
  const cl=document.getElementById('search-clear');
  if(cl)cl.classList.remove('vis');
  renderList();
}

// Scroll Top
(function initScrollTop(){
  const btn=document.getElementById('scroll-top');
  if(!btn) return;
  window.addEventListener('scroll',()=>{
    btn.classList.toggle('vis',window.scrollY>320);
  },{passive:true});
})();

// Sticky Bar
(function initStickyBar(){
  const bar=document.querySelector('.top-bar');
  if(!bar) return;
  window.addEventListener('scroll',()=>{
    bar.classList.toggle('scrolled',window.scrollY>60);
  },{passive:true});
})();

// Sidebar Tooltips
(function initSidebarTooltips(){
  document.querySelectorAll('.nt').forEach(btn=>{
    const lbl=btn.querySelector('.nt-lbl');
    if(!lbl) return;
    const tt=document.createElement('span');
    tt.className='nt-tooltip';
    tt.textContent=lbl.textContent.trim();
    btn.appendChild(tt);
    btn.addEventListener('mouseenter',()=>{
      const rect=btn.getBoundingClientRect();
      tt.style.top=(rect.top+rect.height/2-10)+'px';
    });
  });
})();

// Touch Swipe Drawer
(function initSwipeDrawer(){
  const bnav=document.getElementById('bottom-nav');
  if(!bnav) return;
  let startY=0;
  bnav.addEventListener('touchstart',e=>{startY=e.touches[0].clientY;},{passive:true});
  bnav.addEventListener('touchend',e=>{
    const dy=startY-e.changedTouches[0].clientY;
    if(dy>40) {
      const drawer=document.getElementById('bn-drawer');
      if(drawer&&!drawer.classList.contains('on'))toggleBnDrawer();
    }
    if(dy<-40){
      const drawer=document.getElementById('bn-drawer');
      if(drawer&&drawer.classList.contains('on'))toggleBnDrawer();
    }
  },{passive:true});
})();

// Ripple Effect
(function initRipple(){
  const s=document.createElement('style');
  s.textContent='@keyframes ripple27{from{transform:scale(0);opacity:.6}to{transform:scale(2.8);opacity:0}}';
  document.head.appendChild(s);
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.btn,.hp-btn-p,.hp-btn-s,.oab,.chip,.rpreset,.mkt-cta');
    if(!btn||btn.dataset.ripple) return;
    const r=btn.getBoundingClientRect();
    const rip=document.createElement('span');
    const size=Math.max(r.width,r.height);
    rip.style.cssText=`position:absolute;border-radius:50%;width:${size}px;height:${size}px;`+
      `left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px;`+
      `background:rgba(255,255,255,.18);pointer-events:none;z-index:20;`+
      `animation:ripple27 .55s ease-out both;`;
    const pos=getComputedStyle(btn).position;
    if(pos==='static')btn.style.position='relative';
    btn.style.overflow='hidden';
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
})();

// Card Tilt
(function initCardTilt(){
  document.querySelectorAll('.hs,.sc').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(600px) rotateY(${x*7}deg) rotateX(${-y*7}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave',()=>{card.style.transform='';});
  });
})();

// Lazy Img
(function initLazyImg(){
  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const img=e.target;
          if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}
          obs.unobserve(img);
        }
      });
    },{rootMargin:'200px'});
    document.querySelectorAll('img[data-src]').forEach(img=>obs.observe(img));
  }
})();

// Auto-focus Dose Slider
(()=>{
  const orig=typeof go==='function'?go:null;
  if(orig){
    window._origGo=orig;
    window.go=function(p,...args){
      const r=window._origGo(p,...args);
      if(p==='dose'){
        setTimeout(()=>{
          const slider=document.getElementById('prof-weight-slider');
          if(slider)slider.focus({preventScroll:true});
        },350);
      }
      return r;
    };
  }
})();

// Search Active Indicator
(()=>{
  const search=document.getElementById('search');
  const list=document.getElementById('list');
  if(!search||!list) return;
  search.addEventListener('input',()=>{
    list.style.transition='opacity .12s';
    list.style.opacity='.55';
    clearTimeout(search._fadeTimer);
    search._fadeTimer=setTimeout(()=>{list.style.opacity='1';},180);
  });
})();

// Counters Home
(function initHpCounters(){
  const els=document.querySelectorAll('.hp-stat-n');
  if(!els.length) return;
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting||e.target._done) return;
      e.target._done=true;
      const el=e.target;
      const raw=el.textContent;
      const num=parseInt(raw.replace(/\D/g,''));
      const suffix=raw.replace(/[\d]/g,'');
      if(!num) return;
      let cur=0;
      const steps=24;
      const inc=num/steps;
      let step=0;
      const timer=setInterval(()=>{
        step++;cur=Math.min(Math.round(inc*step),num);
        el.textContent=cur+suffix;
        if(step>=steps)clearInterval(timer);
      },30);
      obs.unobserve(el);
    });
  },{threshold:.5});
  els.forEach(el=>obs.observe(el));
})();

// Version Label
(() => {
  const versionEl = document.getElementById('version-trigger');
  if (versionEl) {
    let clicks = 0;
    versionEl.addEventListener('click', () => {
      clicks++;
      if (clicks === 7) {
        toggleAdminMode();
        clicks = 0;
      }
      // Feedback visual sutil (opcional)
      versionEl.style.opacity = 0.5 + (clicks * 0.07);
    });
  }
  
  // Verifica se deve mostrar a seção ao carregar
  setTimeout(() => {
    const sec = document.getElementById('admin-section');
    if (sec) {
      if (S.cfg.isAdmin) {
        sec.style.setProperty('display', 'block', 'important');
      }
    }
  }, 500);
})();

// Smooth scroll nav
document.querySelectorAll('.sb-nav .nt').forEach(btn=>{
  btn.style.transition='all .18s cubic-bezier(.4,0,.2,1)';
});


// ══════════════ INITIALIZATION ══════════════
load();
document.body.setAttribute('data-theme',S.cfg.theme||'dark');
document.querySelectorAll('.th-opt').forEach(el=>el.classList.remove('on'));
document.getElementById('th-'+(S.cfg.theme||'dark'))?.classList.add('on');
applyCfg();
syncCfgThemeGrid();
renderAll();
initHist();

const isFirstVisit=!localStorage.getItem(STORAGE_KEY);
if(isFirstVisit){
  go('home');
} else if(S.tab&&S.tab!=='lista'){
  go(S.tab);
}

const lsSaveEl=document.getElementById('last-save');
if(lsSaveEl&&S.lastSave)lsSaveEl.textContent='Salvo no Dispositivo às '+new Date(S.lastSave).toLocaleTimeString('pt-BR');

const ls2El=document.getElementById('ls2');
if(ls2El&&S.lastSave){
  const txt=ls2El.querySelector('span:last-child');
  if(txt)txt.textContent='Sincronizado às '+new Date(S.lastSave).toLocaleTimeString('pt-BR');
}

// ═══════════════ APP VERSION ═══════════════
const verFooter=document.getElementById('version-footer');
if(verFooter)verFooter.textContent=APP_VERSION;
const verConfig=document.getElementById('version-config');
if(verConfig)verConfig.textContent=APP_VERSION;
// ═════════════════════════════════════════

// ═════════════ TERMS DYNAMIC DATES ════════
const termsUpdatedEl=document.getElementById('terms-updated-date');
if(termsUpdatedEl)termsUpdatedEl.textContent=getTermsUpdatedDate();
const termsRevisionEl=document.getElementById('terms-revision-date');
if(termsRevisionEl)termsRevisionEl.textContent=getTermsRevisionDate();
// ═════════════════════════════════════════