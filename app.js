const games=window.GAMES||[];
const endpoint='/api/votes';
const voteKey='salsa-squad-jueguitos-votes-v4';
const legacyVoteKey='salsa-squad-jueguitos-vote-v3';
let counts={},filter='all',query='',busy=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const count=id=>Math.max(0,Number(counts[id]||0)||0);
const total=()=>games.reduce((a,g)=>a+count(g.id),0);
function myVotes(){
  try{
    const raw=localStorage.getItem(voteKey);
    if(raw){
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed))return new Set(parsed.filter(Boolean));
    }
    const legacy=localStorage.getItem(legacyVoteKey);
    if(legacy){
      const migrated=new Set([legacy]);
      localStorage.setItem(voteKey,JSON.stringify([...migrated]));
      return migrated;
    }
  }catch(e){}
  return new Set();
}
function saveVotes(set){try{localStorage.setItem(voteKey,JSON.stringify([...set]))}catch(e){}}
function moneyUSD(n){if(n==null)return'—';return Number(n)===0?'Gratis':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n))}
function moneyMXN(n){if(n==null)return'—';return Number(n)===0?'Gratis':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(n))}
function reviewNum(g){const m=String(g.reviewTotal||'').match(/\d+/);return m?Number(m[0]):0}
function has(g,x){return(g.flags||[]).some(v=>v.toLowerCase()===x.toLowerCase())}
function eligible(g,n){return g.minPlayers<=n&&g.maxPlayers>=n}
function matches(g){if(query){const hay=[g.name,g.summary,g.fit,...(g.category||[]),...(g.flags||[])].join(' ').toLowerCase();if(!hay.includes(query.toLowerCase()))return false}switch(filter){case'4':return eligible(g,4);case'5':return eligible(g,5);case'6':return eligible(g,6);case'free':return Number(g.priceUSD)===0;case'budget10':return(g.priceUSD??999)<=10;case'strong90':return reviewNum(g)>=90;case'vanilla':return!has(g,'Mods')&&!has(g,'Server');case'mods':return has(g,'Mods')||has(g,'Server');default:return true}}
function score(g){const fit=g.group.length>=3?3:g.group.length?2:0;return fit+reviewNum(g)/100-(g.priceUSD||0)/100+(has(g,'Sale')?1:0)}
function sorted(list){const mode=$('#sortSelect').value;return[...list].sort((a,b)=>mode==='votes'?count(b.id)-count(a.id)||a.name.localeCompare(b.name):mode==='price'?(a.priceUSD??999)-(b.priceUSD??999)||a.name.localeCompare(b.name):mode==='review'?reviewNum(b)-reviewNum(a)||a.name.localeCompare(b.name):mode==='name'?a.name.localeCompare(b.name):score(b)-score(a)||a.name.localeCompare(b.name))}
function saleLine(g,cur){const reg=cur==='USD'?g.priceUSD:g.priceMXN, sale=cur==='USD'?g.discountUSD:g.discountMXN;if(sale&&reg!=null&&sale<reg){const pct=Math.round((1-sale/reg)*100);return`Oferta: ${cur==='USD'?moneyUSD(sale):moneyMXN(sale)} · -${pct}%`}return'Sin oferta registrada'}
function image(g){return g.steamAppId?`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.steamAppId}/header.jpg`:''}
function tags(g){let t=[`<span class="tag">${g.minPlayers}–${g.maxPlayers} jugadores</span>`];if(Number(g.priceUSD)===0)t.push('<span class="tag good">Gratis</span>');else if((g.priceUSD??999)<=10)t.push('<span class="tag good">Budget</span>');if(g.caution)t.push('<span class="tag warn">Atención</span>');if(!g.group.length)t.push('<span class="tag bad">No ideal para 4–6</span>');return t.join('')}
function chips(g){return[`<span class="chip review">${g.reviewTotal} total</span>`,g.reviewRecent&&g.reviewRecent!=='—'?`<span class="chip">${g.reviewRecent} reciente</span>`:'',`<span class="chip">${g.reviewLabel}</span>`,...(g.category||[]).map(x=>`<span class="chip">${x}</span>`),...(g.flags||[]).map(x=>`<span class="chip ${/mods|server/i.test(x)?'mods':''}">${x}</span>`)].filter(Boolean).join('')}
function card(g){const mine=myVotes().has(g.id), src=image(g);return`<article class="card"><div class="cover-wrap ${src?'':'no-image'}">${src?`<img class="cover" loading="lazy" src="${src}" alt="${g.name}" onerror="this.parentElement.classList.add('no-image');this.remove()">`:''}<div class="fallback-title">${g.name}</div><div class="overlay-tags">${tags(g)}</div></div><div class="card-body"><div class="title-row"><div><h3>${g.name}</h3><div class="fit">${g.fit}</div></div><div class="vote-badge">${count(g.id)} ${count(g.id)===1?'voto':'votos'}</div></div><div class="chips">${chips(g)}</div><div class="prices"><div class="price-box"><div class="label">Steam EE. UU.</div><div class="value">${moneyUSD(g.priceUSD)}</div><div class="sale">${saleLine(g,'USD')}</div></div><div class="price-box"><div class="label">Steam México</div><div class="value">${moneyMXN(g.priceMXN)}</div><div class="sale">${saleLine(g,'MXN')}</div></div></div><p class="summary">${g.summary}</p>${g.caution?`<div class="caution">${g.caution}</div>`:''}<div class="actions"><a class="btn store" target="_blank" rel="noopener" href="${g.steamUrl}">Ver tienda</a><button class="btn vote ${mine?'mine':''}" data-vote="${g.id}" ${busy?'disabled':''}>${mine?'Votado · Quitar':'Votar'}</button></div></div></article>`}
function renderGames(){const list=sorted(games.filter(matches));$('#shownCount').textContent=`${list.length} juegos`;$('#gameGrid').innerHTML=list.length?list.map(card).join(''):'<div class="loading-card">No hay juegos con ese filtro.</div>'}
function renderBoard(){const selected=myVotes();const top=[...games].sort((a,b)=>count(b.id)-count(a.id)||a.name.localeCompare(b.name)).slice(0,5);$('#leaderboard').innerHTML=top.map((g,i)=>`<div class="rank"><div class="pos">#${i+1}</div><strong>${g.name}</strong><div class="votes">${count(g.id)} ${count(g.id)===1?'voto':'votos'}</div><div class="muted small">${g.fit}</div></div>`).join('');$('#metricVotes').textContent=total();$('#totalVotesLabel').textContent=`${total()} ${total()===1?'voto':'votos'}`;const mine=$('#metricMine');if(mine)mine.textContent=selected.size}
function render(){renderBoard();renderGames()}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function setLive(ok,text){$('#liveDot').classList.toggle('off',!ok);$('#liveText').textContent=text}
async function loadVotes(silent=false){try{const r=await fetch(endpoint,{cache:'no-store'});const text=await r.text();if(r.ok)counts=text?JSON.parse(text):{};else throw new Error('HTTP '+r.status+' '+text);setLive(true,'Resultados en vivo')}catch(e){console.error(e);setLive(false,'Juegos visibles · votos sin conexión');if(!silent)toast('Los juegos cargaron; los votos no respondieron')}render()}
async function change(id){if(busy)return;const selected=myVotes();const removing=selected.has(id);busy=true;renderGames();try{if(removing){if(count(id)>0)await inc(id,-1);selected.delete(id);saveVotes(selected);toast('Voto retirado')}else{await inc(id,1);selected.add(id);saveVotes(selected);toast('Voto registrado')}await loadVotes(true)}catch(e){console.error(e);toast('Error de voto: '+String(e.message||e).slice(0,120));await loadVotes(true)}finally{busy=false;render()}}
async function inc(id,by){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,by})});const text=await r.text();if(!r.ok)throw new Error('HTTP '+r.status+' '+text);try{return JSON.parse(text)}catch{return {success:true}}}
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderGames()});
$('#searchInput').addEventListener('input',e=>{query=e.target.value;renderGames()});
$('#sortSelect').addEventListener('change',renderGames);
$('#gameGrid').addEventListener('click',e=>{const b=e.target.closest('[data-vote]');if(b)change(b.dataset.vote)});
$('#metricGames').textContent=games.length;$('#metricFree').textContent=games.filter(g=>Number(g.priceUSD)===0).length;
render();loadVotes();setInterval(()=>loadVotes(true),10000);