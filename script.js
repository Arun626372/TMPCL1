(function(){
  const page=document.body.dataset.page||'home';
  const links=document.querySelectorAll('.hotspots a');
  links.forEach(a=>{ if(a.dataset.target===page) a.setAttribute('aria-current','page'); });
})();
