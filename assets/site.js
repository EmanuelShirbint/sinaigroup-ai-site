
(function(){
  'use strict';
  try {
  var IDS = ["home","architecture","ai-platform","algorithms","rnd","team","contact"];
  var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  var views = {};
  IDS.forEach(function(id){ views[id] = document.getElementById(id); });

  /* ---- reveal animation, per view ---- */
  var io = null;
  if ('IntersectionObserver' in window && !rm.matches) {
    document.documentElement.classList.add('js-reveal');
    io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12});
  }
  function observe(root){
    if (!io) return;
    root.querySelectorAll('.rv:not(.in)').forEach(function(el){ io.observe(el); });
    setTimeout(function(){
      root.querySelectorAll('.rv:not(.in)').forEach(function(el){
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 2500);
  }

  /* ---- routing -----------------------------------------------------------
     ROOT CAUSE OF THE MOBILE FAILURE: the previous build reacted to the
     'hashchange' event only. Several mobile browsers and local-file viewers
     update location.hash for a same-document fragment link WITHOUT dispatching
     hashchange, so the hash changed while the first view stayed on screen.

     The repair does not rely on that event any more:
       1. taps on internal route links are intercepted and rendered directly;
       2. hashchange / popstate / pageshow are all honoured (Back, Forward, bfcache);
       3. a low-cost poller catches viewers that fire no event at all.
  ------------------------------------------------------------------------ */
  function parse(hash){
    var h = (hash === undefined ? location.hash : hash) || '';
    h = h.replace(/^#/, '');
    var anchor = null, sep = h.indexOf('--');
    if (sep > -1) { anchor = h.slice(sep + 2); h = h.slice(0, sep); }
    if (h === 'platform') { h = 'ai-platform'; }   /* legacy hash alias */
    if (IDS.indexOf(h) === -1) { h = 'home'; }
    return {view:h, anchor:anchor};
  }

  /* Renders exactly one view. Safe to call repeatedly with the same route. */
  function render(view, anchor){
    if (IDS.indexOf(view) === -1) { view = 'home'; }
    for (var i = 0; i < IDS.length; i++) {
      var el = views[IDS[i]];
      if (el) { el.hidden = (IDS[i] !== view); }
    }
    document.documentElement.classList.toggle('is-home', view === 'home');

    /* the one global mobile header lives outside every .view, so it survives
       every route change — only its current-route marking has to follow */
    var gmenu = document.getElementById('ghdrMenu');
    if (gmenu) {
      var glinks = gmenu.getElementsByTagName('a');
      for (var g = 0; g < glinks.length; g++) {
        var gt = (glinks[g].getAttribute('href') || '').replace('#','').split('--')[0];
        if (gt === view) { glinks[g].setAttribute('aria-current', 'page'); }
        else { glinks[g].removeAttribute('aria-current'); }
    }
    }
    var cur = views[view];
    if (cur) {
      observe(cur);
      var links = cur.querySelectorAll('.nav-links a, .hlinks a');
      for (var k = 0; k < links.length; k++) {
        var href = links[k].getAttribute('href') || '';
        var target = href.replace('#','').split('--')[0];
        if (target === view) {
          links[k].classList.add('act');
          links[k].setAttribute('aria-current', 'page');
        } else {
          links[k].classList.remove('act');
          links[k].removeAttribute('aria-current');
        }
      }
      // close any open menu belonging to this view
      var hdrs = cur.querySelectorAll('header');
      for (var m = 0; m < hdrs.length; m++) {
        hdrs[m].classList.remove('open');
        var bg = hdrs[m].querySelector('.burger, .hburger');
        if (bg) { bg.setAttribute('aria-expanded','false'); bg.setAttribute('aria-label','Open main menu'); }
      }
      if (anchor) {
        var t = cur.querySelector('[id="' + anchor + '"]');
        if (t && t.scrollIntoView) { t.scrollIntoView(); return; }
      }
    }
    window.scrollTo(0, 0);            // selected page always opens at the top
  }

  var lastHash = location.hash;
  var currentRoute = 'home';
  /* fragments that drive the mobile sheet, not the router */
  /* every #menu-… fragment drives the sheet, never the router */
  function isUiHash(h){ return h.indexOf('#menu-') === 0; }
  function sync(){
    if (isUiHash(location.hash)) {
      lastHash = location.hash;          // the poller must not keep reprocessing it
      return;                            // no route change, no view swap, no scroll
    }
    var r = parse();
    lastHash = location.hash;
    currentRoute = r.view;
    render(r.view, r.anchor);
  }

  /* Explicit navigation — independent of hashchange. */
  function navigate(raw){
    var r = parse('#' + raw);
    render(r.view, r.anchor);                 // paint first, event or no event
    var want = '#' + raw;
    if (location.hash !== want) {
      try {
        if (isUiHash(location.hash) && location.replace) {
          /* leaving the sheet: overwrite the menu entry so Back steps between
             sections and never reopens the menu */
          location.replace(want);
        } else {
          location.hash = want;               // keeps Back / Forward working
        }
      } catch (e) { /* ignore hostile viewers */ }
    }
    lastHash = location.hash;
  }

  /* Delegated tap/click handling for internal route links only. */
  document.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) { return; }
    var node = e.target;
    var a = null;
    while (node && node !== document) {
      if (node.tagName === 'A') { a = node; break; }
      node = node.parentNode;
    }
    if (!a) { return; }
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#') { return; }             // external / mailto untouched
    var raw = href.slice(1);
    var base = raw.split('--')[0];
    if (IDS.indexOf(base) === -1) { return; }           // in-page anchors untouched
    e.preventDefault();
    navigate(raw);
  }, false);

  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  window.addEventListener('pageshow', sync);            // iOS bfcache restore
  setInterval(function(){                               // viewers that fire nothing
    if (location.hash !== lastHash) { sync(); }
  }, 250);

  if (!location.hash) { try { location.replace('#home'); } catch (e) {} }
  sync();

  /* ---- sheet: accessibility enhancement only ------------------------------
     The sheet is opened and closed by :target. Nothing below is required to
     make it visible — it only keeps ARIA, focus and background scrolling
     tidy in engines that do run scripts. */
  function sheetOpen(){ return isUiHash(location.hash); }
  /* the fragment jump is undone here; opening itself never depends on this */
  var sheetY = 0;
  document.addEventListener('click', function(e){
    var n = e.target, a = null;
    while (n && n !== document) { if (n.tagName === 'A') { a = n; break; } n = n.parentNode; }
    if (!a) { return; }
    var h = a.getAttribute('href') || '';
    if (h.indexOf('#menu-') === 0) { sheetY = window.scrollY || 0; }
  }, true);
  window.addEventListener('hashchange', function(){
    if (isUiHash(location.hash)) {
      if ((window.scrollY || 0) !== sheetY) { window.scrollTo(0, sheetY); }
    }
  });
  function sheetSync(){
    var host = document.getElementById('ghdr');
    if (!host) { return; }
    var on = sheetOpen();
    document.documentElement.classList.toggle('nav-open', on);
    var o = host.querySelector('.gt-open'), c = host.querySelector('.gt-close');
    if (o) { o.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    if (c) { c.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    if (on) {
      var f = host.querySelector('.ghdr-menu a');
      if (f && document.activeElement !== f) { try { f.focus({preventScroll:true}); } catch (e) { f.focus(); } }
    }
  }
  window.addEventListener('hashchange', sheetSync);
  window.addEventListener('pageshow', sheetSync);
  setInterval(sheetSync, 250);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && sheetOpen()) {
      try { location.hash = '#' + currentRoute; } catch (err) {}
      var o = document.querySelector('.gt-open');
      if (o) { o.focus(); }
    }
  });
  document.addEventListener('click', function(e){
    if (!sheetOpen()) { return; }
    var host = document.getElementById('ghdr');
    if (host && !host.contains(e.target)) { try { location.hash = '#' + currentRoute; } catch (err) {} }
  });
  sheetSync();

  /* ---- scroll progress bars ---- */
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    var sc = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1);
    document.querySelectorAll('.view:not([hidden]) [id^="prog"]').forEach(function(p){
      p.style.width = (sc*100) + '%';
    });
  }, {passive:true});

  /* ---- hub section dots ---- */
  var hub = views['home'];
  if (hub) {
    var dots = [].slice.call(hub.querySelectorAll('.dots a'));
    var portals = [].slice.call(hub.querySelectorAll('.portal'));
    if ('IntersectionObserver' in window && portals.length) {
      var dio = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (e.isIntersecting) {
            var i = portals.indexOf(e.target);
            dots.forEach(function(d,j){ d.classList.toggle('on', j===i); });
            var hint = hub.querySelector('.hint');
            if (i>0 && hint) hint.style.opacity = 0;
          }
        });
      }, {threshold:.5});
      portals.forEach(function(p){ dio.observe(p); });
    }
  }

  /* ---- contact form: validation + composed mailto ---- */
  var cf = document.getElementById('contactForm');
  if (cf) {
    var st = document.getElementById('cf-status');
    /* required: Name, Email, decision. Everything else is optional (owner decision, Phase 2). */
    var checks = [
      {id:'cf-name',    err:'cf-name-e',    ok:function(v){return v.trim().length>1;}},
      {id:'cf-email',   err:'cf-email-e',   ok:function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());}},
      {id:'cf-decision',err:'cf-decision-e',ok:function(v){return v.trim().length>9;}}
    ];
    /* The CTA is type="button" and the form is method="dialog": there is no native
       submission path (see PHASE2_REPORT.md, Phase 2.1). This routine runs from the
       button's click; the submit listener stays only as a guard. */
    var go = function(e){
      if (e && e.preventDefault) e.preventDefault();
      var bad = null;
      checks.forEach(function(c){
        var el = document.getElementById(c.id), msg = document.getElementById(c.err);
        var good = c.ok(el.value);
        msg.hidden = good;
        el.setAttribute('aria-invalid', good ? 'false' : 'true');
        if (!good && !bad) bad = el;
      });
      if (bad) {
        st.hidden = false;
        st.textContent = 'Some details are missing — please check the highlighted fields.';
        bad.focus(); return;
      }
      /* mailto construction.
         Fixed (owner-approved, not user-controlled): recipient, subject, the field labels
         and the line structure of the body.
         User-controlled: the eight field values. Each one is (1) stripped of CR, LF and every
         other C0/DEL control character — replaced by a single space — and trimmed, then
         (2) percent-encoded with encodeURIComponent on its own, before it is placed into the
         already-encoded body. No raw value is ever concatenated into the URI. */
      var SUBJECT = 'New enquiry — SINAIGROUP-AI';
      var strip = function(v){ return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]+/g, ' ').trim(); };
      var enc = function(id){ var v = strip(document.getElementById(id).value); return encodeURIComponent(v || '—'); };
      var NL = '%0A', L = function(t){ return encodeURIComponent(t); };
      var body =
          L('Name: ') + enc('cf-name')
        + NL + L('Organisation: ') + enc('cf-org')
        + NL + L('Email: ') + enc('cf-email')
        + NL + L('Domain: ') + enc('cf-domain')
        + NL + NL + L('What decision are you trying to improve?') + NL + enc('cf-decision')
        + NL + NL + L('Current technology stack:') + NL + enc('cf-stack')
        + NL + NL + L('What happens if the decision is wrong?') + NL + enc('cf-wrong')
        + NL + NL + L('Additional context:') + NL + enc('cf-context') + NL;
      st.hidden = false;
      st.textContent = 'Opening your email application… if nothing happens, write to don.elan@sinaigroup-ai.com.';
      window.location.href = 'mailto:don.elan@sinaigroup-ai.com?subject='
        + encodeURIComponent(SUBJECT) + '&body=' + body;
    };
    var send = document.getElementById('cf-send');
    if (send) send.addEventListener('click', go);
    cf.addEventListener('submit', go);
  }

  /* ---- reduced motion at runtime ---- */
  if (rm.addEventListener) {
    rm.addEventListener('change', function(m){
      if (m.matches) {
        document.documentElement.classList.remove('js-reveal');
        document.querySelectorAll('.rv').forEach(function(e){ e.classList.add('in'); });
      }
    });
  }
  } catch (err) {
    /* Fail safe: never leave a blank page. Show Home, reveal everything. */
    try {
      var hv = document.getElementById('home');
      if (hv) { hv.hidden = false; }
      document.documentElement.classList.add('is-home');
      document.documentElement.classList.remove('js-reveal');
      var all = document.querySelectorAll('.rv');
      for (var i = 0; i < all.length; i++) { all[i].className += ' in'; }
    } catch (e2) {}
    if (window.console && console.error) { console.error('review shell:', err); }
  }
})();