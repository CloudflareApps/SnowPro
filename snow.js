(function(){
  var FLAKES, wind, options, show, windAngle, windStrength;

  function setOptions(opts) {
    options = opts;

    FLAKES = +options.density;

    windParts = options.wind.split('/');
    wind = {
      normal: +windParts[0],
      gust: +windParts[1]
    };

    windStrength = wind.normal;
    windAngle = 0;

    var prevShown = show;

    show = true
    if (options.hideBeforeToggle && options.hideBefore){
      if (new Date(options.hideBefore) > new Date()){
        show = false;
      }
    }
    if (options.hideAfterToggle && options.hideAfter){
      if (new Date(options.hideAfter) < new Date()){
        show = false;
      }
    }

    if (!prevShown && show)
      update();
  }

  function rnd2() {
    return 0.5 + ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3;
  }

  function randAngle() {
    return rnd2() * (Math.PI / 4) + (Math.PI / 4) + (Math.PI / 8)
  }

  function hexToRGBA(hex, alpha) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return "rgba(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + "," + alpha + ")";
    }
  }

  function newParticle(atTop) {
    var point = {
      x: Math.random()*W,
      y: Math.random()*H,
      r: Math.random()*2+1,
      a: randAngle()
    };

    if (atTop){
      point.y = -point.r;
    }

    return point;
  }

  var W = window.innerWidth;
  var H = window.innerHeight;

  function createCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'eager-snow-canvas';

    return canvas;
  }

  var canvas = createCanvas();
  var ctx = canvas.getContext("2d");

  var accumCanvas = createCanvas();
  var accumCtx = accumCanvas.getContext("2d");
  accumCanvas.style.zIndex = canvas.style.zIndex + 1;
  accumCanvas.style.opacity = 1;

  var particles = [];
  var SHADOW = 5;

  var fixedEls = [];
  var fixedAccu = [];
  var accumulation = {};

  var updateFixed = function() {
    fixedEls = [];
    fixedAccu = [];
    for (var j=0; j < document.body.children.length; j++){
      var node = document.body.children[j];
      var position = getComputedStyle(node).position;
      if (position === 'fixed'){
        fixedEls.push(node.getBoundingClientRect());
        fixedAccu.push({});
      }
    }
  }

  updateFixed();

  function clear(){
    ctx.clearRect(0, 0, W, H);

    if (!options.accumulate){
      accumCtx.clearRect(0, 0, W, H);
      fixedAccu = [];
      accumulation = {};
      return;
    }

    for (var i = 0; i < particles.length; i++){
      var accuX = Math.floor(particles[i].x);
      var found = false;

      for (var j=0; j < fixedEls.length; j++){
        var pos = fixedEls[j];

        fixedAccu[j][accuX] |= 0;

        if (particles[i].x < (pos.left + pos.width) &&
            particles[i].x > (pos.left + 2 * particles[i].r) &&
            particles[i].y > pos.top - fixedAccu[j][accuX] &&
            particles[i].y < (pos.top - fixedAccu[j][accuX] + 10) &&
            particles[i].x - pos.left > fixedAccu[j][accuX] &&
            (pos.left + pos.width) - particles[i].x > fixedAccu[j][accuX]) {
          found = j;
        }
      }

      var accum;
      if (found !== false){
        accum = fixedAccu[found];
      } else {
        accum = accumulation;
      }

      var offset = 0;
      for (var offset = 1; offset < 5; offset++){
        if (accuX > 0 && accum[accuX] - 2 > (accum[accuX - 1] || 0))
          accuX--;
        else if (accuX < innerHeight && accum[accuX] - 2 > (accum[accuX + 1] || 0))
          accuX++;
        else
          break;
      }

      if (!accum[accuX])
        accum[accuX] = 0;

      if (found !== false || (particles[i].y > innerHeight - accum[accuX] && accum[accuX] < 30)){
        var p = particles[i];

        accumCtx.fillStyle = hexToRGBA(options.color, 0.5);
        accumCtx.shadowColor = hexToRGBA(options.color, 0.5);

        accumCtx.shadowBlur = SHADOW;
        accumCtx.beginPath();
        accumCtx.moveTo(p.x, p.y);
        accumCtx.arc(accuX, p.y, p.r, 0, Math.PI*2, true);
        accumCtx.fill();

        accum[accuX] += 1;

        particles[i] = newParticle(true);
      }
    }
  }

  function draw(){
    ctx.fillStyle = hexToRGBA(options.color, 0.5);
    ctx.shadowColor = hexToRGBA(options.color, 0.5);
    ctx.shadowBlur = SHADOW;
    ctx.beginPath();

    for(var i = 0; i < FLAKES; i++){
      var p = particles[i];
      if (p.x < 0)
        p.x = W;
      if (p.x > W)
        p.x = 0;

      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2, true);
    }

    ctx.fill();
  }

  setInterval(function(){
    if (Math.random() > 0.5)
      windAngle = 0
    else
      windAngle = Math.PI

    windStrength = wind.gust;
    /*setTimeout(function(){
      windStrength = wind.normal;
    }, 1000)*/
  }, 1000);

  var lastFrame;
  var startupTime = +new Date;
  var slowFrameCount = 0;
  function update(){
    if ((new Date - startupTime) > 2000 && lastFrame){
      var frameTime = new Date - lastFrame;

      if (frameTime > 32){
        slowFrameCount++;
      } else {
        slowFrameCount = 0;
      }

      if (slowFrameCount > 5 && FLAKES > 8){
        FLAKES = Math.floor(FLAKES - FLAKES / 3);
      } else if (frameTime < 18 && FLAKES < +options.density){
        FLAKES += FLAKES / 2;
      }
    }

    lastFrame = +new Date;

    clear()

    if (!show)
      return;

    for(var i = 0; i < FLAKES; i++){
      if (!particles[i]){
        particles.push({
          x: Math.random()*W,
          y: Math.random()*H,
          r: Math.random()*2+1,
          a: randAngle(),
          d: Math.random()*FLAKES
        })
      }

      var p = particles[i];

      p.y += Math.sin(p.a);
      p.x += Math.cos(p.a);

      p.a += (windStrength * (windAngle - p.a)) / (100 * p.r)

      if (p.x > W + 5 || p.x < -5 || (p.y - p.r) > H){
        p.a = randAngle();
        p.x = Math.random() * W;
        p.y = -p.r;
      }
    }

    draw();

    requestAnimationFrame(update);
  }

  document.body.appendChild(canvas)
  document.body.appendChild(accumCanvas)

  setOptions(INSTALL_OPTIONS);

  INSTALL_SCOPE = {
    setOptions: setOptions
  };
})();
