(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page;
  $$('.links a, .bottom-nav a').forEach(a => { if(a.dataset.nav === page) a.classList.add('active'); });
  const hamb = $('.hamb'); const links = $('.links');
  if(hamb && links) hamb.addEventListener('click', () => links.classList.toggle('open'));
  const get = k => { try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return []} };
  const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const feeMap = {'Batsman':999,'Bowler':999,'Wicket Keeper':999,'All-Rounder':999};
  const fmt = () => new Date().toLocaleString('en-IN');
  const id = () => 'TMPCL-' + Date.now().toString().slice(-7);
  const ageFromDob = (dob) => {
    if(!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const roleSelect = $('#roleSelect');
  function updateFee(){ const fee = 999; const f=$('#regFee'), t=$('#regTotal'); if(f) f.textContent='₹'+fee; if(t) t.textContent='₹'+fee; }
  if(roleSelect){ roleSelect.addEventListener('change', updateFee); updateFee(); }

  const regForm = $('#registrationForm');
  if(regForm){ regForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm).entries());
    const age = ageFromDob(data.dob);
    const photoInput = regForm.querySelector('input[name="photo"]');
    const aadhaarInput = regForm.querySelector('input[name="aadhaar"]');
    if(!data.dob){ alert('Date of Birth mandatory hai.'); return; }
    if(!photoInput || !photoInput.files.length){ alert('Player photo upload mandatory hai.'); return; }
    if(!aadhaarInput || !aadhaarInput.files.length){ alert('Aadhaar Card / Age Proof upload mandatory hai.'); return; }
    if(data.ageGroup === 'U19' && age > 19){ alert('U19 age group ke liye Date of Birth ke hisab se age 19 ya usse kam honi chahiye.'); return; }
    const entry = {id:id(), date:fmt(), fee:999, assignedCategory:'Pending after trials', ...data, age, photoFile: photoInput.files[0].name, aadhaarFile: aadhaarInput.files[0].name};
    const all = get('tmpclRegs'); all.unshift(entry); set('tmpclRegs', all);
    const success = $('#regSuccess');
    if(success){ success.style.display='block'; success.innerHTML=`<strong>Registration successful!</strong><br>Registration ID: <strong>${entry.id}</strong><br>Amount: ₹${entry.fee}`; }
    regForm.reset(); updateFee();
  }); }

  const contactForm = $('#contactForm');
  if(contactForm){ contactForm.addEventListener('submit', e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(contactForm).entries());
    const all = get('tmpclMessages'); all.unshift({...data, date:fmt()}); set('tmpclMessages', all);
    const s=$('#contactSuccess'); if(s){s.style.display='block'; s.innerHTML='<strong>Message sent successfully.</strong><br>Our team will contact you soon.'}
    contactForm.reset();
  }); }

  const partnerForm = $('#partnerForm');
  if(partnerForm){ partnerForm.addEventListener('submit', e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(partnerForm).entries());
    const all = get('tmpclPartnerMessages'); all.unshift({...data, date:fmt()}); set('tmpclPartnerMessages', all);
    const s=$('#partnerSuccess'); if(s){s.style.display='block'; s.innerHTML='<strong>Enquiry submitted.</strong>'}
    partnerForm.reset();
  }); }

  const filters = $$('.filter');
  if(filters.length){ filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    const type = btn.dataset.filter;
    $$('#galleryGrid .media-card').forEach(card => card.style.display = (type==='all'||card.dataset.type===type) ? '' : 'none');
  })); }

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


  const sampleTeams = [
    {id:'team-bhopal', name:'Bhopal Strikers', city:'Bhopal', owner:'Captain Coming Soon', status:'Draft Pending', logo:'', squad:[
      {name:'A Category Slot 1', role:'Batsman', category:'A', ageGroup:'Open'},
      {name:'A Category Slot 2', role:'Bowler', category:'A', ageGroup:'Open'},
      {name:'B Category Slot 1', role:'All-Rounder', category:'B', ageGroup:'Open'},
      {name:'C Category Slot 1', role:'Wicket Keeper', category:'C', ageGroup:'Open'},
      {name:'D U19 Slot 1', role:'Batsman', category:'D', ageGroup:'U19'}
    ]},
    {id:'team-indore', name:'Indore Warriors', city:'Indore', owner:'Captain Coming Soon', status:'Coming Soon', logo:'', squad:[]},
    {id:'team-gwalior', name:'Gwalior Royals', city:'Gwalior', owner:'Captain Coming Soon', status:'Coming Soon', logo:'', squad:[]}
  ];
  function getTeams(){
    const teams = get('tmpclTeams');
    return teams.length ? teams : sampleTeams;
  }
  function teamInitials(name){
    return (name||'TMPCL Team').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'TM';
  }
  function squadCounts(squad){
    const counts = {A:0,B:0,C:0,D:0};
    (squad||[]).forEach(p=>{ if(counts[p.category] !== undefined) counts[p.category]++; });
    return counts;
  }
  function renderPublicTeams(){
    const grid = $('#teamsGrid');
    if(!grid) return;
    const teams = getTeams();
    grid.innerHTML = teams.map(team => {
      const squad = team.squad || [];
      const counts = squadCounts(squad);
      const groups = ['A','B','C','D'].map(cat => {
        const limit = cat==='D' ? 3 : 5;
        const players = squad.filter(p=>p.category===cat);
        const rows = players.length ? players.map(p=>`<div class="squad-player"><span>${p.name}<br><small>${p.role} · ${p.ageGroup||'Open'}</small></span><b>${p.category}</b></div>`).join('') : `<div class="empty-squad">Squad players will be updated after trials and team draft.</div>`;
        return `<div class="squad-group"><div class="squad-group-head"><span>Category ${cat}${cat==='D'?' · U19':''}</span><span>${players.length}/${limit}</span></div><div class="squad-list">${rows}</div></div>`;
      }).join('');
      const logo = team.logo ? `<img src="${team.logo}" alt="${team.name} logo">` : `<span>${teamInitials(team.name)}</span>`;
      return `<article class="team-card" data-team-id="${team.id}">
        <div class="team-card-head"><div class="team-logo-box">${logo}</div><div><h3>${team.name}</h3><div class="team-city">${team.city}</div><span class="team-status">${team.status||'Coming Soon'}</span></div></div>
        <div class="team-meta-row"><div class="team-meta"><strong>18</strong><span>Total Squad</span></div><div class="team-meta"><strong>${squad.length}</strong><span>Added</span></div><div class="team-meta"><strong>${counts.D}</strong><span>U19</span></div></div>
        <button class="btn ghost team-toggle" type="button">View Squad</button>
        <div class="squad-panel"><div class="squad-title"><strong>${team.name} Squad</strong><span>A-5 · B-5 · C-5 · D-3 U19</span></div><div class="squad-groups">${groups}</div></div>
      </article>`;
    }).join('');
    $$('.team-card', grid).forEach(card => card.addEventListener('click', e => {
      if(e.target.closest('a')) return;
      card.classList.toggle('open');
      const btn = card.querySelector('.team-toggle');
      if(btn) btn.textContent = card.classList.contains('open') ? 'Hide Squad' : 'View Squad';
    }));
  }
  renderPublicTeams();


  const adminLogin = $('#adminLoginForm');
  if(adminLogin){ adminLogin.addEventListener('submit', e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(adminLogin).entries());
    if(data.username==='admin' && data.password==='admin123'){ sessionStorage.setItem('tmpclAdmin','1'); location.href='admin-dashboard.html'; }
    else { const er=$('#adminLoginError'); if(er){er.style.display='block'; er.textContent='Invalid login. Use admin / admin123';} }
  }); }

  if($('#regTable')){
    if(sessionStorage.getItem('tmpclAdmin') !== '1'){ location.href='admin-login.html'; return; }
    const renderAdmin = () => {
      const regs = get('tmpclRegs'), msgs = get('tmpclMessages'), teams = getTeams();
      const totalSquad = teams.reduce((sum,t)=>sum + ((t.squad||[]).length), 0);
      $('#statRegistrations').textContent = regs.length;
      $('#statMessages') && ($('#statMessages').textContent = msgs.length);
      $('#statTeams') && ($('#statTeams').textContent = teams.length);
      $('#statSquad') && ($('#statSquad').textContent = totalSquad);
      $('#statAllRounder') && ($('#statAllRounder').textContent = regs.filter(r=>r.role==='All-Rounder').length);
      $('#statU19').textContent = regs.filter(r=>r.ageGroup==='U19' || Number(r.age)<=19).length;

      const tb = $('#adminTeamsTable tbody');
      if(tb){
        if(teams.length){ $('#emptyTeams').style.display='none'; }
        tb.innerHTML = teams.map(t => {
          const logo = t.logo ? `<img src="${t.logo}" style="width:42px;height:42px;border-radius:12px;object-fit:cover">` : `<strong>${teamInitials(t.name)}</strong>`;
          return `<tr><td>${logo}</td><td>${t.name}</td><td>${t.city||''}</td><td>${t.owner||''}</td><td>${t.status||''}</td><td>${(t.squad||[]).length}/18</td><td><div class="admin-table-actions"><button class="mini-btn" data-edit-team="${t.id}">Edit</button><button class="mini-btn danger" data-delete-team="${t.id}">Delete</button></div></td></tr>`;
        }).join('');
        tb.querySelectorAll('[data-edit-team]').forEach(btn=>btn.addEventListener('click',()=>{
          const team = teams.find(t=>t.id===btn.dataset.editTeam);
          if(!team) return;
          $('#teamId').value=team.id; $('#teamName').value=team.name; $('#teamCity').value=team.city||''; $('#teamOwner').value=team.owner||''; $('#teamStatus').value=team.status||'Coming Soon';
          window.scrollTo({top:0, behavior:'smooth'});
        }));
        tb.querySelectorAll('[data-delete-team]').forEach(btn=>btn.addEventListener('click',()=>{
          if(!confirm('Delete this team?')) return;
          set('tmpclTeams', teams.filter(t=>t.id!==btn.dataset.deleteTeam));
          renderAdmin();
        }));
      }
      const squadSelect = $('#squadTeamSelect');
      if(squadSelect){
        squadSelect.innerHTML = teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
      }

      const rb = $('#regTable tbody');
      if(regs.length){ $('#emptyRegs').style.display='none'; rb.innerHTML = regs.map(r=>`<tr><td>${r.id}</td><td>${r.name||''}</td><td>${r.mobile||''}</td><td>${r.city||''}</td><td>${r.dob||''}</td><td>${r.age||''}</td><td>${r.role||''}</td><td>${r.ageGroup||''}</td><td>${r.assignedCategory||'Pending after trials'}</td><td>${r.photoFile||''}</td><td>${r.aadhaarFile||''}</td><td>₹${r.fee||''}</td><td>${r.date||''}</td></tr>`).join(''); }
      const mb = $('#msgTable tbody');
      if(msgs.length){ $('#emptyMsgs').style.display='none'; mb.innerHTML = msgs.map(m=>`<tr><td>${m.name||''}</td><td>${m.mobile||''}</td><td>${m.email||''}</td><td>${m.subject||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join(''); }
    };

    const teamForm = $('#teamForm');
    if(teamForm){
      teamForm.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(teamForm);
        const teamId = fd.get('teamId') || ('team-' + Date.now());
        const logoInput = $('#teamLogo');
        const saveTeam = (logoData='') => {
          const teams = get('tmpclTeams').length ? get('tmpclTeams') : getTeams();
          const existing = teams.find(t=>t.id===teamId);
          const obj = {
            id: teamId,
            name: fd.get('teamName'),
            city: fd.get('teamCity'),
            owner: fd.get('teamOwner') || '',
            status: fd.get('teamStatus') || 'Coming Soon',
            logo: logoData || (existing && existing.logo) || '',
            squad: (existing && existing.squad) || []
          };
          const updated = teams.filter(t=>t.id!==teamId);
          updated.unshift(obj);
          set('tmpclTeams', updated);
          const s=$('#teamSuccess'); if(s){s.style.display='block'; s.innerHTML='<strong>Team saved successfully.</strong>'}
          teamForm.reset(); $('#teamId').value='';
          renderAdmin();
        };
        if(logoInput && logoInput.files && logoInput.files[0]){
          const reader = new FileReader();
          reader.onload = () => saveTeam(reader.result);
          reader.readAsDataURL(logoInput.files[0]);
        } else saveTeam();
      });
      $('#teamFormReset')?.addEventListener('click',()=>{teamForm.reset(); $('#teamId').value='';});
    }

    const squadForm = $('#squadForm');
    if(squadForm){
      squadForm.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(squadForm);
        const teams = get('tmpclTeams').length ? get('tmpclTeams') : getTeams();
        const team = teams.find(t=>t.id===fd.get('squadTeamId'));
        if(!team){ alert('Please add/select a team first.'); return; }
        team.squad = team.squad || [];
        if(team.squad.length >= 18){ alert('This team already has 18 players.'); return; }
        const cat = fd.get('playerCategory');
        const limit = cat === 'D' ? 3 : 5;
        if(cat === 'D' && fd.get('playerAgeGroup') !== 'U19'){ alert('Category D is only for U19 players.'); return; }
        if(team.squad.filter(p=>p.category===cat).length >= limit){ alert(`Category ${cat} limit reached.`); return; }
        team.squad.push({name:fd.get('playerName'), role:fd.get('playerRole'), category:cat, ageGroup:fd.get('playerAgeGroup')});
        set('tmpclTeams', teams);
        const s=$('#squadSuccess'); if(s){s.style.display='block'; s.innerHTML='<strong>Squad player added.</strong>'}
        squadForm.reset();
        renderAdmin();
      });
    }

    renderAdmin();
    $('#logoutBtn')?.addEventListener('click',()=>{sessionStorage.removeItem('tmpclAdmin'); location.href='admin-login.html';});
  }
})();
