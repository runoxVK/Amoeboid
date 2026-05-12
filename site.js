/* ── Static star background — drawn once ── */
(function() {
  var sc = document.getElementById('star-canvas');
  if (!sc) return;
  var sctx = sc.getContext('2d');
  function drawStars() {
    sc.width  = window.innerWidth;
    sc.height = window.innerHeight;
    sctx.clearRect(0, 0, sc.width, sc.height);
    var layers = [
      { count: 250, size: 1,   alpha: 0.4,  color: '138,216,224' },
      { count: 120, size: 1.5, alpha: 0.55, color: '74,154,170'  },
      { count: 50,  size: 2.5, alpha: 0.7,  color: '74,232,224'  },
    ];
    layers.forEach(function(l) {
      for (var i = 0; i < l.count; i++) {
        sctx.beginPath();
        sctx.arc(Math.random()*sc.width, Math.random()*sc.height, l.size, 0, Math.PI*2);
        sctx.fillStyle = 'rgba('+l.color+','+l.alpha+')';
        sctx.fill();
      }
    });
  }
  drawStars();
  window.addEventListener('resize', drawStars);
})();

/* ── Flow field — inside screen, throttled ── */
(function() {
  var flowCanvas, flowCtx, field, fw, fh, size=32, columns, rows, zoom;
  var noiseObj, lastFlow = 0;

  function setup() {
    noiseObj  = new SimplexNoise();
    flowCanvas = document.querySelector('#canvas');
    if (!flowCanvas) return;
    flowCtx = flowCanvas.getContext('2d');
    reset();
    window.addEventListener('resize', function() { setTimeout(reset, 300); });
    setTimeout(function() { requestAnimationFrame(draw); }, 2000);
  }
  function reset() {
    if (!flowCanvas) return;
    zoom = Math.random()*90+20;
    var s = flowCanvas.parentElement;
    fw = flowCanvas.width  = s ? s.clientWidth  : 400;
    fh = flowCanvas.height = s ? s.clientHeight : 600;
    columns = Math.floor(fw/size)+2;
    rows    = Math.floor(fh/size)+2;
    field = [];
    for (var x=0;x<columns;x++){field[x]=[];for(var y=0;y<rows;y++)field[x][y]=0;}
  }
  function draw(now) {
    requestAnimationFrame(draw);
    if (now-lastFlow < 80) return;
    lastFlow = now;
    if (!flowCtx) return;
    for (var x=0;x<columns;x++) for(var y=0;y<rows;y++)
      field[x][y] = noiseObj.noise3D(x/zoom,y/zoom,now/3000)*Math.PI*2;
    flowCtx.fillStyle = 'rgba(0,0,0,0.3)';
    flowCtx.fillRect(0,0,fw,fh);
    flowCtx.strokeStyle = 'rgba(42,192,200,0.07)';
    flowCtx.lineWidth = 1;
    for (var x=0;x<columns;x++) for(var y=0;y<rows;y++){
      var a=field[x][y], x1=x*size, y1=y*size;
      flowCtx.beginPath();
      flowCtx.moveTo(x1,y1);
      flowCtx.lineTo(x1+Math.cos(a)*size*1.2, y1+Math.sin(a)*size*1.2);
      flowCtx.stroke();
    }
  }
  setup();
})();

/* ── Terminal scroll redirect ── */
window.scrollTo = function() {
  var vp = document.getElementById('terminal-viewport');
  if (vp) vp.scrollTop = vp.scrollHeight;
};
document.addEventListener('click', function(e) {
  if (!e.target.closest('.retro-window') && !e.target.closest('.entry-card')) {
    var inp = document.getElementById('cmd-input');
    if (inp) inp.focus();
  }
});

/* ── Panel images: 2-column vertical marquee ── */
(function() {
  var base  = location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '');
  var GAP   = 8;
  var SPEED = 0.5;
  var raf   = null;

  function loadMarquee() {
    fetch(base + '/content.json')
      .then(function(r) { return r.json(); })
      .then(function(data) { preload(data._panelImages || []); })
      .catch(function() {});
  }

  function preload(srcs) {
    if (!srcs.length) return;
    var items  = srcs.map(function(src) { return { src: src, ratio: 1 }; });
    var loaded = 0;
    srcs.forEach(function(src, i) {
      var p = new Image();
      p.onload = function() {
        items[i].ratio = p.naturalHeight / (p.naturalWidth || 1);
        if (++loaded === srcs.length) build(items);
      };
      p.onerror = function() { if (++loaded === srcs.length) build(items); };
      p.src = base + '/' + src;
    });
  }

  function build(items) {
    var panel = document.getElementById('right-panel');
    if (!panel) return;
    panel.innerHTML = '';
    if (raf) cancelAnimationFrame(raf);
    var cols = 2;
    var colW = Math.floor((panel.clientWidth - GAP*(cols+1)) / cols);
    var colItems = [[],[]];
    var colH = [0,0];
    items.forEach(function(it) {
      var c = colH[1] < colH[0] ? 1 : 0;
      var h = Math.round(colW * it.ratio);
      colItems[c].push({ src: it.src, h: h });
      colH[c] += h + GAP;
    });
    var strips = [];
    for (var c=0; c<cols; c++) {
      var x = GAP + c*(colW+GAP);
      var strip = document.createElement('div');
      strip.style.cssText = 'position:absolute;top:0;left:'+x+'px;width:'+colW+'px;will-change:transform;';
      var stripH = colItems[c].reduce(function(s,it){return s+it.h+GAP;},0);
      [0,1].forEach(function(){
        colItems[c].forEach(function(it){
          var img = document.createElement('img');
          img.src = base+'/'+it.src;
          img.className = 'panel-img';
          img.style.cssText = 'display:block;width:'+colW+'px;height:'+it.h+'px;object-fit:cover;margin-bottom:'+GAP+'px;position:static';
          strip.appendChild(img);
        });
      });
      panel.appendChild(strip);
      strips.push({ el: strip, totalH: stripH, offset: 0 });
    }
    strips[1].offset = strips[1].totalH * 0.4;
    function tick() {
      raf = requestAnimationFrame(tick);
      strips.forEach(function(s) {
        s.offset += SPEED;
        if (s.offset >= s.totalH) s.offset -= s.totalH;
        s.el.style.transform = 'translateY('+(-s.offset).toFixed(1)+'px)';
      });
    }
    tick();
  }

  loadMarquee();
})();