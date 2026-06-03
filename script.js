(function(){
  // TMPCL: remove old browser/local prototype data from earlier versions.
  // Current website reads/writes real data from Supabase only.
  try {
    const oldKeys = [
      'tmpclRegistrations','tmpclMessages','tmpclTeams','tmpclGallery','tmpclNews','tmpclPartners','tmpclLeadership','tmpclSettings','tmpclAdmin','lastTmpclRegistrationId'
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).forEach(k => { if (/^tmpcl/i.test(k)) localStorage.removeItem(k); });
    // Session storage is used only for TMPCL Team login/tab UI, not public data.
  } catch (e) {}
  const SUPABASE_URL = 'https://ybfrnvkikhtlouocobnk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_sAoJrKNHTQGsmhbu5oOapw_DgpJf-A3';
  const CASHFREE_MODE = 'production'; // Cashfree live mode: Supabase CASHFREE_ENV must also be production.
  const REGISTRATION_FEE = 999;
  const TMPCL_FIXED_FEE_TEXT = '₹999';
  const PLAYER_CARD_TEMPLATE = 'player-registration-card-template.png';
  const STORAGE_BUCKETS = {
    playerPhoto: 'player-photos',
    idProof: 'id-proofs',
    teamLogo: 'team-logos',
    squadBanner: 'squad-banners',
    gallery: 'gallery-media',
    partnerLogo: 'partner-logos',
    leadershipPhoto: 'leadership-photos',
    newsImage: 'news-images'
  };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page || '';
  $$('.links a, .bottom-nav a').forEach(a => { if(a.dataset.nav === page) a.classList.add('active'); });
  const hamb = $('.hamb'), links = $('.links');
  if(hamb && links) hamb.addEventListener('click', () => links.classList.toggle('open'));

  const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = () => new Date().toLocaleString('en-IN');
  const REGISTRATION_YEAR = new Date().getFullYear();
  const formatRegistrationId = n => `TMPCL-${REGISTRATION_YEAR}-${String(Math.max(1, Number(n) || 1)).padStart(4,'0')}`;
  async function generateRegistrationId(){
    const prefix = `TMPCL-${REGISTRATION_YEAR}-`;
    let nextNo = 1;
    try{
      const rows = await selectRows('players', `select=id&id=like.${encodeURIComponent(prefix + '*')}&order=id.desc&limit=200`);
      const re = new RegExp(`^TMPCL-${REGISTRATION_YEAR}-(\\d+)$`);
      rows.forEach(r => {
        const m = String(r.id || '').match(re);
        if(m) nextNo = Math.max(nextNo, parseInt(m[1],10) + 1);
      });
    }catch(e){
      nextNo = parseInt(Date.now().toString().slice(-4), 10) || 1;
    }
    return formatRegistrationId(nextNo);
  }
  const ageFromDob = dob => { if(!dob) return 0; const b=new Date(dob), t=new Date(); let a=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0 || (m===0 && t.getDate()<b.getDate())) a--; return a; };
  const initials = (name, fallback='TM') => (name||fallback).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || fallback;


  const cleanUrl = (url='') => {
    const v = String(url || '').trim();
    if(!v) return '';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };
  const youtubeEmbedUrl = (url='') => {
    const value = cleanUrl(url);
    if(!value) return '';
    try{
      const u = new URL(value);
      const host = u.hostname.replace(/^www\./,'').toLowerCase();
      let id = '';
      if(host === 'youtu.be') id = u.pathname.split('/').filter(Boolean)[0] || '';
      if(host.includes('youtube.com')){
        if(u.pathname.startsWith('/shorts/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
        if(u.pathname.startsWith('/embed/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
        if(!id) id = u.searchParams.get('v') || '';
      }
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }catch(e){ return ''; }
  };


  function formatDateSafe(value){
    if(!value) return '';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN');
  }

  function buildRegistrationSlip(reg){
    const rows = [
      ['Registration ID', reg.id || 'TMPCL-XXXX'],
      ['Player Name', reg.name || ''],
      ['Mobile', reg.mobile || ''],
      ['City / District', reg.city || ''],
      ['Trial Location', reg.trial_location || reg.trialLocation || ''],
      ['Date of Birth', reg.dob || ''],
      ['Age Group', reg.age_group || reg.ageGroup || ''],
      ['Playing Role', reg.role || ''],
      ['Registration Fee', '₹' + (reg.fee || '999')],
      ['Payment Status', reg.payment_status || 'Pending'],
      ['Current Status', 'Registered for Trials']
    ];
    return `<div class="registration-slip-card" id="registrationSlipCard">
      <div class="slip-head">
        <img src="tmpcl-logo.png" alt="TMPCL">
        <div>
          <small>TMPCL Registration Confirmation Slip</small>
          <h3>Registered for Trials</h3>
          <p>Trial venue, date and reporting time will be announced officially.</p>
        </div>
      </div>
      <div class="slip-grid">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      <div class="slip-note"><strong>Important:</strong> This is a registration confirmation slip, not final trial pass. Final trial pass/admit card will be issued after venue, date and reporting time are officially announced.</div>
      <div class="slip-actions"><button type="button" class="btn" id="printSlipBtn">Print / Save Slip</button></div>
    </div>`;
  }


  function buildRegistrationSocialCard(reg){
    const playerName = reg.name || 'TMPCL Player';
    const registrationId = reg.id || 'TMPCL-XXXX';
    const role = reg.role || 'Player';
    const trialLocation = reg.trial_location || reg.trialLocation || '-';
    const category = reg.assigned_category || (String(reg.age_group||'').toLowerCase()==='u19' ? 'D Category (U19)' : 'Category Pending');
    const photoUrl = reg.photo_url || '';
    const photoHtml = photoUrl
      ? `<img src="${esc(photoUrl)}" alt="${esc(playerName)}" crossorigin="anonymous">`
      : `<div class="registration-poster-photo-placeholder">Player Photo</div>`;
    return `<div class="social-card-wrap">
      <div class="social-card-head">
        <div>
          <small>Instagram Registration Card</small>
          <h3>Your TMPCL social media card is ready</h3>
          <p>Download karke Instagram, WhatsApp Status aur Facebook par share kar sakte hain.</p>
        </div>
        <button type="button" class="btn" id="downloadPlayerCardBtn">Download Instagram Card</button>
      </div>
      <div class="registration-poster-preview">
        <div class="registration-poster-card" id="registrationPosterCard" aria-label="TMPCL Registration Social Card">
          <img class="registration-poster-template" src="${PLAYER_CARD_TEMPLATE}" alt="TMPCL registration card template">
          <div class="registration-poster-photo">${photoHtml}</div>
          <div class="registration-poster-value autofit-text name" data-max="22" data-min="12">${esc(playerName)}</div>
          <div class="registration-poster-value autofit-text regid" data-max="18" data-min="11">${esc(registrationId)}</div>
          <div class="registration-poster-value autofit-text role" data-max="18" data-min="11">${esc(role)}</div>
          <div class="registration-poster-value autofit-text location" data-max="18" data-min="11">${esc(trialLocation)}</div>
          <div class="registration-poster-value autofit-text category" data-max="17" data-min="10">${esc(category)}</div>
        </div>
      </div>
      <p class="muted social-card-note">Card me TMPCL logo aur website QR pre-built hai. Player photo aur details automatically website data se fill hongi.</p>
    </div>`;
  }

  function fitTextToBox(el){
    if(!el) return;
    const max = Number(el.dataset.max || 28);
    const min = Number(el.dataset.min || 13);
    let size = max;
    el.style.fontSize = `${size}px`;
    while(size > min && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)){
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }

  function applyRegistrationCardAutoFit(root){
    if(!root) return;
    root.querySelectorAll('.autofit-text').forEach(fitTextToBox);
  }

  async function downloadRegistrationCard(){
    const card = $('#registrationPosterCard');
    if(!card) return;
    if(typeof html2canvas !== 'function'){
      alert('Card download library load nahi hui. Please refresh and try again.');
      return;
    }
    const btn = $('#downloadPlayerCardBtn');
    if(btn) setLoading(btn,true,'Preparing Card...');
    try{
      applyRegistrationCardAutoFit(card);
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        scale: 2
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `TMPCL-Registration-Card-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }catch(err){
      console.error('Registration card download failed', err);
      alert('Card download nahi ho paya. Please try again.');
    }finally{
      if(btn) setLoading(btn,false);
    }
  }

  function printRegistrationSlip(){
    const slip = $('#registrationSlipCard');
    if(!slip) return;
    const win = window.open('', '_blank');
    if(!win) { alert('Popup blocked. Please allow popup to print slip.'); return; }
    win.document.write(`<!doctype html><html><head><title>TMPCL Registration Slip</title><style>
      body{margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#07111b}.registration-slip-card{max-width:760px;margin:auto;background:#fff;border:1px solid #dbe3ee;border-radius:22px;padding:22px;box-shadow:0 14px 40px rgba(0,0,0,.08)}.slip-head{display:flex;gap:16px;align-items:center;border-bottom:1px solid #e8edf4;padding-bottom:16px;margin-bottom:16px}.slip-head img{width:80px;height:80px;object-fit:contain}.slip-head small{font-weight:800;color:#16802f;text-transform:uppercase}.slip-head h3{margin:6px 0;font-size:30px}.slip-head p{margin:0;color:#586574}.slip-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.slip-grid div{border:1px solid #e8edf4;border-radius:14px;padding:12px}.slip-grid span{display:block;font-size:12px;color:#667386;text-transform:uppercase;font-weight:800}.slip-grid strong{display:block;margin-top:5px;font-size:17px}.slip-note{margin-top:16px;padding:14px;border-radius:14px;background:#fff7d8;border:1px solid #f1d06d;color:#3b2a00}.slip-actions{display:none}@media print{body{background:#fff}.registration-slip-card{box-shadow:none}}</style></head><body>${slip.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(), 350);
  }

  function rowsToCsv(rows){
    return rows.map(row=>row.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  }

  function downloadCsv(filename, regs){
    const header = ['Registration ID','Name','Mobile','City','Trial Location','DOB','Age','Age Group','Role','Batting','Bowling','Experience','Email','Payment Status','Assigned Category','Fee','Created At'];
    const body = regs.map(r=>[r.id,r.name,r.mobile,r.city,r.trial_location,r.dob,r.age,r.age_group,r.role,r.batting,r.bowling,r.experience,r.email,r.payment_status,r.assigned_category,r.fee,r.created_at]);
    const csv = rowsToCsv([header, ...body]);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }


  function ensureProfileModal(){
    let modal = $('#profileModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'profile-modal';
    modal.innerHTML = `
      <div class="profile-modal-backdrop" data-close-profile></div>
      <div class="profile-modal-panel" role="dialog" aria-modal="true" aria-label="TMPCL Profile Preview">
        <button class="profile-modal-close" type="button" aria-label="Close" data-close-profile>×</button>
        <div class="profile-modal-media"><img alt="TMPCL profile" id="profileModalImage" src=""/></div>
        <div class="profile-modal-copy">
          <small id="profileModalType">TMPCL Profile</small>
          <h3 id="profileModalName">Profile Name</h3>
          <div class="designation" id="profileModalDesignation">TMPCL Team</div>
          <p id="profileModalBio">Profile details will appear here.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    $$('[data-close-profile]', modal).forEach(el=>el.addEventListener('click',()=>modal.classList.remove('open')));
    modal.addEventListener('click', e=>{ if(e.target === modal) modal.classList.remove('open'); });
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') modal.classList.remove('open'); });
    return modal;
  }

  function openProfileModal(data={}){
    const modal = ensureProfileModal();
    const img = $('#profileModalImage', modal);
    const type = $('#profileModalType', modal);
    const name = $('#profileModalName', modal);
    const designation = $('#profileModalDesignation', modal);
    const bio = $('#profileModalBio', modal);
    if(type) type.textContent = data.type || 'TMPCL Profile';
    if(name) name.textContent = data.name || 'TMPCL Profile';
    if(designation) designation.textContent = data.designation || data.type || 'TMPCL Team';
    if(bio) bio.textContent = data.bio || 'Official profile details.';
    if(img){
      if(data.photo){
        img.src = data.photo;
        img.alt = (data.name || 'TMPCL Profile') + ' photo';
        img.style.display = 'block';
      }else{
        img.removeAttribute('src');
        img.alt = 'TMPCL Profile';
        img.style.display = 'none';
      }
    }
    modal.classList.add('open');
  }

  function bindProfileCards(scope){
    if(!scope) return;
    $$('[data-profile-card]', scope).forEach(card=>{
      card.addEventListener('click', e=>{
        if(e.target.closest('a,button,input,select,textarea')) return;
        openProfileModal({
          photo: card.dataset.photo || '',
          type: card.dataset.type || 'TMPCL Profile',
          name: card.dataset.name || 'TMPCL Profile',
          designation: card.dataset.designation || card.dataset.type || 'TMPCL Team',
          bio: card.dataset.bio || 'Official profile details.'
        });
      });
    });
  }

  async function api(path, options={}){
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}),
        ...(options.headers || {})
      }
    });
    if(!res.ok){
      let text = await res.text().catch(()=>res.statusText);
      throw new Error(text || res.statusText);
    }
    if(res.status === 204) return null;
    return res.json().catch(()=>null);
  }

  async function selectRows(table, query='select=*'){
    const sep = query ? '?' : '';
    return await api(`/rest/v1/${table}${sep}${query}`) || [];
  }
  async function insertRow(table, row){
    const result = await api(`/rest/v1/${table}`, {method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(row)});
    return Array.isArray(result) ? result[0] : result;
  }
  async function updateRow(table, id, row){
    const result = await api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(row)});
    return Array.isArray(result) ? result[0] : result;
  }
  async function deleteRow(table, id){
    return await api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {method:'DELETE'});
  }
  async function saveRow(table, row){
    const id = row.id;
    if(!id) throw new Error('Missing row ID');
    const exists = await selectRows(table, `select=id&id=eq.${encodeURIComponent(id)}&limit=1`).catch(()=>[]);
    return exists.length ? updateRow(table, id, row) : insertRow(table, row);
  }
  async function uploadFile(bucket, input, prefix){
    if(!input || !input.files || !input.files[0]) return '';
    const file = input.files[0];
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi,'-').toLowerCase();
    const path = `${prefix}/${Date.now()}-${safe}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method:'POST',
      headers:{apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${SUPABASE_ANON_KEY}`, 'x-upsert':'true', 'Content-Type':file.type || 'application/octet-stream'},
      body:file
    });
    if(!res.ok){
      const text = await res.text().catch(()=>res.statusText);
      throw new Error(text || 'File upload failed');
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  }

  function showSuccess(el, html){ if(el){ el.style.display='block'; el.innerHTML=html; } }
  function setLoading(btn, isLoading, text='Saving...'){
    if(!btn) return;
    if(isLoading){ btn.dataset.oldText = btn.innerHTML; btn.innerHTML = text; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.oldText || btn.innerHTML; btn.disabled = false; }
  }
  function showDbError(where, err){
    console.error(`TMPCL ${where}:`, err);
    const msg = (err && err.message) ? err.message : String(err);
    const lower = msg.toLowerCase();
    let hint = 'Details check karein.';
    if(lower.includes('relation') || lower.includes('column') || lower.includes('schema')){
      hint = 'Database table/column issue lag raha hai. Supabase SQL migration check karein.';
    }else if(lower.includes('functions/v1') || lower.includes('edge function') || lower.includes('not found') || lower.includes('404')){
      hint = 'Cashfree Supabase Edge Function deploy nahi hui ya URL/config issue hai.';
    }else if(lower.includes('cashfree') || lower.includes('payment_session_id')){
      hint = 'Cashfree keys / Edge Function response check karein.';
    }
    alert(`${where} error. ${hint}\n\n${msg.slice(0,300)}`);
  }

  async function createCashfreeOrder(regRecord){
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-cashfree-order`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        registration_id: regRecord.id,
        amount: 999,
        customer_name: regRecord.name || '',
        customer_phone: regRecord.mobile || '',
        customer_email: regRecord.email || '',
        return_url: `${location.origin}${location.pathname.replace(/[^/]*$/, '')}checkout.html?rid=${encodeURIComponent(regRecord.id)}`
      })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || data.message || 'Cashfree order create nahi hua. Supabase Edge Function aur Cashfree secrets check karein.');
    return data;
  }

  function openSquadBanner(team){
    $('#squadBannerModal')?.remove();
    const modal=document.createElement('div');
    modal.id='squadBannerModal'; modal.className='squad-banner-modal';
    const logo = team.logo_url || team.logo || '';
    const banner = team.squad_banner_url || team.squadBanner || '';
    modal.innerHTML=`<div class="squad-modal-backdrop" data-close-squad="1"></div><div class="squad-modal-card"><button class="squad-modal-close" data-close-squad="1" type="button">×</button><div class="squad-modal-head"><div>${logo?`<img src="${esc(logo)}" style="width:58px;height:58px;object-fit:cover;border-radius:14px;margin-bottom:10px">`:''}<small>Official Squad Banner</small><h3>${esc(team.name)}</h3><p>${esc(team.city||'')} · ${esc(team.status||'Player Auction Pending')}</p></div></div>${banner?`<img class="squad-banner-img" src="${esc(banner)}" alt="${esc(team.name)} squad banner">`:``}<div class="squad-modal-actions"><button class="btn ghost" data-close-squad="1" type="button">Close</button>${banner?`<a class="btn" href="${esc(banner)}" target="_blank" rel="noopener">View Full Size</a>`:''}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-squad]').forEach(el=>el.addEventListener('click',()=>modal.remove()));
  }

  async function renderPublicTeams(){
    const grid=$('#teamsGrid'); if(!grid) return;
    try{
      const teams = await selectRows('teams','select=*&order=created_at.asc');
      const section = grid.closest('.teams-showcase-section');
      if(section) section.classList.toggle('is-hidden', teams.length === 0);
      grid.innerHTML = teams.map(team=>{
        const logo=team.logo_url?`<img src="${esc(team.logo_url)}" alt="${esc(team.name)} logo">`:`<span>${initials(team.name)}</span>`;
        const hasBanner = !!(team.squad_banner_url || team.squadBanner);
        return `<article class="team-card" data-team-id="${esc(team.id)}"><div class="team-card-head"><div class="team-logo-box">${logo}</div><div><h3>${esc(team.name)}</h3><div class="team-city">${esc(team.city||'')}</div><span class="team-status">${esc(team.status||'Player Auction Pending')}</span></div></div><div class="team-meta-row"><div class="team-meta"><strong>18</strong><span>Total Squad</span></div><div class="team-meta"><strong>A-5</strong><span>Category A</span></div><div class="team-meta"><strong>D-3</strong><span>Only U19</span></div></div>${hasBanner?`<button class="btn ghost team-toggle" type="button">View Squad</button>`:''}</article>`;
      }).join('') || '';
      $$('.team-card', grid).forEach(card=>card.addEventListener('click',()=>{ const team=teams.find(t=>t.id===card.dataset.teamId); if(team && (team.squad_banner_url || team.squadBanner)) openSquadBanner(team); }));
    } catch(err){ console.error(err); }
  }

  async function renderPublicPartners(){
    const grid=$('#publishedPartnersGrid'); if(!grid) return;
    try{
      const published = await selectRows('partners', 'select=*&status=eq.Published&order=created_at.desc');
      const section = grid.closest('.published-partners-section');
      if(section) section.classList.toggle('is-hidden', published.length === 0);
      const empty=$('#partnersEmpty'); if(empty) empty.style.display='none';
      grid.innerHTML=published.map(p=>{ const logo=p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(p.name)} logo">`:`<span>${initials(p.name,'TP')}</span>`; const link=p.link?`<a href="${esc(p.link)}" target="_blank" rel="noopener" class="mini-btn">Visit Link</a>`:''; return `<article class="partner-public-card"><div class="partner-public-logo">${logo}</div><div><span class="tag">${esc(p.category||'Partner')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p>${link}</div></article>`; }).join('');
    } catch(err){ console.error(err); }
  }

  async function renderPublicNews(){
    const newsList=$('#newsList'); if(!newsList) return;
    try{
      const posts = await selectRows('news_updates','select=*&order=date.desc,created_at.desc');
      const section = newsList.closest('.section');
      if(section) section.classList.toggle('is-hidden', posts.length === 0);
      const empty=$('#newsEmpty'); if(empty) empty.style.display='none';
      newsList.innerHTML=posts.map(p=>{ const img=p.image_url?`<div class="thumb news-thumb-img" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url('${esc(p.image_url)}')"></div>`:`<div class="thumb"></div>`; const date=p.date?`<small class="muted">${esc(p.date)}</small>`:''; return `<article class="card news-card">${img}<div><span class="tag">${esc(p.tag||'Update')}</span><h3>${esc(p.title)}</h3>${date}<p>${esc(p.summary||'')}</p></div></article>`; }).join('');
    } catch(err){ console.error(err); }
  }


  async function renderHomePreviews(){
    const newsEl=$('#homeNewsPreview'), galleryEl=$('#homeGalleryPreview'), partnersEl=$('#homePartnersPreview');
    if(!newsEl && !galleryEl && !partnersEl) return;
    try{
      let visiblePreviews = 0;
      if(newsEl){
        const posts = await selectRows('news_updates','select=*&order=date.desc,created_at.desc&limit=1');
        const has = !!posts[0];
        newsEl.textContent = has ? posts[0].title : '';
        newsEl.closest('.home-preview-card')?.classList.toggle('is-hidden', !has);
        if(has) visiblePreviews++;
      }
      if(galleryEl){
        const media = await selectRows('gallery_media','select=*&order=created_at.desc&limit=1');
        const has = !!media[0];
        galleryEl.textContent = has ? media[0].title : '';
        galleryEl.closest('.home-preview-card')?.classList.toggle('is-hidden', !has);
        if(has) visiblePreviews++;
      }
      if(partnersEl){
        const partners = await selectRows('partners','select=*&status=eq.Published&order=created_at.desc&limit=1');
        const has = !!partners[0];
        partnersEl.textContent = has ? partners[0].name : '';
        partnersEl.closest('.home-preview-card')?.classList.toggle('is-hidden', !has);
        if(has) visiblePreviews++;
      }
      const previewSection = document.querySelector('.home-live-preview-section');
      if(previewSection) previewSection.classList.toggle('is-hidden', visiblePreviews === 0);
    } catch(err){ console.error(err); }
  }

  async function renderPublicGallery(){
    const galleryGrid=$('#galleryGrid'); if(!galleryGrid) return;
    const empty=$('#galleryEmpty'), modal=$('#galleryModal'), title=$('#galleryModalTitle'), visual=modal?modal.querySelector('.gallery-modal-visual'):null, desc=modal?modal.querySelector('p'):null;
    let allItems=[];
    try{ allItems = await selectRows('gallery_media','select=*&order=created_at.desc'); }catch(err){ console.error(err); }
    const section = galleryGrid.closest('.gallery-main-section');
    const filters = section ? section.querySelector('.filters') : document.querySelector('.filters');
    if(section) section.classList.toggle('is-hidden', allItems.length === 0);
    if(filters) filters.classList.toggle('is-hidden', allItems.length === 0);
    const closeGalleryModal = () => {
      if(!modal) return;
      modal.classList.remove('open');
      if(visual){ visual.innerHTML=''; visual.style.backgroundImage=''; }
      document.body.classList.remove('modal-open');
    };
    function card(item){ const bg=item.image_url?`style="background-image:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.76)),url('${esc(item.image_url)}')"`:''; const play=item.type==='videos'||item.url?'<div class="play">▶</div>':''; const date=item.date?`<p>${esc(item.date)}</p>`:''; return `<article class="card media-card" data-id="${esc(item.id)}" data-type="${esc(item.category)}" ${bg}>${play}<div class="label"><span class="tag">${esc(item.category || item.type || 'media')}</span><h3>${esc(item.title)}</h3>${date}</div></article>`; }
    function openItem(item){
      if(!item||!modal) return;
      const url = cleanUrl(item.url || '');
      const isVideo = (item.type === 'videos') || !!url;
      const embed = isVideo ? youtubeEmbedUrl(url) : '';
      if(title) title.textContent=item.title||'TMPCL Media';
      if(visual){
        visual.style.backgroundImage = (!embed && item.image_url) ? `linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url('${item.image_url}')` : '';
        if(embed){
          visual.innerHTML = `<iframe class="gallery-video-frame" src="${esc(embed)}" title="${esc(item.title || 'TMPCL video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        } else if(isVideo && url){
          visual.innerHTML = `<div class="gallery-video-link-box"><div class="play modal-play">▶</div><a class="btn gold" href="${esc(url)}" target="_blank" rel="noopener">Open Video Link</a></div>`;
        } else {
          visual.innerHTML = item.image_url ? '' : '<span class="muted">TMPCL Media</span>';
        }
      }
      if(desc){
        desc.innerHTML = url ? `<a class="gallery-modal-link" href="${esc(url)}" target="_blank" rel="noopener">Open video / reel link</a>` : '';
      }
      modal.classList.add('open');
      document.body.classList.add('modal-open');
    }
    function render(filter='all'){
      const items=allItems.filter(item=>filter==='all'||item.category===filter||(filter==='videos'&&item.type==='videos'));
      galleryGrid.innerHTML=items.map(card).join('');
      if(empty) empty.style.display='none';
      $$('.media-card',galleryGrid).forEach(c=>c.addEventListener('click',()=>openItem(allItems.find(g=>g.id===c.dataset.id))));
    }
    render();
    $$('.filter, .filter-btn').forEach(btn=>btn.addEventListener('click',()=>{ $$('.filter, .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.filter); }));
    if(modal){
      modal.addEventListener('click', e=>{ if(e.target === modal) closeGalleryModal(); });
      $$('[data-close-gallery], .gallery-modal-close', modal).forEach(x=>x.addEventListener('click',closeGalleryModal));
      document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && modal.classList.contains('open')) closeGalleryModal(); });
    }
  }

  async function renderPublicLeadership(){
    const home=$('#homeFounderCard'), about=$('#aboutLeadershipGrid'), sel=$('#selectionPanelGrid'), empty=$('#selectionPanelEmpty'), amb=$('#homeAmbassadorGrid');
    if(!home && !about && !sel && !amb) return;
    try{
      const leaders = await selectRows('leadership_panel','select=*&order=created_at.asc');
      const founder = leaders.find(x=>(x.type||'').includes('Founder')) || leaders.find(x=>!/(Ambassador|Selector|Coach|Advisor)/i.test(x.type||'')) || leaders[0];
      const ambassadors = leaders.filter(x=>/Ambassador/i.test(x.type||''));
      const selectors = leaders.filter(x=>/(Selector|Coach|Advisor)/i.test(x.type||''));
      const card = p => { const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.name)}">`:`<span>${initials(p.name)}</span>`; return `<article class="leader-card auto-profile-card" data-profile-card="true" data-photo="${esc(p.photo_url||'')}" data-type="${esc(p.type||'TMPCL Leadership')}" data-name="${esc(p.name||'Name Coming Soon')}" data-designation="${esc(p.designation||p.type||'TMPCL Team')}" data-bio="${esc(p.bio||'')}" title="Tap to view full profile"><div class="leader-photo">${photo}</div><div class="leader-copy"><small>${esc(p.type||'TMPCL Leadership')}</small><h3>${esc(p.name||'Name Coming Soon')}</h3><div class="designation">${esc(p.designation||p.type||'TMPCL Team')}</div>${p.bio?`<p>${esc(p.bio)}</p>`:''}<span class="profile-view-hint">Tap to view full photo</span></div></article>`; };
      const ambassadorCard = (p,i) => { const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.name)}">`:`<span>BA</span>`; return `<article class="ambassador-card ${i%2?'featured':''} auto-profile-card" data-profile-card="true" data-photo="${esc(p.photo_url||'')}" data-type="${esc(p.type||'Brand Ambassador')}" data-name="${esc(p.name||'Brand Ambassador')}" data-designation="${esc(p.designation||'Brand Ambassador, TMPCL')}" data-bio="${esc(p.bio||'Supporting TMPCL mission to promote tennis ball cricket talent across Madhya Pradesh.')}" title="Tap to view full profile"><div class="ambassador-photo dynamic-ambassador-photo">${photo}</div><div class="ambassador-copy"><small>${esc(p.designation||'Brand Ambassador, TMPCL')}</small><h3>${esc(p.name||'Brand Ambassador')}</h3><p>${esc(p.bio||'Supporting TMPCL mission to promote tennis ball cricket talent across Madhya Pradesh.')}</p><div class="ambassador-tags"><span>Official Face</span><span>TMPCL</span><span>Talent Support</span></div><span class="profile-view-hint">Tap to view full photo</span></div></article>`; };
      if(home && founder) { home.innerHTML = card(founder); bindProfileCards(home); }
      if(about) { about.innerHTML = leaders.filter(x=>(x.type||'').includes('Founder')).map(card).join('') || (founder?card(founder):''); bindProfileCards(about); }
      if(amb){ amb.innerHTML = ambassadors.length ? ambassadors.slice(0,2).map(ambassadorCard).join('') : ''; bindProfileCards(amb); }
      if(sel){ sel.innerHTML = selectors.map(card).join(''); if(empty) empty.style.display=selectors.length?'none':'block'; bindProfileCards(sel); }
    } catch(err){ console.error(err); }
  }

  function setupRegistration(){
    const regFee=$('#regFee'), regTotal=$('#regTotal');
    if(regFee) regFee.textContent='₹' + REGISTRATION_FEE;
    if(regTotal) regTotal.textContent='₹' + REGISTRATION_FEE;

    const dob=$('#dobInput'), ageGroup=$('#ageGroupSelect'), ageGroupHidden=$('#ageGroupHidden');
    const roleSelect=$('#roleSelect');
    const battingField=$('#battingStyleField'), bowlingField=$('#bowlingStyleField');
    const battingSelect=$('#battingStyleSelect'), bowlingSelect=$('#bowlingStyleSelect');

    function updateAgeGroup(){
      if(!dob || !ageGroup) return;
      const age=ageFromDob(dob.value);
      let group='';
      let label='DOB ke baad auto-set hoga';
      if(dob.value && age >= 0){
        if(age <= 19){
          group = 'U19';
          label = 'D Category (U19 Trials)';
        } else {
          group = 'Open';
          label = 'Open Trials (A/B/C after trials)';
        }
      }
      ageGroup.value = label;
      if(ageGroupHidden) ageGroupHidden.value = group;
      ageGroup.setAttribute('readonly','readonly');
      ageGroup.setAttribute('aria-readonly','true');
    }

    function updateRoleFields(){
      const role = roleSelect?.value || '';
      if(!battingField || !bowlingField) return;

      battingField.classList.remove('field-hidden');
      bowlingField.classList.remove('field-hidden');
      if(battingSelect) battingSelect.disabled = false;
      if(bowlingSelect) bowlingSelect.disabled = false;

      if(role === 'Batsman'){
        bowlingField.classList.add('field-hidden');
        if(bowlingSelect){ bowlingSelect.value = 'Not Applicable'; bowlingSelect.disabled = true; }
      } else if(role === 'Bowler'){
        battingField.classList.add('field-hidden');
        if(battingSelect){ battingSelect.value = 'Not Applicable'; battingSelect.disabled = true; }
      } else if(role === 'All-Rounder'){
        if(battingSelect && battingSelect.value === 'Not Applicable') battingSelect.value = 'Right Hand';
        if(bowlingSelect && bowlingSelect.value === 'Not Applicable') bowlingSelect.value = 'Right Arm Medium';
      }
    }

    dob?.addEventListener('input',updateAgeGroup);
    dob?.addEventListener('change',updateAgeGroup);
    roleSelect?.addEventListener('change',updateRoleFields);
    updateAgeGroup();
    updateRoleFields();


    const regForm=$('#registrationForm');
    if(!regForm) return;
    regForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const btn=regForm.querySelector('button[type="submit"]');
      setLoading(btn,true,'Saving Registration...');
      try{
        updateAgeGroup();
        updateRoleFields();

        const data=Object.fromEntries(new FormData(regForm).entries());
        if(battingSelect?.disabled) data.batting = 'Not Applicable';
        if(bowlingSelect?.disabled) data.bowling = 'Not Applicable';

        const age=ageFromDob(data.dob);
        const photoInput=regForm.querySelector('input[name="photo"]');
        const proofInput=regForm.querySelector('input[name="aadhaar"]');

        if(!data.name) throw new Error('Full Name mandatory hai.');
        if(!data.mobile) throw new Error('Mobile Number mandatory hai.');
        if(!data.city) throw new Error('City / District mandatory hai.');
        if(!data.trialLocation) throw new Error('Trial Location select karein.');
        if(!data.dob) throw new Error('Date of Birth mandatory hai.');
        if(!data.ageGroup) data.ageGroup = age <= 19 ? 'U19' : 'Open';
        if(!data.role) throw new Error('Playing Role select karein.');
        if(!photoInput || !photoInput.files.length) throw new Error('Player photo upload mandatory hai.');
        if(!proofInput || !proofInput.files.length) throw new Error('Aadhaar / ID Proof upload mandatory hai.');
        data.ageGroup = age <= 19 ? 'U19' : 'Open';

        const id=await generateRegistrationId();

        // Important flow:
        // 1) Upload documents + create Payment Pending player record first.
        // 2) Redirect to checkout.html where Cashfree order is created by Supabase Edge Function.
        // 3) Final Paid status must be updated by secure payment verification, not by browser-only code.
        setLoading(btn,true,'Saving Registration...');
        const photoUrl=await uploadFile(STORAGE_BUCKETS.playerPhoto, photoInput, id);
        const proofUrl=await uploadFile(STORAGE_BUCKETS.idProof, proofInput, id);

        const pendingRecord={
          id,
          name:data.name,
          mobile:data.mobile,
          city:data.city,
          trial_location:data.trialLocation,
          dob:data.dob,
          age,
          age_group:data.ageGroup,
          role:data.role,
          batting:data.batting || 'Not Applicable',
          bowling:data.bowling || 'Not Applicable',
          experience:data.experience,
          email:data.email||'',
          photo_url:photoUrl,
          proof_url:proofUrl,
          fee:999,
          payment_amount:999,
          payment_currency:'INR',
          assigned_category: age <= 19 ? 'D Category (U19)' : 'Category Pending (A/B/C after trials)',
          payment_status:'Payment Pending'
        };

        await insertRow('players', pendingRecord);

        const successBox = $('#regSuccess');
        showSuccess(successBox, `<strong>Registration saved.</strong><br>Ab Cashfree checkout par payment complete karein. Official Registration ID payment successful hone ke baad show hogi.<br><br><a class="btn" href="checkout.html?rid=${encodeURIComponent(id)}">Proceed to Cashfree Checkout →</a>`);
        regForm.reset();
        updateAgeGroup();
        updateRoleFields();
        window.location.href = `checkout.html?rid=${encodeURIComponent(id)}`;
      } catch(err){
        showDbError('Registration / Payment', err);
      }
      finally{ setLoading(btn,false); }
    });
  }


  function getQueryParam(name){
    return new URLSearchParams(location.search).get(name) || '';
  }

  async function loadPlayerById(id){
    const rows = await selectRows('players', `select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] || null;
  }

  function renderCheckoutSummary(reg){
    const box = $('#checkoutSummary');
    if(!box) return;
    const isPaid = String(reg.payment_status || '').toLowerCase() === 'paid';
    box.innerHTML = `<div class="checkout-summary-grid">
      ${isPaid ? `<div><span>Registration ID</span><strong>${esc(reg.id || '')}</strong></div>` : ''}
      <div><span>Player Name</span><strong>${esc(reg.name || '')}</strong></div>
      <div><span>Mobile</span><strong>${esc(reg.mobile || '')}</strong></div>
      <div><span>City</span><strong>${esc(reg.city || '')}</strong></div>
      <div><span>Trial Location</span><strong>${esc(reg.trial_location || '')}</strong></div>
      <div><span>Role</span><strong>${esc(reg.role || '')}</strong></div>
      <div><span>Payment Status</span><strong>${esc(reg.payment_status || 'Payment Pending')}</strong></div>
      <div><span>Gateway</span><strong>Cashfree</strong></div>
      <div><span>Total Amount</span><strong>${TMPCL_FIXED_FEE_TEXT}</strong></div>
    </div>${!isPaid ? '<p class="muted id-lock-note">Official Registration ID payment successful hone ke baad show hogi.</p>' : ''}`;
    document.querySelectorAll('.checkout-total strong, #regFee, #regTotal').forEach(el=>{ el.textContent = TMPCL_FIXED_FEE_TEXT; });
  }

  async function verifyCashfreePayment(registrationId, orderId){
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-cashfree-payment`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({registration_id: registrationId, order_id: orderId || ''})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || data.message || 'Cashfree payment verify nahi hua.');
    return data;
  }

  function setupCheckout(){
    const pageBox = $('#checkoutPage');
    if(!pageBox) return;
    const rid = getQueryParam('rid') || getQueryParam('registration_id');
    const orderId = getQueryParam('order_id') || getQueryParam('cf_order_id');
    const payBtn = $('#cashfreePayBtn');
    const statusBox = $('#checkoutStatus');
    const printBox = $('#checkoutPrintArea');

    async function showStatus(html){ showSuccess(statusBox, html); }

    (async()=>{
      try{
        if(!rid) throw new Error('Registration link missing hai. Pehle registration form submit karein.');
        let reg = await loadPlayerById(rid);
        if(!reg) throw new Error('Registration record nahi mila. Link check karein ya TMPCL support se contact karein.');
        renderCheckoutSummary(reg);

        if(orderId && reg.payment_status !== 'Paid'){
          await showStatus('Payment status verify ho raha hai...');
          await verifyCashfreePayment(rid, orderId);
          reg = await loadPlayerById(rid) || reg;
          renderCheckoutSummary(reg);
        }

        if(reg.payment_status === 'Paid'){
          if(payBtn) payBtn.style.display='none';
          if(printBox){
            printBox.innerHTML = buildRegistrationSlip(reg) + buildRegistrationSocialCard(reg);
            $('#printSlipBtn')?.addEventListener('click', printRegistrationSlip);
            $('#downloadPlayerCardBtn')?.addEventListener('click', downloadRegistrationCard);
            requestAnimationFrame(()=>applyRegistrationCardAutoFit($('#registrationPosterCard')));
          }
          await showStatus(`<strong>Payment successful. Registration confirmed!</strong><br>Registration ID: <strong>${esc(reg.id)}</strong><br>Amount: ₹${REGISTRATION_FEE}<br>Instagram player card download ab available hai.`);
          return;
        }

        if(payBtn){
          payBtn.disabled = false;
          payBtn.addEventListener('click', async()=>{
            setLoading(payBtn,true,'Opening Cashfree...');
            try{
              if(!window.Cashfree) throw new Error('Cashfree SDK load nahi hua. Internet connection check karein.');
              const order = await createCashfreeOrder(reg);
              const paymentSessionId = order.payment_session_id || order.paymentSessionId;
              if(!paymentSessionId) throw new Error('Cashfree payment_session_id missing hai. Edge Function response check karein.');
              const cashfreeMode = order.env || order.mode || CASHFREE_MODE;
              const cashfree = Cashfree({mode: cashfreeMode});
              await cashfree.checkout({paymentSessionId: String(paymentSessionId), redirectTarget:'_self'});
            }catch(err){
              showDbError('Cashfree Checkout', err);
            }finally{ setLoading(payBtn,false); }
          });
        }
      }catch(err){
        showDbError('Checkout', err);
        if(payBtn) payBtn.disabled = true;
      }
    })();
  }

  function setupContact(){
    const contactForm=$('#contactForm');
    if(contactForm){ contactForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=contactForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const d=Object.fromEntries(new FormData(contactForm).entries()); await insertRow('contact_enquiries',{name:d.name,mobile:d.mobile,email:d.email||'',enquiry_type:d.enquiryType||'General Support',message:d.message||''}); showSuccess($('#contactSuccess'), '<strong>Message sent successfully.</strong> TMPCL will contact you soon.'); contactForm.reset(); } catch(err){ showDbError('Contact enquiry',err); } finally{ setLoading(btn,false); } }); }
    const partnerForm=$('#partnerForm');
    if(partnerForm){ partnerForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=partnerForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const d=Object.fromEntries(new FormData(partnerForm).entries()); await insertRow('partner_enquiries',{name:d.name||d.partnerName||'',brand:d.brand||d.company||d.companyName||'',category:d.category||d.partnerCategory||d.partnershipCategory||'',mobile:d.mobile||d.phone||'',email:d.email||'',message:d.message||''}); showSuccess($('#partnerSuccess'), '<strong>Partnership enquiry submitted.</strong> TMPCL will contact you soon.'); partnerForm.reset(); } catch(err){ showDbError('Partnership enquiry',err); } finally{ setLoading(btn,false); } }); }
  }

  async function dashboardData(){
    const [regs,teams,gallery,news,partners,partnerEnq,msgs,leaders] = await Promise.all([
      selectRows('players','select=*&order=created_at.desc'),
      selectRows('teams','select=*&order=created_at.asc'),
      selectRows('gallery_media','select=*&order=created_at.desc'),
      selectRows('news_updates','select=*&order=created_at.desc'),
      selectRows('partners','select=*&order=created_at.desc'),
      selectRows('partner_enquiries','select=*&order=created_at.desc'),
      selectRows('contact_enquiries','select=*&order=created_at.desc'),
      selectRows('leadership_panel','select=*&order=created_at.asc')
    ]);
    return {regs,teams,gallery,news,partners,partnerEnq,msgs,leaders};
  }

  async function renderDashboard(){
    if(page !== 'dashboard') return;
    try{
      const {regs,teams,gallery,news,partners,partnerEnq,msgs,leaders} = await dashboardData();
      const paidRegs = regs.filter(r => String(r.payment_status || '').toLowerCase() === 'paid');
      const setText=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
      setText('#statRegistrations', paidRegs.length); setText('#statTeams', teams.length); setText('#statSquadBanners', teams.filter(t=>t.squad_banner_url).length); setText('#statU19', paidRegs.filter(r=>r.age_group==='U19').length); setText('#statGallery', gallery.length); setText('#statNews', news.length); setText('#statPartners', partners.filter(p=>p.status==='Published').length); setText('#statPartnerEnquiries', partnerEnq.length); setText('#statContactEnquiries', msgs.length);

      const teamTb=$('#adminTeamsTable tbody'); if(teamTb){ $('#emptyTeams').style.display=teams.length?'none':'block'; teamTb.innerHTML=teams.map(t=>{ const logo=t.logo_url?`<img src="${esc(t.logo_url)}" style="width:42px;height:42px;border-radius:12px;object-fit:cover">`:`<strong>${initials(t.name)}</strong>`; const banner=t.squad_banner_url?`<span class="badge ok">Uploaded</span>`:`<span class="badge muted-badge">Not Added</span>`; return `<tr><td>${logo}</td><td>${esc(t.name)}</td><td>${esc(t.city||'')}</td><td>${esc(t.owner||'')}</td><td>${esc(t.status||'')}</td><td>${banner}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-team="${esc(t.id)}">Edit</button><button class="mini-btn" data-preview-team="${esc(t.id)}">Preview</button><button class="mini-btn danger" data-delete-team="${esc(t.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-team]',teamTb).forEach(btn=>btn.addEventListener('click',()=>{ const t=teams.find(x=>x.id===btn.dataset.editTeam); if(!t) return; $('#teamId').value=t.id; $('#teamName').value=t.name; $('#teamCity').value=t.city||''; $('#teamOwner').value=t.owner||''; $('#teamStatus').value=t.status||'Player Auction Pending'; showSuccess($('#teamSuccess'), '<strong>Edit mode:</strong> Change fields and click Save / Update Team. Existing files remain unless new files are uploaded.'); document.querySelector('.admin-tab-panel.active')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
        $$('[data-preview-team]',teamTb).forEach(btn=>btn.addEventListener('click',()=>{ const t=teams.find(x=>x.id===btn.dataset.previewTeam); if(t) openSquadBanner(t); }));
        $$('[data-delete-team]',teamTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this team?')) return; await deleteRow('teams',btn.dataset.deleteTeam); renderDashboard(); })); }

      const pTb=$('#partnersAdminTable tbody'); if(pTb){ $('#emptyPartnersAdmin').style.display=partners.length?'none':'block'; pTb.innerHTML=partners.map(p=>{ const logo=p.logo_url?`<img src="${esc(p.logo_url)}" style="width:44px;height:44px;border-radius:12px;object-fit:cover">`:`<strong>${initials(p.name,'TP')}</strong>`; return `<tr><td>${logo}</td><td>${esc(p.name)}</td><td>${esc(p.category||'')}</td><td>${esc(p.status||'')}</td><td>${p.link?`<a href="${esc(p.link)}" target="_blank">Open</a>`:''}</td><td>${esc(p.description||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-partner="${esc(p.id)}">Edit</button><button class="mini-btn danger" data-delete-partner="${esc(p.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-partner]',pTb).forEach(btn=>btn.addEventListener('click',()=>{ const p=partners.find(x=>x.id===btn.dataset.editPartner); if(!p) return; $('#partnerId').value=p.id; $('#partnerName').value=p.name; $('#partnerCategory').value=p.category||'Title Sponsor'; $('#partnerLink').value=p.link||''; $('#partnerDescription').value=p.description||''; $('#partnerStatus').value=p.status||'Published'; showSuccess($('#partnerManageSuccess'), '<strong>Edit mode:</strong> Change fields and click Publish / Update Partner.'); document.querySelector('.admin-tab-panel.active')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
        $$('[data-delete-partner]',pTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this partner?')) return; await deleteRow('partners',btn.dataset.deletePartner); renderDashboard(); })); }

      const galleryTb=$('#galleryAdminTable tbody'); if(galleryTb){ $('#emptyGalleryAdmin').style.display=gallery.length?'none':'block'; galleryTb.innerHTML=gallery.map(g=>{ const img=g.image_url?`<img src="${esc(g.image_url)}" style="width:58px;height:42px;border-radius:8px;object-fit:cover">`:''; return `<tr><td>${img}</td><td>${esc(g.title)}</td><td>${esc(g.type||'')}</td><td>${esc(g.category||'')}</td><td>${esc(g.date||'')}</td><td>${g.url?`<a href="${esc(g.url)}" target="_blank">Open</a>`:''}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-gallery="${esc(g.id)}">Edit</button><button class="mini-btn danger" data-delete-gallery="${esc(g.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-gallery]',galleryTb).forEach(btn=>btn.addEventListener('click',()=>{ const g=gallery.find(x=>x.id===btn.dataset.editGallery); if(!g) return; $('#mediaId').value=g.id; $('#mediaTitle').value=g.title; $('#mediaType').value=g.type||'photos'; $('#mediaCategory').value=g.category||'events'; $('#mediaDate').value=g.date||''; $('#mediaUrl').value=g.url||''; showSuccess($('#gallerySuccess'), '<strong>Edit mode:</strong> Update fields and save. Existing thumbnail remains unless new image is uploaded.'); document.querySelector('.admin-tab-panel.active')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
        $$('[data-delete-gallery]',galleryTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this media?')) return; await deleteRow('gallery_media',btn.dataset.deleteGallery); renderDashboard(); })); }

      const newsTb=$('#newsAdminTable tbody'); if(newsTb){ $('#emptyNewsAdmin').style.display=news.length?'none':'block'; newsTb.innerHTML=news.map(n=>{ const img=n.image_url?`<img src="${esc(n.image_url)}" style="width:58px;height:42px;border-radius:8px;object-fit:cover">`:''; return `<tr><td>${img}</td><td>${esc(n.title)}</td><td>${esc(n.tag||'')}</td><td>${esc(n.date||'')}</td><td>${esc(n.summary||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-news="${esc(n.id)}">Edit</button><button class="mini-btn danger" data-delete-news="${esc(n.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-news]',newsTb).forEach(btn=>btn.addEventListener('click',()=>{ const n=news.find(x=>x.id===btn.dataset.editNews); if(!n) return; $('#newsId').value=n.id; $('#newsTitle').value=n.title; $('#newsTag').value=n.tag||'Announcement'; $('#newsDate').value=n.date||''; $('#newsSummary').value=n.summary||''; showSuccess($('#newsSuccess'), '<strong>Edit mode:</strong> Update fields and save.'); document.querySelector('.admin-tab-panel.active')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
        $$('[data-delete-news]',newsTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this news?')) return; await deleteRow('news_updates',btn.dataset.deleteNews); renderDashboard(); })); }

      const lTb=$('#leadershipAdminTable tbody'); if(lTb){ $('#emptyLeadershipAdmin').style.display=leaders.length?'none':'block'; lTb.innerHTML=leaders.map(p=>{const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.name)}">`:`<span>${initials(p.name)}</span>`; return `<tr><td><div class="leader-thumb">${photo}</div></td><td>${esc(p.name||'')}</td><td>${esc(p.type||'')}</td><td>${esc(p.designation||'')}</td><td>${esc(p.bio||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-leader="${esc(p.id)}">Edit</button><button class="mini-btn danger" data-delete-leader="${esc(p.id)}">Delete</button></div></td></tr>`;}).join('');
        $$('[data-edit-leader]',lTb).forEach(btn=>btn.addEventListener('click',()=>{ const p=leaders.find(x=>x.id===btn.dataset.editLeader); if(!p) return; $('#personId').value=p.id; $('#personName').value=p.name||''; $('#personType').value=p.type||'Selector'; $('#personDesignation').value=p.designation||''; $('#personBio').value=p.bio||''; showSuccess($('#leadershipSuccess'), '<strong>Edit mode:</strong> Details change karke Save / Update Profile par click karein.'); document.querySelector('.admin-tab-panel.active')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
        $$('[data-delete-leader]',lTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this profile?')) return; await deleteRow('leadership_panel',btn.dataset.deleteLeader); renderDashboard(); })); }

      const regTb=$('#regTable tbody');
      if(regTb){
        const search=$('#regSearch'), ageFilter=$('#regAgeFilter'), roleFilter=$('#regRoleFilter');
        const filteredRegs = () => {
          const q=(search?.value||'').toLowerCase().trim();
          const ageVal=ageFilter?.value||'all';
          const roleVal=roleFilter?.value||'all';
          return paidRegs.filter(r=>{
            const hay=[r.id,r.name,r.mobile,r.city,r.trial_location,r.role,r.age_group,r.assigned_category].join(' ').toLowerCase();
            const matchQ=!q || hay.includes(q);
            const matchAge=ageVal==='all' || r.age_group===ageVal;
            const matchRole=roleVal==='all' || r.role===roleVal;
            return matchQ && matchAge && matchRole;
          });
        };
        const drawRegs = () => {
          const list=filteredRegs();
          $('#emptyRegs').style.display=list.length?'none':'block';
          regTb.innerHTML=list.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.name||'')}</td><td>${esc(r.mobile||'')}</td><td>${esc(r.city||'')}</td><td>${esc(r.trial_location||'')}</td><td>${esc(r.dob||'')}</td><td>${esc(r.age||'')}</td><td>${esc(r.role||'')}</td><td>${esc(r.age_group||'')}</td><td>${esc(r.payment_status||'Pending')}</td><td>${esc(r.assigned_category||'Pending until trials & auction')}</td><td>${r.photo_url?`<a href="${esc(r.photo_url)}" target="_blank">View</a>`:''}</td><td>${r.proof_url?`<a href="${esc(r.proof_url)}" target="_blank">View</a>`:''}</td><td>₹${esc(r.fee||'999')}</td><td>${esc(formatDateSafe(r.created_at)||'')}</td></tr>`).join('');
        };
        [search,ageFilter,roleFilter].forEach(el=>el?.addEventListener('input',drawRegs));
        [ageFilter,roleFilter].forEach(el=>el?.addEventListener('change',drawRegs));
        $('#exportAllRegs')?.addEventListener('click',()=>downloadCsv('tmpcl-paid-registrations.csv', paidRegs));
        $('#exportU19Regs')?.addEventListener('click',()=>downloadCsv('tmpcl-paid-u19-registrations.csv', paidRegs.filter(r=>r.age_group==='U19')));
        $('#exportOpenRegs')?.addEventListener('click',()=>downloadCsv('tmpcl-paid-open-registrations.csv', paidRegs.filter(r=>r.age_group==='Open')));
        $('#exportFilteredRegs')?.addEventListener('click',()=>downloadCsv('tmpcl-filtered-registrations.csv', filteredRegs()));
        drawRegs();
      }
      const msgTb=$('#msgTable tbody'); if(msgTb){ $('#emptyMsgs').style.display=msgs.length?'none':'block'; msgTb.innerHTML=msgs.map(m=>`<tr><td>${esc(m.name||'')}</td><td>${esc(m.mobile||'')}</td><td>${esc(m.email||'')}</td><td>${esc(m.enquiry_type||'General Support')}</td><td>${esc(m.message||'')}</td><td>${esc(m.created_at||'')}</td></tr>`).join(''); }
      const pEnqTb=$('#partnerEnquiriesTable tbody'); if(pEnqTb){ $('#emptyPartnerEnquiries').style.display=partnerEnq.length?'none':'block'; pEnqTb.innerHTML=partnerEnq.map(m=>`<tr><td>${esc(m.name||'')}</td><td>${esc(m.brand||'')}</td><td>${esc(m.category||'')}</td><td>${esc(m.mobile||'')}</td><td>${esc(m.email||'')}</td><td>${esc(m.message||'')}</td><td>${esc(m.created_at||'')}</td></tr>`).join(''); }
    } catch(err){ showDbError('Dashboard load',err); }
  }

  function setupDashboardForms(){
    if(page !== 'dashboard') return;
    const teamForm=$('#teamForm');
    if(teamForm){ teamForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=teamForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const fd=new FormData(teamForm); const id=fd.get('teamId')||('team-'+Date.now()); const old=(await selectRows('teams',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`))[0]||{}; const logo=await uploadFile(STORAGE_BUCKETS.teamLogo,$('#teamLogo'),id) || old.logo_url || ''; const banner=await uploadFile(STORAGE_BUCKETS.squadBanner,$('#squadBanner'),id) || old.squad_banner_url || ''; await saveRow('teams',{id,name:fd.get('teamName'),city:fd.get('teamCity'),owner:fd.get('teamOwner')||'',status:fd.get('teamStatus')||'Player Auction Pending',logo_url:logo,squad_banner_url:banner}); showSuccess($('#teamSuccess'), '<strong>Team saved successfully.</strong> Public Teams page par update show hoga.'); teamForm.reset(); $('#teamId').value=''; renderDashboard(); } catch(err){ showDbError('Team save',err); } finally{ setLoading(btn,false); } }); $('#teamFormReset')?.addEventListener('click',()=>{teamForm.reset(); $('#teamId').value=''; $('#teamSuccess').style.display='none';}); }

    const partnerManageForm=$('#partnerManageForm');
    if(partnerManageForm){ partnerManageForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=partnerManageForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const fd=new FormData(partnerManageForm); const id=fd.get('partnerId')||('partner-'+Date.now()); const old=(await selectRows('partners',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`))[0]||{}; const logo=await uploadFile(STORAGE_BUCKETS.partnerLogo,$('#partnerLogo'),id) || old.logo_url || ''; await saveRow('partners',{id,name:fd.get('partnerName'),category:fd.get('partnerCategory')||'Partner',link:fd.get('partnerLink')||'',description:fd.get('partnerDescription')||'',status:fd.get('partnerStatus')||'Published',logo_url:logo}); showSuccess($('#partnerManageSuccess'), '<strong>Partner saved successfully.</strong>'); partnerManageForm.reset(); $('#partnerId').value=''; renderDashboard(); } catch(err){ showDbError('Partner save',err); } finally{ setLoading(btn,false); } }); $('#partnerFormReset')?.addEventListener('click',()=>{partnerManageForm.reset(); $('#partnerId').value=''; $('#partnerManageSuccess').style.display='none';}); }

    const galleryForm=$('#galleryForm');
    if(galleryForm){ galleryForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=galleryForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const fd=new FormData(galleryForm); const id=fd.get('mediaId')||('media-'+Date.now()); const old=(await selectRows('gallery_media',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`))[0]||{}; const image=await uploadFile(STORAGE_BUCKETS.gallery,$('#mediaImage'),id) || old.image_url || ''; await saveRow('gallery_media',{id,title:fd.get('mediaTitle'),type:fd.get('mediaType')||'photos',category:fd.get('mediaCategory')||'events',date:fd.get('mediaDate')||null,url:fd.get('mediaUrl')||'',image_url:image}); showSuccess($('#gallerySuccess'), '<strong>Gallery media published.</strong>'); galleryForm.reset(); $('#mediaId').value=''; renderDashboard(); } catch(err){ showDbError('Gallery save',err); } finally{ setLoading(btn,false); } }); $('#galleryFormReset')?.addEventListener('click',()=>{galleryForm.reset(); $('#mediaId').value=''; $('#gallerySuccess').style.display='none';}); }

    const newsForm=$('#newsForm');
    if(newsForm){ newsForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=newsForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const fd=new FormData(newsForm); const id=fd.get('newsId')||('news-'+Date.now()); const old=(await selectRows('news_updates',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`))[0]||{}; const image=await uploadFile(STORAGE_BUCKETS.newsImage,$('#newsImage'),id) || old.image_url || ''; await saveRow('news_updates',{id,title:fd.get('newsTitle'),tag:fd.get('newsTag')||'Announcement',date:fd.get('newsDate')||null,summary:fd.get('newsSummary')||'',image_url:image}); showSuccess($('#newsSuccess'), '<strong>News published.</strong>'); newsForm.reset(); $('#newsId').value=''; renderDashboard(); } catch(err){ showDbError('News save',err); } finally{ setLoading(btn,false); } }); $('#newsFormReset')?.addEventListener('click',()=>{newsForm.reset(); $('#newsId').value=''; $('#newsSuccess').style.display='none';}); }

    const leadershipForm=$('#leadershipForm');
    if(leadershipForm){ leadershipForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=leadershipForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const fd=new FormData(leadershipForm); const id=fd.get('personId')||('leader-'+Date.now()); const old=(await selectRows('leadership_panel',`select=*&id=eq.${encodeURIComponent(id)}&limit=1`))[0]||{}; const photo=await uploadFile(STORAGE_BUCKETS.leadershipPhoto,$('#personPhoto'),id) || old.photo_url || ''; await saveRow('leadership_panel',{id,name:fd.get('personName'),type:fd.get('personType')||'Selector',designation:fd.get('personDesignation')||fd.get('personType'),bio:fd.get('personBio')||'',photo_url:photo}); showSuccess($('#leadershipSuccess'), '<strong>Profile saved successfully.</strong>'); leadershipForm.reset(); $('#personId').value=''; renderDashboard(); } catch(err){ showDbError('Leadership save',err); } finally{ setLoading(btn,false); } }); $('#leadershipFormReset')?.addEventListener('click',()=>{leadershipForm.reset(); $('#personId').value=''; $('#leadershipSuccess').style.display='none';}); }
  }


  const DEFAULT_SITE_SETTINGS = {
    id: 'main',
    footer_phone: '',
    footer_whatsapp: '',
    footer_email: '',
    footer_location: '',
    footer_social_text: ''
  };

  async function getSiteSettings(){
    try{
      const rows = await selectRows('site_settings', 'select=*&id=eq.main&limit=1');
      return {...DEFAULT_SITE_SETTINGS, ...(rows[0] || {})};
    } catch(err){
      console.warn('Site settings not loaded. Run updated supabase-schema.sql if needed.', err);
      return DEFAULT_SITE_SETTINGS;
    }
  }

  function applySiteSettings(settings){
    $$('[data-setting="footer_phone"]').forEach(el => el.textContent = settings.footer_phone || DEFAULT_SITE_SETTINGS.footer_phone);
    $$('[data-setting="footer_email"]').forEach(el => el.textContent = settings.footer_email || DEFAULT_SITE_SETTINGS.footer_email);
    $$('[data-setting="footer_location"]').forEach(el => el.textContent = settings.footer_location || DEFAULT_SITE_SETTINGS.footer_location);
    $$('[data-setting="footer_social_text"]').forEach(el => el.textContent = settings.footer_social_text || DEFAULT_SITE_SETTINGS.footer_social_text);
    const whatsappLinks = $$('[data-whatsapp-link], a[href*="wa.me"], .mobile-cta a:last-child');
    const whatsappNumber = String(settings.footer_whatsapp || '').replace(/\D/g,'');
    whatsappLinks.forEach(a => {
      const isMobileCta = a.closest('.mobile-cta');
      if(whatsappNumber){
        a.href = `https://wa.me/${whatsappNumber}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = '';
        if(isMobileCta) a.textContent = 'WhatsApp';
      } else if(a.matches('[data-whatsapp-link]')){
        a.href = '#';
        a.style.display = 'none';
      } else {
        a.href = 'contact.html';
        a.removeAttribute('target');
        a.removeAttribute('rel');
        a.style.display = '';
        if(isMobileCta) a.textContent = 'Contact';
      }
    });
  }

  async function initSiteSettings(){
    const settings = await getSiteSettings();
    applySiteSettings(settings);
    const form = $('#siteSettingsForm');
    if(form){
      $('#footerPhone').value = settings.footer_phone || '';
      $('#footerWhatsapp').value = settings.footer_whatsapp || '';
      $('#footerEmail').value = settings.footer_email || '';
      $('#footerLocation').value = settings.footer_location || '';
      $('#footerSocialText').value = settings.footer_social_text || '';
    }
  }

  function setupSiteSettingsForm(){
    const form = $('#siteSettingsForm');
    if(!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      setLoading(btn, true, 'Saving...');
      try{
        const fd = new FormData(form);
        const row = {
          id: 'main',
          footer_phone: fd.get('footerPhone') || '',
          footer_whatsapp: fd.get('footerWhatsapp') || '',
          footer_email: fd.get('footerEmail') || '',
          footer_location: fd.get('footerLocation') || '',
          footer_social_text: fd.get('footerSocialText') || ''
        };
        await saveRow('site_settings', row);
        applySiteSettings(row);
        showSuccess($('#settingsSuccess'), '<strong>Footer settings saved.</strong> Public website footer me update show hoga.');
      } catch(err){ showDbError('Footer settings save', err); }
      finally{ setLoading(btn, false); }
    });
  }

  // login remains local/session-only for current static version
  const loginForm=$('#adminLoginForm');
  if(loginForm){ loginForm.addEventListener('submit',e=>{ e.preventDefault(); const d=Object.fromEntries(new FormData(loginForm).entries()); if((d.username==='team' && d.password==='tmpcl123') || (d.username==='admin' && d.password==='admin123')){ sessionStorage.setItem('tmpclTeamAccess','1'); location.href='admin-dashboard.html'; } else { const s=$('#adminLoginError'); if(s){s.style.display='block'; s.textContent='Invalid login. Use team / tmpcl123';} } }); }
  if(page==='dashboard'){
    if(sessionStorage.getItem('tmpclTeamAccess')!=='1'){ location.href='admin-login.html'; return; }
    $('#logoutBtn')?.addEventListener('click',()=>{ sessionStorage.removeItem('tmpclTeamAccess'); location.href='admin-login.html'; });
  }



  function setupDashboardTabs(){
    if(page !== 'dashboard') return;
    const tabs = $$('.dash-tab');
    const panels = $$('.admin-tab-panel');
    if(!tabs.length || !panels.length) return;
    function activate(tabName){
      tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
      panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tabName));
      try{ sessionStorage.setItem('tmpclActiveDashboardTab', tabName); }catch(e){}
    }
    tabs.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.tab)));
    const saved = sessionStorage.getItem('tmpclActiveDashboardTab');
    if(saved && tabs.some(btn => btn.dataset.tab === saved)) activate(saved);
  }

  setupRegistration();
  setupCheckout();
  setupContact();
  setupDashboardForms();
  setupDashboardTabs();
  setupSiteSettingsForm();
  initSiteSettings();
  renderPublicTeams();
  renderPublicPartners();
  renderPublicNews();
  renderPublicGallery();
  renderPublicLeadership();
  renderHomePreviews();
  renderDashboard();
})();
