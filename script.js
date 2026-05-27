(function(){
  const FEES = {
    'Batsman': 999,
    'Bowler': 999,
    'Wicket Keeper': 999,
    'All-Rounder': 1299
  };

  function getData(key){
    try{return JSON.parse(localStorage.getItem(key) || '[]');}catch(e){return [];}
  }
  function setData(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
  function fmtDate(){ return new Date().toLocaleString('en-IN'); }
  function makeId(){ return 'TMPCL-' + Date.now().toString().slice(-6); }

  // registration form
  const regForm = document.getElementById('registrationForm');
  if(regForm){
    const roleSelect = document.getElementById('roleSelect');
    const categorySelect = document.getElementById('categorySelect');
    const regFee = document.getElementById('regFee');
    const regTotal = document.getElementById('regTotal');
    const success = document.getElementById('regSuccess');
    const updateFee = ()=>{
      const fee = FEES[roleSelect.value] || 999;
      regFee.textContent = '₹' + fee;
      regTotal.textContent = '₹' + fee;
    };
    roleSelect && roleSelect.addEventListener('change', updateFee);
    updateFee();

    regForm.addEventListener('submit', function(e){
      e.preventDefault();
      success.classList.add('hidden');
      const fd = new FormData(regForm);
      const data = Object.fromEntries(fd.entries());
      const age = parseInt(data.age || '0', 10);
      if(data.category === 'D' && age > 19){
        alert('Category D is only for U19 players. Please choose A, B or C category.');
        return;
      }
      const fee = FEES[data.role] || 999;
      const entry = {
        id: makeId(),
        date: fmtDate(),
        name: data.name,
        mobile: data.mobile,
        city: data.city,
        age: age,
        role: data.role,
        category: data.category,
        battingStyle: data.battingStyle,
        bowlingStyle: data.bowlingStyle,
        experience: data.experience,
        email: data.email || '',
        photo: data.photo && data.photo.name ? data.photo.name : '',
        fee: fee
      };
      const all = getData('tmpclRegistrations');
      all.unshift(entry);
      setData('tmpclRegistrations', all);
      sessionStorage.setItem('lastTmpclRegistrationId', entry.id);
      success.innerHTML = '<strong>Registration successful!</strong><br>Your TMPCL Registration ID: <strong>' + entry.id + '</strong><br>Amount: ₹' + fee + '<br>Player: ' + entry.name;
      success.classList.remove('hidden');
      regForm.reset();
      updateFee();
    });
  }

  // contact form
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    const success = document.getElementById('contactSuccess');
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm).entries());
      const messages = getData('tmpclMessages');
      messages.unshift({ ...data, date: fmtDate() });
      setData('tmpclMessages', messages);
      success.innerHTML = '<strong>Message sent successfully.</strong><br>Our team will contact you soon.';
      success.classList.remove('hidden');
      contactForm.reset();
    });
  }

  // admin login
  const adminLoginForm = document.getElementById('adminLoginForm');
  if(adminLoginForm){
    const err = document.getElementById('adminLoginError');
    adminLoginForm.addEventListener('submit', function(e){
      e.preventDefault();
      const data = Object.fromEntries(new FormData(adminLoginForm).entries());
      if(data.username === 'admin' && data.password === 'admin123'){
        sessionStorage.setItem('tmpclAdmin', '1');
        location.href = 'admin-dashboard.html';
      } else {
        err.textContent = 'Invalid login. Use admin / admin123';
        err.classList.remove('hidden');
      }
    });
  }

  // dashboard
  const regTable = document.getElementById('regTable');
  if(regTable){
    if(sessionStorage.getItem('tmpclAdmin') !== '1'){
      location.href = 'admin-login.html';
      return;
    }
    const regs = getData('tmpclRegistrations');
    const msgs = getData('tmpclMessages');
    document.getElementById('statRegistrations').textContent = regs.length;
    document.getElementById('statMessages').textContent = msgs.length;
    document.getElementById('statAllRounder').textContent = regs.filter(r=>r.role==='All-Rounder').length;
    document.getElementById('statU19').textContent = regs.filter(r=>r.category==='D').length;

    const regBody = regTable.querySelector('tbody');
    const emptyRegs = document.getElementById('emptyRegs');
    if(regs.length){
      emptyRegs.style.display='none';
      regBody.innerHTML = regs.map(r => `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.mobile}</td><td>${r.city}</td><td>${r.age}</td><td>${r.role}</td><td>${r.category}</td><td>₹${r.fee}</td><td>${r.date}</td></tr>`).join('');
    }

    const msgTable = document.getElementById('msgTable');
    const msgBody = msgTable.querySelector('tbody');
    const emptyMsgs = document.getElementById('emptyMsgs');
    if(msgs.length){
      emptyMsgs.style.display='none';
      msgBody.innerHTML = msgs.map(m => `<tr><td>${m.name||''}</td><td>${m.mobile||''}</td><td>${m.email||''}</td><td>${m.subject||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join('');
    }

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn && logoutBtn.addEventListener('click', function(){
      sessionStorage.removeItem('tmpclAdmin');
      location.href = 'admin-login.html';
    });
  }
})();
