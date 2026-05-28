(function(){
  const SUPABASE_URL = 'https://ybfrnvkikhtlouocobnk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_sAoJrKNHTQGsmhbu5oOapw_DgpJf-A3';
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
  const makeId = p => p + '-' + Date.now().toString().slice(-7);
  const ageFromDob = dob => { if(!dob) return 0; const b=new Date(dob), t=new Date(); let a=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0 || (m===0 && t.getDate()<b.getDate())) a--; return a; };
  const initials = (name, fallback='TM') => (name||fallback).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || fallback;

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
    alert(`Database error in ${where}. Pehle supabase-schema.sql ko Supabase SQL Editor me run karein.\n\n${msg.slice(0,240)}`);
  }

  function openSquadBanner(team){
    $('#squadBannerModal')?.remove();
    const modal=document.createElement('div');
    modal.id='squadBannerModal'; modal.className='squad-banner-modal';
    const logo = team.logo_url || team.logo || '';
    const banner = team.squad_banner_url || team.squadBanner || '';
    modal.innerHTML=`<div class="squad-modal-backdrop" data-close-squad="1"></div><div class="squad-modal-card"><button class="squad-modal-close" data-close-squad="1" type="button">×</button><div class="squad-modal-head"><div>${logo?`<img src="${esc(logo)}" style="width:58px;height:58px;object-fit:cover;border-radius:14px;margin-bottom:10px">`:''}<small>Official Squad Banner</small><h3>${esc(team.name)}</h3><p>${esc(team.city||'')} · ${esc(team.status||'Player Auction Pending')}</p></div></div>${banner?`<img class="squad-banner-img" src="${esc(banner)}" alt="${esc(team.name)} squad banner">`:`<div class="squad-banner-placeholder"><div class="team-logo-box big"><span>${initials(team.name)}</span></div><h3>Squad Banner Coming Soon</h3><p>Player Auction complete hone ke baad TMPCL Team se squad banner/poster upload karne par yahan show hoga.</p></div>`}<div class="squad-modal-actions"><button class="btn ghost" data-close-squad="1" type="button">Close</button>${banner?`<a class="btn" href="${esc(banner)}" target="_blank" rel="noopener">View Full Size</a>`:''}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-squad]').forEach(el=>el.addEventListener('click',()=>modal.remove()));
  }

  async function renderPublicTeams(){
    const grid=$('#teamsGrid'); if(!grid) return;
    try{
      const teams = await selectRows('teams','select=*&order=created_at.asc');
      grid.innerHTML = teams.map(team=>{
        const logo=team.logo_url?`<img src="${esc(team.logo_url)}" alt="${esc(team.name)} logo">`:`<span>${initials(team.name)}</span>`;
        return `<article class="team-card" data-team-id="${esc(team.id)}"><div class="team-card-head"><div class="team-logo-box">${logo}</div><div><h3>${esc(team.name)}</h3><div class="team-city">${esc(team.city||'')}</div><span class="team-status">${esc(team.status||'Player Auction Pending')}</span></div></div><div class="team-meta-row"><div class="team-meta"><strong>18</strong><span>Total Squad</span></div><div class="team-meta"><strong>A-5</strong><span>Category A</span></div><div class="team-meta"><strong>D-3</strong><span>Only U19</span></div></div><button class="btn ghost team-toggle" type="button">View Squad</button></article>`;
      }).join('') || `<article class="card"><h3>Teams Coming Soon</h3><p class="muted">TMPCL Team se teams publish hone ke baad yahan show hongi.</p></article>`;
      $$('.team-card', grid).forEach(card=>card.addEventListener('click',()=>{ const team=teams.find(t=>t.id===card.dataset.teamId); if(team) openSquadBanner(team); }));
    } catch(err){ console.error(err); }
  }

  async function renderPublicPartners(){
    const grid=$('#publishedPartnersGrid'); if(!grid) return;
    try{
      const published = await selectRows('partners', 'select=*&status=eq.Published&order=created_at.desc');
      const empty=$('#partnersEmpty'); if(empty) empty.style.display=published.length?'none':'block';
      grid.innerHTML=published.map(p=>{ const logo=p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(p.name)} logo">`:`<span>${initials(p.name,'TP')}</span>`; const link=p.link?`<a href="${esc(p.link)}" target="_blank" rel="noopener" class="mini-btn">Visit Link</a>`:''; return `<article class="partner-public-card"><div class="partner-public-logo">${logo}</div><div><span class="tag">${esc(p.category||'Partner')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'Official TMPCL partner.')}</p>${link}</div></article>`; }).join('');
    } catch(err){ console.error(err); }
  }

  async function renderPublicNews(){
    const newsList=$('#newsList'); if(!newsList) return;
    try{
      const posts = await selectRows('news_updates','select=*&order=date.desc,created_at.desc');
      const empty=$('#newsEmpty'); if(empty) empty.style.display=posts.length?'none':'block';
      newsList.innerHTML=posts.map(p=>{ const img=p.image_url?`<div class="thumb news-thumb-img" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url('${esc(p.image_url)}')"></div>`:`<div class="thumb"></div>`; const date=p.date?`<small class="muted">${esc(p.date)}</small>`:''; return `<article class="card news-card">${img}<div><span class="tag">${esc(p.tag||'Update')}</span><h3>${esc(p.title)}</h3>${date}<p>${esc(p.summary||'')}</p></div></article>`; }).join('');
    } catch(err){ console.error(err); }
  }

  async function renderPublicGallery(){
    const galleryGrid=$('#galleryGrid'); if(!galleryGrid) return;
    const empty=$('#galleryEmpty'), modal=$('#galleryModal'), title=$('#galleryModalTitle'), visual=modal?modal.querySelector('.gallery-modal-visual'):null, desc=modal?modal.querySelector('p'):null;
    let allItems=[];
    try{ allItems = await selectRows('gallery_media','select=*&order=created_at.desc'); }catch(err){ console.error(err); }
    function card(item){ const bg=item.image_url?`style="background-image:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.76)),url('${esc(item.image_url)}')"`:''; const play=item.type==='videos'||item.url?'<div class="play">▶</div>':''; const date=item.date?`<p>${esc(item.date)}</p>`:'<p>TMPCL published media</p>'; return `<article class="card media-card" data-id="${esc(item.id)}" data-type="${esc(item.category)}" ${bg}>${play}<div class="label"><span class="tag">${esc(item.category)}</span><h3>${esc(item.title)}</h3>${date}</div></article>`; }
    function render(filter='all'){
      const items=allItems.filter(item=>filter==='all'||item.category===filter||(filter==='videos'&&item.type==='videos'));
      galleryGrid.innerHTML=items.map(card).join('');
      if(empty) empty.style.display=allItems.length?'none':'block';
      $$('.media-card',galleryGrid).forEach(c=>c.addEventListener('click',()=>{ const item=allItems.find(g=>g.id===c.dataset.id); if(!item||!modal) return; if(title) title.textContent=item.title||'TMPCL Media'; if(visual){ visual.innerHTML=item.type==='videos'||item.url?'<div class="play modal-play">▶</div>':''; visual.style.backgroundImage=item.image_url?`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url('${item.image_url}')`:''; } if(desc) desc.textContent=item.url?`Video/Reel Link: ${item.url}`:'TMPCL published gallery media.'; modal.classList.add('open'); }));
    }
    render();
    $$('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{ $$('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.filter); }));
    $$('[data-close-gallery]').forEach(x=>x.addEventListener('click',()=>modal?.classList.remove('open')));
  }

  async function renderPublicLeadership(){
    const home=$('#homeFounderCard'), about=$('#aboutLeadershipGrid'), sel=$('#selectionPanelGrid'), empty=$('#selectionPanelEmpty');
    if(!home && !about && !sel) return;
    try{
      const leaders = await selectRows('leadership_panel','select=*&order=created_at.asc');
      const founder = leaders.find(x=>(x.type||'').includes('Founder')) || leaders[0];
      const selectors = leaders.filter(x=>/(Selector|Coach|Advisor)/i.test(x.type||''));
      const card = p => { const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.name)}">`:`<span>${initials(p.name)}</span>`; return `<article class="leader-card"><div class="leader-photo">${photo}</div><div class="leader-copy"><small>${esc(p.type||'TMPCL Leadership')}</small><h3>${esc(p.name||'Name Coming Soon')}</h3><div class="designation">${esc(p.designation||p.type||'TMPCL Team')}</div><p>${esc(p.bio||'Profile details will be updated by TMPCL Team.')}</p></div></article>`; };
      if(home && founder) home.innerHTML = card(founder);
      if(about) about.innerHTML = leaders.filter(x=>(x.type||'').includes('Founder')).map(card).join('') || (founder?card(founder):'');
      if(sel){ sel.innerHTML = selectors.map(card).join(''); if(empty) empty.style.display=selectors.length?'none':'block'; }
    } catch(err){ console.error(err); }
  }

  function setupRegistration(){
    const regFee=$('#regFee'), regTotal=$('#regTotal'); if(regFee) regFee.textContent='₹999'; if(regTotal) regTotal.textContent='₹999';
    const dob=$('#dobInput'), ageGroup=$('#ageGroupSelect');
    if(dob && ageGroup){ dob.addEventListener('change',()=>{ const age=ageFromDob(dob.value); ageGroup.value = age && age<=19 ? 'U19' : 'Open'; }); }
    const regForm=$('#registrationForm');
    if(!regForm) return;
    regForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const btn=regForm.querySelector('button[type="submit"]'); setLoading(btn,true,'Saving...');
      try{
        const data=Object.fromEntries(new FormData(regForm).entries());
        const age=ageFromDob(data.dob); const photoInput=regForm.querySelector('input[name="photo"]'); const proofInput=regForm.querySelector('input[name="aadhaar"]');
        if(!data.dob) throw new Error('Date of Birth mandatory hai.');
        if(!photoInput || !photoInput.files.length) throw new Error('Player photo upload mandatory hai.');
        if(!proofInput || !proofInput.files.length) throw new Error('Aadhaar Card / Age Proof upload mandatory hai.');
        if(data.ageGroup==='U19' && age>19) throw new Error('U19 age group ke liye age 19 ya usse kam honi chahiye.');
        const id=makeId('TMPCL');
        const photoUrl=await uploadFile(STORAGE_BUCKETS.playerPhoto, photoInput, id);
        const proofUrl=await uploadFile(STORAGE_BUCKETS.idProof, proofInput, id);
        await insertRow('players',{id,name:data.name,mobile:data.mobile,city:data.city,dob:data.dob,age,age_group:data.ageGroup,role:data.role,batting:data.batting,bowling:data.bowling,experience:data.experience,email:data.email||'',photo_url:photoUrl,proof_url:proofUrl,fee:999,assigned_category:'Pending until trials & auction',payment_status:'Pending'});
        showSuccess($('#regSuccess'), `<strong>Registration saved successfully!</strong><br>Registration ID: <strong>${id}</strong><br>Amount: ₹999`);
        regForm.reset();
      } catch(err){ showDbError('Registration', err); }
      finally{ setLoading(btn,false); }
    });
  }

  function setupContact(){
    const contactForm=$('#contactForm');
    if(contactForm){ contactForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=contactForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const d=Object.fromEntries(new FormData(contactForm).entries()); await insertRow('contact_enquiries',{name:d.name,mobile:d.mobile,email:d.email||'',enquiry_type:d.enquiryType||'General Support',message:d.message||''}); showSuccess($('#contactSuccess'), '<strong>Message sent successfully.</strong> TMPCL Team will contact you soon.'); contactForm.reset(); } catch(err){ showDbError('Contact enquiry',err); } finally{ setLoading(btn,false); } }); }
    const partnerForm=$('#partnerForm');
    if(partnerForm){ partnerForm.addEventListener('submit', async e=>{ e.preventDefault(); const btn=partnerForm.querySelector('button[type="submit"]'); setLoading(btn,true); try{ const d=Object.fromEntries(new FormData(partnerForm).entries()); await insertRow('partner_enquiries',{name:d.name||d.partnerName||'',brand:d.brand||d.company||d.companyName||'',category:d.category||d.partnerCategory||d.partnershipCategory||'',mobile:d.mobile||d.phone||'',email:d.email||'',message:d.message||''}); showSuccess($('#partnerSuccess'), '<strong>Partnership enquiry submitted.</strong> TMPCL Team will contact you soon.'); partnerForm.reset(); } catch(err){ showDbError('Partnership enquiry',err); } finally{ setLoading(btn,false); } }); }
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
      const setText=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
      setText('#statRegistrations', regs.length); setText('#statTeams', teams.length); setText('#statSquadBanners', teams.filter(t=>t.squad_banner_url).length); setText('#statU19', regs.filter(r=>r.age_group==='U19').length); setText('#statGallery', gallery.length); setText('#statNews', news.length); setText('#statPartners', partners.filter(p=>p.status==='Published').length); setText('#statPartnerEnquiries', partnerEnq.length); setText('#statContactEnquiries', msgs.length);

      const teamTb=$('#adminTeamsTable tbody'); if(teamTb){ $('#emptyTeams').style.display=teams.length?'none':'block'; teamTb.innerHTML=teams.map(t=>{ const logo=t.logo_url?`<img src="${esc(t.logo_url)}" style="width:42px;height:42px;border-radius:12px;object-fit:cover">`:`<strong>${initials(t.name)}</strong>`; const banner=t.squad_banner_url?`<span class="badge ok">Uploaded</span>`:`<span class="badge muted-badge">Not Added</span>`; return `<tr><td>${logo}</td><td>${esc(t.name)}</td><td>${esc(t.city||'')}</td><td>${esc(t.owner||'')}</td><td>${esc(t.status||'')}</td><td>${banner}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-team="${esc(t.id)}">Edit</button><button class="mini-btn" data-preview-team="${esc(t.id)}">Preview</button><button class="mini-btn danger" data-delete-team="${esc(t.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-team]',teamTb).forEach(btn=>btn.addEventListener('click',()=>{ const t=teams.find(x=>x.id===btn.dataset.editTeam); if(!t) return; $('#teamId').value=t.id; $('#teamName').value=t.name; $('#teamCity').value=t.city||''; $('#teamOwner').value=t.owner||''; $('#teamStatus').value=t.status||'Player Auction Pending'; showSuccess($('#teamSuccess'), '<strong>Edit mode:</strong> Change fields and click Save / Update Team. Existing files remain unless new files are uploaded.'); window.scrollTo({top:0,behavior:'smooth'}); }));
        $$('[data-preview-team]',teamTb).forEach(btn=>btn.addEventListener('click',()=>{ const t=teams.find(x=>x.id===btn.dataset.previewTeam); if(t) openSquadBanner(t); }));
        $$('[data-delete-team]',teamTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this team?')) return; await deleteRow('teams',btn.dataset.deleteTeam); renderDashboard(); })); }

      const pTb=$('#partnersAdminTable tbody'); if(pTb){ $('#emptyPartnersAdmin').style.display=partners.length?'none':'block'; pTb.innerHTML=partners.map(p=>{ const logo=p.logo_url?`<img src="${esc(p.logo_url)}" style="width:44px;height:44px;border-radius:12px;object-fit:cover">`:`<strong>${initials(p.name,'TP')}</strong>`; return `<tr><td>${logo}</td><td>${esc(p.name)}</td><td>${esc(p.category||'')}</td><td>${esc(p.status||'')}</td><td>${p.link?`<a href="${esc(p.link)}" target="_blank">Open</a>`:''}</td><td>${esc(p.description||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-partner="${esc(p.id)}">Edit</button><button class="mini-btn danger" data-delete-partner="${esc(p.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-partner]',pTb).forEach(btn=>btn.addEventListener('click',()=>{ const p=partners.find(x=>x.id===btn.dataset.editPartner); if(!p) return; $('#partnerId').value=p.id; $('#partnerName').value=p.name; $('#partnerCategory').value=p.category||'Title Sponsor'; $('#partnerLink').value=p.link||''; $('#partnerDescription').value=p.description||''; $('#partnerStatus').value=p.status||'Published'; showSuccess($('#partnerManageSuccess'), '<strong>Edit mode:</strong> Change fields and click Publish / Update Partner.'); window.scrollTo({top:0,behavior:'smooth'}); }));
        $$('[data-delete-partner]',pTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this partner?')) return; await deleteRow('partners',btn.dataset.deletePartner); renderDashboard(); })); }

      const galleryTb=$('#galleryAdminTable tbody'); if(galleryTb){ $('#emptyGalleryAdmin').style.display=gallery.length?'none':'block'; galleryTb.innerHTML=gallery.map(g=>{ const img=g.image_url?`<img src="${esc(g.image_url)}" style="width:58px;height:42px;border-radius:8px;object-fit:cover">`:''; return `<tr><td>${img}</td><td>${esc(g.title)}</td><td>${esc(g.type||'')}</td><td>${esc(g.category||'')}</td><td>${esc(g.date||'')}</td><td>${g.url?`<a href="${esc(g.url)}" target="_blank">Open</a>`:''}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-gallery="${esc(g.id)}">Edit</button><button class="mini-btn danger" data-delete-gallery="${esc(g.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-gallery]',galleryTb).forEach(btn=>btn.addEventListener('click',()=>{ const g=gallery.find(x=>x.id===btn.dataset.editGallery); if(!g) return; $('#mediaId').value=g.id; $('#mediaTitle').value=g.title; $('#mediaType').value=g.type||'photos'; $('#mediaCategory').value=g.category||'events'; $('#mediaDate').value=g.date||''; $('#mediaUrl').value=g.url||''; showSuccess($('#gallerySuccess'), '<strong>Edit mode:</strong> Update fields and save. Existing thumbnail remains unless new image is uploaded.'); window.scrollTo({top:0,behavior:'smooth'}); }));
        $$('[data-delete-gallery]',galleryTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this media?')) return; await deleteRow('gallery_media',btn.dataset.deleteGallery); renderDashboard(); })); }

      const newsTb=$('#newsAdminTable tbody'); if(newsTb){ $('#emptyNewsAdmin').style.display=news.length?'none':'block'; newsTb.innerHTML=news.map(n=>{ const img=n.image_url?`<img src="${esc(n.image_url)}" style="width:58px;height:42px;border-radius:8px;object-fit:cover">`:''; return `<tr><td>${img}</td><td>${esc(n.title)}</td><td>${esc(n.tag||'')}</td><td>${esc(n.date||'')}</td><td>${esc(n.summary||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-news="${esc(n.id)}">Edit</button><button class="mini-btn danger" data-delete-news="${esc(n.id)}">Delete</button></div></td></tr>`; }).join('');
        $$('[data-edit-news]',newsTb).forEach(btn=>btn.addEventListener('click',()=>{ const n=news.find(x=>x.id===btn.dataset.editNews); if(!n) return; $('#newsId').value=n.id; $('#newsTitle').value=n.title; $('#newsTag').value=n.tag||'Announcement'; $('#newsDate').value=n.date||''; $('#newsSummary').value=n.summary||''; showSuccess($('#newsSuccess'), '<strong>Edit mode:</strong> Update fields and save.'); window.scrollTo({top:0,behavior:'smooth'}); }));
        $$('[data-delete-news]',newsTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this news?')) return; await deleteRow('news_updates',btn.dataset.deleteNews); renderDashboard(); })); }

      const lTb=$('#leadershipAdminTable tbody'); if(lTb){ $('#emptyLeadershipAdmin').style.display=leaders.length?'none':'block'; lTb.innerHTML=leaders.map(p=>{const photo=p.photo_url?`<img src="${esc(p.photo_url)}" alt="${esc(p.name)}">`:`<span>${initials(p.name)}</span>`; return `<tr><td><div class="leader-thumb">${photo}</div></td><td>${esc(p.name||'')}</td><td>${esc(p.type||'')}</td><td>${esc(p.designation||'')}</td><td>${esc(p.bio||'')}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-leader="${esc(p.id)}">Edit</button><button class="mini-btn danger" data-delete-leader="${esc(p.id)}">Delete</button></div></td></tr>`;}).join('');
        $$('[data-edit-leader]',lTb).forEach(btn=>btn.addEventListener('click',()=>{ const p=leaders.find(x=>x.id===btn.dataset.editLeader); if(!p) return; $('#personId').value=p.id; $('#personName').value=p.name||''; $('#personType').value=p.type||'Selector'; $('#personDesignation').value=p.designation||''; $('#personBio').value=p.bio||''; showSuccess($('#leadershipSuccess'), '<strong>Edit mode:</strong> Details change karke Save / Update Profile par click karein.'); window.scrollTo({top:0,behavior:'smooth'}); }));
        $$('[data-delete-leader]',lTb).forEach(btn=>btn.addEventListener('click',async()=>{ if(!confirm('Delete this profile?')) return; await deleteRow('leadership_panel',btn.dataset.deleteLeader); renderDashboard(); })); }

      const regTb=$('#regTable tbody'); if(regTb){ $('#emptyRegs').style.display=regs.length?'none':'block'; regTb.innerHTML=regs.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.name||'')}</td><td>${esc(r.mobile||'')}</td><td>${esc(r.city||'')}</td><td>${esc(r.dob||'')}</td><td>${esc(r.age||'')}</td><td>${esc(r.role||'')}</td><td>${esc(r.age_group||'')}</td><td>${esc(r.assigned_category||'Pending until trials & auction')}</td><td>${r.photo_url?`<a href="${esc(r.photo_url)}" target="_blank">View</a>`:''}</td><td>${r.proof_url?`<a href="${esc(r.proof_url)}" target="_blank">View</a>`:''}</td><td>₹${esc(r.fee||'999')}</td><td>${esc(r.created_at||'')}</td></tr>`).join(''); }
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

  // login remains local/session-only for current static version
  const loginForm=$('#adminLoginForm');
  if(loginForm){ loginForm.addEventListener('submit',e=>{ e.preventDefault(); const d=Object.fromEntries(new FormData(loginForm).entries()); if((d.username==='team' && d.password==='tmpcl123') || (d.username==='admin' && d.password==='admin123')){ sessionStorage.setItem('tmpclTeamAccess','1'); location.href='admin-dashboard.html'; } else { const s=$('#adminLoginError'); if(s){s.style.display='block'; s.textContent='Invalid login. Use team / tmpcl123';} } }); }
  if(page==='dashboard'){
    if(sessionStorage.getItem('tmpclTeamAccess')!=='1'){ location.href='admin-login.html'; return; }
    $('#logoutBtn')?.addEventListener('click',()=>{ sessionStorage.removeItem('tmpclTeamAccess'); location.href='admin-login.html'; });
  }

  setupRegistration();
  setupContact();
  setupDashboardForms();
  renderPublicTeams();
  renderPublicPartners();
  renderPublicNews();
  renderPublicGallery();
  renderPublicLeadership();
  renderDashboard();
})();
