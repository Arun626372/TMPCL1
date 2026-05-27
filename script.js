(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page;
  $$('.links a, .bottom-nav a').forEach(a => { if(a.dataset.nav === page) a.classList.add('active'); });
  const hamb = $('.hamb');
  const links = $('.links');
  if(hamb && links) hamb.addEventListener('click', () => links.classList.toggle('open'));

  const get = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(e) { return []; } };
  const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const fmt = () => new Date().toLocaleString('en-IN');
  const makeId = prefix => prefix + '-' + Date.now().toString().slice(-7);
  const ageFromDob = dob => {
    if(!dob) return 0;
    const birth = new Date(dob), today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if(m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };
  function readFileAsDataURL(input){
    return new Promise(resolve => {
      if(!input || !input.files || !input.files[0]) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(input.files[0]);
    });
  }

  function teamInitials(name){
    return (name || 'TMPCL Team').split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'TM';
  }
  const sampleTeams = [
    {id:'team-bhopal', name:'Bhopal Strikers', city:'Bhopal', owner:'Captain Coming Soon', status:'Draft Pending', logo:'', squadBanner:''},
    {id:'team-indore', name:'Indore Warriors', city:'Indore', owner:'Captain Coming Soon', status:'Coming Soon', logo:'', squadBanner:''},
    {id:'team-gwalior', name:'Gwalior Royals', city:'Gwalior', owner:'Captain Coming Soon', status:'Coming Soon', logo:'', squadBanner:''}
  ];
  function getTeams(){
    const teams = get('tmpclTeams');
    return teams.length ? teams : sampleTeams;
  }

  function openSquadBanner(team){
    const old = $('#squadBannerModal');
    if(old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'squadBannerModal';
    modal.className = 'squad-banner-modal';
    modal.innerHTML = `<div class="squad-modal-backdrop" data-close-squad="1"></div>
      <div class="squad-modal-card">
        <button class="squad-modal-close" data-close-squad="1" type="button">×</button>
        <div class="squad-modal-head"><div><small>Official Squad Banner</small><h3>${team.name}</h3><p>${team.city || ''} · ${team.status || 'Coming Soon'}</p></div></div>
        ${team.squadBanner ? `<img class="squad-banner-img" src="${team.squadBanner}" alt="${team.name} squad banner">` : `<div class="squad-banner-placeholder"><div class="team-logo-box big"><span>${teamInitials(team.name)}</span></div><h3>Squad Banner Coming Soon</h3><p>TMPCL Team panel se is team ka squad banner/poster upload karne ke baad yahan show hoga.</p></div>`}
        <div class="squad-modal-actions"><button class="btn ghost" data-close-squad="1" type="button">Close</button>${team.squadBanner ? `<a class="btn" href="${team.squadBanner}" target="_blank" rel="noopener">View Full Size</a>` : ''}</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-squad]').forEach(el => el.addEventListener('click', () => modal.remove()));
  }

  function renderPublicTeams(){
    const grid = $('#teamsGrid');
    if(!grid) return;
    const teams = getTeams();
    grid.innerHTML = teams.map(team => {
      const logo = team.logo ? `<img src="${team.logo}" alt="${team.name} logo">` : `<span>${teamInitials(team.name)}</span>`;
      return `<article class="team-card" data-team-id="${team.id}">
        <div class="team-card-head"><div class="team-logo-box">${logo}</div><div><h3>${team.name}</h3><div class="team-city">${team.city || ''}</div><span class="team-status">${team.status || 'Coming Soon'}</span></div></div>
        <div class="team-meta-row"><div class="team-meta"><strong>18</strong><span>Total Squad</span></div><div class="team-meta"><strong>A-5</strong><span>Category A</span></div><div class="team-meta"><strong>D-3</strong><span>Only U19</span></div></div>
        <button class="btn ghost team-toggle" type="button">View Squad Banner</button>
      </article>`;
    }).join('');
    $$('.team-card', grid).forEach(card => card.addEventListener('click', () => {
      const team = getTeams().find(t => t.id === card.dataset.teamId);
      if(team) openSquadBanner(team);
    }));
  }
  renderPublicTeams();

  // Registration
  const regFee = $('#regFee'), regTotal = $('#regTotal');
  if(regFee) regFee.textContent = '₹999';
  if(regTotal) regTotal.textContent = '₹999';
  const regForm = $('#registrationForm');
  if(regForm){
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(regForm).entries());
      const age = ageFromDob(data.dob);
      const photoInput = regForm.querySelector('input[name="photo"]');
      const aadhaarInput = regForm.querySelector('input[name="aadhaar"]');
      if(!data.dob){ alert('Date of Birth mandatory hai.'); return; }
      if(!photoInput || !photoInput.files.length){ alert('Player photo upload mandatory hai.'); return; }
      if(!aadhaarInput || !aadhaarInput.files.length){ alert('Aadhaar Card / Age Proof upload mandatory hai.'); return; }
      if(data.ageGroup === 'U19' && age > 19){ alert('U19 age group ke liye Date of Birth ke hisab se age 19 ya usse kam honi chahiye.'); return; }
      const entry = {...data, id: makeId('TMPCL'), date: fmt(), fee:999, age, assignedCategory:'Pending after trials', photoFile: photoInput.files[0].name, aadhaarFile: aadhaarInput.files[0].name};
      const regs = get('tmpclRegs');
      regs.unshift(entry);
      set('tmpclRegs', regs);
      const success = $('#regSuccess');
      if(success){ success.style.display='block'; success.innerHTML=`<strong>Registration successful!</strong><br>Registration ID: <strong>${entry.id}</strong><br>Amount: ₹999`; }
      regForm.reset();
    });
  }

  // Contact
  const contactForm = $('#contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm).entries());
      const msgs = get('tmpclMessages');
      msgs.unshift({...data, date:fmt()});
      set('tmpclMessages', msgs);
      const s = $('#contactSuccess');
      if(s){ s.style.display='block'; s.innerHTML='<strong>Message sent successfully.</strong> TMPCL Team will contact you soon.'; }
      contactForm.reset();
    });
  }

  // Partner
  const partnerForm = $('#partnerForm');
  if(partnerForm){
    partnerForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(partnerForm).entries());
      const all = get('tmpclPartnerMessages');
      all.unshift({...data, date:fmt()});
      set('tmpclPartnerMessages', all);
      const s = $('#partnerSuccess');
      if(s){ s.style.display='block'; s.innerHTML='<strong>Enquiry submitted.</strong>'; }
      partnerForm.reset();
    });
  }

  // News default content
  const newsList = $('#newsList');
  if(newsList){
    const posts = [
      ['TRIALS','U19 Player Trials – Registrations Open Now','Young talent alert! TMPCL U19 trials are now open across major districts of Madhya Pradesh.'],
      ['ANNOUNCEMENT','TMPCL Season Schedule Announced','Check match dates, venues and key fixtures for the upcoming TMPCL season.'],
      ['SELECTIONS','Final Squad Announcement Update','Shortlisted players and selected squad updates will be published here.'],
      ['RESULTS','Super Striker Tournament Results Out','Check award winners and tournament performance updates.'],
      ['SPONSORS','Partner Announcement','New partners and sponsor updates will appear in this section.']
    ];
    newsList.innerHTML = posts.map(p=>`<article class="card news-card"><div class="thumb"></div><div><span class="tag">${p[0]}</span><h3>${p[1]}</h3><p>${p[2]}</p><a class="btn ghost" href="#">Read More →</a></div></article>`).join('');
  }

  // Gallery public render
  const galleryGrid = $('#galleryGrid');
  if(galleryGrid){
    const empty = $('#galleryEmpty');
    const modal = $('#galleryModal');
    const title = $('#galleryModalTitle');
    const visual = modal ? modal.querySelector('.gallery-modal-visual') : null;
    const desc = modal ? modal.querySelector('p') : null;
    const allItems = get('tmpclGallery');
    function card(item){
      const bg = item.image ? `style="background-image:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.76)),url('${item.image}')"` : '';
      const play = item.type === 'videos' || item.url ? '<div class="play">▶</div>' : '';
      const date = item.date ? `<p>${item.date}</p>` : '<p>TMPCL published media</p>';
      return `<article class="card media-card" data-id="${item.id}" data-type="${item.category}" ${bg}>${play}<div class="label"><span class="tag">${item.category}</span><h3>${item.title}</h3>${date}</div></article>`;
    }
    function render(filter='all'){
      const items = allItems.filter(item => filter === 'all' || item.category === filter || (filter === 'videos' && item.type === 'videos'));
      galleryGrid.innerHTML = items.map(card).join('');
      if(empty) empty.style.display = allItems.length ? 'none' : 'block';
      $$('.media-card', galleryGrid).forEach(c => c.addEventListener('click',()=>{
        const item = allItems.find(g => g.id === c.dataset.id);
        if(!item || !modal) return;
        if(title) title.textContent = item.title || 'TMPCL Media';
        if(visual){
          visual.innerHTML = item.type === 'videos' || item.url ? '<div class="play modal-play">▶</div>' : '';
          visual.style.backgroundImage = item.image ? `linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url('${item.image}')` : '';
          visual.style.backgroundSize = 'cover';
          visual.style.backgroundPosition = 'center';
        }
        if(desc){ desc.innerHTML = item.url ? `<a class="btn" href="${item.url}" target="_blank" rel="noopener">Open Video / Link →</a>` : 'Published TMPCL media preview.'; }
        modal.classList.add('open');
      }));
    }
    $$('.filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.filter').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.filter || 'all');
    }));
    const closeBtn = modal ? modal.querySelector('.gallery-modal-close') : null;
    function closeModal(){ modal && modal.classList.remove('open'); }
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal && modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
    render('all');
  }

  // Team login
  const teamLoginForm = $('#adminLoginForm');
  if(teamLoginForm){
    teamLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(teamLoginForm).entries());
      if(data.username === 'team' && data.password === 'tmpcl123'){
        sessionStorage.setItem('tmpclTeamAccess','1');
        location.href = 'admin-dashboard.html';
      } else {
        const er = $('#adminLoginError');
        if(er){ er.style.display='block'; er.textContent='Invalid login. Use team / tmpcl123'; }
      }
    });
  }

  // TMPCL Team dashboard
  if($('#regTable')){
    if(sessionStorage.getItem('tmpclTeamAccess') !== '1'){
      location.href = 'admin-login.html';
      return;
    }
    function renderDashboard(){
      const regs = get('tmpclRegs'), msgs = get('tmpclMessages'), teams = getTeams(), galleryItems = get('tmpclGallery');
      $('#statRegistrations').textContent = regs.length;
      $('#statTeams') && ($('#statTeams').textContent = teams.length);
      $('#statSquadBanners') && ($('#statSquadBanners').textContent = teams.filter(t=>!!t.squadBanner).length);
      $('#statU19') && ($('#statU19').textContent = regs.filter(r=>r.ageGroup==='U19' || Number(r.age)<=19).length);
      $('#statGallery') && ($('#statGallery').textContent = galleryItems.length);

      const tb = $('#adminTeamsTable tbody');
      if(tb){
        if(teams.length){ $('#emptyTeams').style.display='none'; } else { $('#emptyTeams').style.display='block'; }
        tb.innerHTML = teams.map(t=>{
          const logo = t.logo ? `<img src="${t.logo}" style="width:42px;height:42px;border-radius:12px;object-fit:cover">` : `<strong>${teamInitials(t.name)}</strong>`;
          const banner = t.squadBanner ? `<span class="badge ok">Uploaded</span>` : `<span class="badge muted-badge">Not Added</span>`;
          return `<tr><td>${logo}</td><td>${t.name}</td><td>${t.city||''}</td><td>${t.owner||''}</td><td>${t.status||''}</td><td>${banner}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-team="${t.id}">Edit</button><button class="mini-btn" data-preview-team="${t.id}">Preview</button><button class="mini-btn danger" data-delete-team="${t.id}">Delete</button></div></td></tr>`;
        }).join('');
        $$('[data-edit-team]', tb).forEach(btn=>btn.addEventListener('click',()=>{
          const team = teams.find(t=>t.id === btn.dataset.editTeam);
          if(!team) return;
          $('#teamId').value = team.id;
          $('#teamName').value = team.name;
          $('#teamCity').value = team.city || '';
          $('#teamOwner').value = team.owner || '';
          $('#teamStatus').value = team.status || 'Coming Soon';
          const s = $('#teamSuccess');
          if(s){ s.style.display='block'; s.innerHTML='<strong>Edit mode:</strong> Change fields and click Save / Update Team. Existing logo/banner will remain unless you upload new files.'; }
          window.scrollTo({top:0, behavior:'smooth'});
        }));
        $$('[data-preview-team]', tb).forEach(btn=>btn.addEventListener('click',()=>{
          const team = teams.find(t=>t.id === btn.dataset.previewTeam);
          if(team) openSquadBanner(team);
        }));
        $$('[data-delete-team]', tb).forEach(btn=>btn.addEventListener('click',()=>{
          if(!confirm('Delete this team?')) return;
          set('tmpclTeams', teams.filter(t=>t.id !== btn.dataset.deleteTeam));
          renderDashboard();
        }));
      }

      const gb = $('#galleryAdminTable tbody');
      if(gb){
        if(galleryItems.length){ $('#emptyGalleryAdmin').style.display='none'; } else { $('#emptyGalleryAdmin').style.display='block'; }
        gb.innerHTML = galleryItems.map(item=>{
          const preview = item.image ? `<img src="${item.image}" style="width:60px;height:42px;border-radius:10px;object-fit:cover">` : `<span class="badge muted-badge">No Image</span>`;
          const link = item.url ? `<a class="mini-btn" href="${item.url}" target="_blank" rel="noopener">Open</a>` : `<span class="muted">—</span>`;
          return `<tr><td>${preview}</td><td>${item.title}</td><td>${item.type}</td><td>${item.category}</td><td>${item.date||''}</td><td>${link}</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-media="${item.id}">Edit</button><button class="mini-btn danger" data-delete-media="${item.id}">Delete</button></div></td></tr>`;
        }).join('');
        $$('[data-edit-media]', gb).forEach(btn=>btn.addEventListener('click',()=>{
          const item = galleryItems.find(g=>g.id === btn.dataset.editMedia);
          if(!item) return;
          $('#mediaId').value = item.id;
          $('#mediaTitle').value = item.title || '';
          $('#mediaType').value = item.type || 'photos';
          $('#mediaCategory').value = item.category || 'events';
          $('#mediaDate').value = item.date || '';
          $('#mediaUrl').value = item.url || '';
          const s = $('#gallerySuccess');
          if(s){ s.style.display='block'; s.innerHTML='<strong>Edit mode:</strong> Change fields and click Publish / Update Media. Existing image will remain unless you upload a new one.'; }
          window.scrollTo({top:0, behavior:'smooth'});
        }));
        $$('[data-delete-media]', gb).forEach(btn=>btn.addEventListener('click',()=>{
          if(!confirm('Delete this gallery media?')) return;
          set('tmpclGallery', galleryItems.filter(g=>g.id !== btn.dataset.deleteMedia));
          renderDashboard();
        }));
      }

      const rb = $('#regTable tbody');
      if(rb){
        if(regs.length){ $('#emptyRegs').style.display='none'; } else { $('#emptyRegs').style.display='block'; }
        rb.innerHTML = regs.map(r=>`<tr><td>${r.id}</td><td>${r.name||''}</td><td>${r.mobile||''}</td><td>${r.city||''}</td><td>${r.dob||''}</td><td>${r.age||''}</td><td>${r.role||''}</td><td>${r.ageGroup||''}</td><td>${r.assignedCategory||'Pending after trials'}</td><td>${r.photoFile||''}</td><td>${r.aadhaarFile||''}</td><td>₹${r.fee||''}</td><td>${r.date||''}</td></tr>`).join('');
      }
      const mb = $('#msgTable tbody');
      if(mb){
        if(msgs.length){ $('#emptyMsgs').style.display='none'; } else { $('#emptyMsgs').style.display='block'; }
        mb.innerHTML = msgs.map(m=>`<tr><td>${m.name||''}</td><td>${m.mobile||''}</td><td>${m.email||''}</td><td>${m.subject||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join('');
      }
    }

    const teamForm = $('#teamForm');
    if(teamForm){
      teamForm.addEventListener('submit', async e=>{
        e.preventDefault();
        const fd = new FormData(teamForm);
        const teamId = fd.get('teamId') || ('team-' + Date.now());
        const teams = get('tmpclTeams').length ? get('tmpclTeams') : getTeams();
        const existing = teams.find(t=>t.id === teamId);
        const logoData = await readFileAsDataURL($('#teamLogo'));
        const bannerData = await readFileAsDataURL($('#squadBanner'));
        const obj = {id:teamId, name:fd.get('teamName'), city:fd.get('teamCity'), owner:fd.get('teamOwner')||'', status:fd.get('teamStatus')||'Coming Soon', logo:logoData || (existing && existing.logo) || '', squadBanner:bannerData || (existing && existing.squadBanner) || ''};
        const updated = teams.filter(t=>t.id !== teamId);
        updated.unshift(obj);
        set('tmpclTeams', updated);
        const s=$('#teamSuccess');
        if(s){ s.style.display='block'; s.innerHTML='<strong>Team saved successfully.</strong> Public Teams page par update show hoga.'; }
        teamForm.reset(); $('#teamId').value='';
        renderDashboard();
      });
      $('#teamFormReset')?.addEventListener('click',()=>{ teamForm.reset(); $('#teamId').value=''; const s=$('#teamSuccess'); if(s) s.style.display='none'; });
    }

    const galleryForm = $('#galleryForm');
    if(galleryForm){
      galleryForm.addEventListener('submit', async e=>{
        e.preventDefault();
        const fd = new FormData(galleryForm);
        const mediaId = fd.get('mediaId') || ('media-' + Date.now());
        const items = get('tmpclGallery');
        const existing = items.find(g=>g.id === mediaId);
        const imageData = await readFileAsDataURL($('#mediaImage'));
        const media = {id:mediaId, title:fd.get('mediaTitle'), type:fd.get('mediaType')||'photos', category:fd.get('mediaCategory')||'events', date:fd.get('mediaDate')||'', url:fd.get('mediaUrl')||'', image:imageData || (existing && existing.image) || ''};
        const updated = items.filter(g=>g.id !== mediaId);
        updated.unshift(media);
        set('tmpclGallery', updated);
        const s=$('#gallerySuccess');
        if(s){ s.style.display='block'; s.innerHTML='<strong>Gallery media published.</strong> Public Gallery page par card show hoga.'; }
        galleryForm.reset(); $('#mediaId').value='';
        renderDashboard();
      });
      $('#galleryFormReset')?.addEventListener('click',()=>{ galleryForm.reset(); $('#mediaId').value=''; const s=$('#gallerySuccess'); if(s) s.style.display='none'; });
    }

    renderDashboard();
    $('#logoutBtn')?.addEventListener('click',()=>{ sessionStorage.removeItem('tmpclTeamAccess'); location.href='admin-login.html'; });
  }
})();
