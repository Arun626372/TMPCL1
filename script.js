(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page;
  $$('.links a, .bottom-nav a').forEach(a => { if(a.dataset.nav === page) a.classList.add('active'); });
  const hamb = $('.hamb'); const links = $('.links');
  if(hamb && links) hamb.addEventListener('click', () => links.classList.toggle('open'));
  const get = k => { try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return []} };
  const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const feeMap = {'Batsman':999,'Bowler':999,'Wicket Keeper':999,'All-Rounder':1299};
  const fmt = () => new Date().toLocaleString('en-IN');
  const id = () => 'TMPCL-' + Date.now().toString().slice(-7);

  const roleSelect = $('#roleSelect');
  function updateFee(){ const fee = feeMap[roleSelect?.value] || 999; const f=$('#regFee'), t=$('#regTotal'); if(f) f.textContent='₹'+fee; if(t) t.textContent='₹'+fee; }
  if(roleSelect){ roleSelect.addEventListener('change', updateFee); updateFee(); }

  const regForm = $('#registrationForm');
  if(regForm){ regForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm).entries());
    const age = parseInt(data.age||0,10);
    if(data.category === 'D' && age > 19){ alert('D Category only U19 players ke liye hai. Age 19 ya usse kam honi chahiye.'); return; }
    const entry = {id:id(), date:fmt(), fee:feeMap[data.role]||999, ...data, age};
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

  const adminLogin = $('#adminLoginForm');
  if(adminLogin){ adminLogin.addEventListener('submit', e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(adminLogin).entries());
    if(data.username==='admin' && data.password==='admin123'){ sessionStorage.setItem('tmpclAdmin','1'); location.href='admin-dashboard.html'; }
    else { const er=$('#adminLoginError'); if(er){er.style.display='block'; er.textContent='Invalid login. Use admin / admin123';} }
  }); }

  if($('#regTable')){
    if(sessionStorage.getItem('tmpclAdmin') !== '1'){ location.href='admin-login.html'; return; }
    const regs = get('tmpclRegs'), msgs = get('tmpclMessages');
    $('#statRegistrations').textContent = regs.length; $('#statMessages').textContent = msgs.length;
    $('#statAllRounder').textContent = regs.filter(r=>r.role==='All-Rounder').length;
    $('#statU19').textContent = regs.filter(r=>r.category==='D').length;
    const rb = $('#regTable tbody'); if(regs.length){ $('#emptyRegs').style.display='none'; rb.innerHTML = regs.map(r=>`<tr><td>${r.id}</td><td>${r.name||''}</td><td>${r.mobile||''}</td><td>${r.city||''}</td><td>${r.age||''}</td><td>${r.role||''}</td><td>${r.category||''}</td><td>₹${r.fee||''}</td><td>${r.date||''}</td></tr>`).join(''); }
    const mb = $('#msgTable tbody'); if(msgs.length){ $('#emptyMsgs').style.display='none'; mb.innerHTML = msgs.map(m=>`<tr><td>${m.name||''}</td><td>${m.mobile||''}</td><td>${m.email||''}</td><td>${m.subject||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join(''); }
    $('#logoutBtn')?.addEventListener('click',()=>{sessionStorage.removeItem('tmpclAdmin'); location.href='admin-login.html';});
  }
})();
