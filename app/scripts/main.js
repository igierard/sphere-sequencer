console.log('\'Allo \'Allo!');

(function(){
  var two = new Two({
    autostart: true,
    height:400,
    type: "CanvasRenderer",
    width: window.innerWidth

  }).appendTo(document.body);

  var V = Two.Vector;
  var rnd = Math.random;

  var canvasSize = new V(window.innerWidth,400);

  var beats = 16;
  var inset = 0;


  var gridSize = canvasSize.clone();
  gridSize.x -= inset*2;
  gridSize.y -= inset*2;

  var rectBase = two.makeRectangle(gridSize.x*0.5,gridSize.y*0.5,gridSize.x,gridSize.y);
  rectBase.fill = '#fff';

  var barsLayer = new Two.Group();
  two.add(barsLayer);

  var bgGrid = new Two.Group();
  for (var i = beats; i >= 0; i--) {
    var f = i/(beats);
    var l = new Two.Line(f*gridSize.x,0,f*gridSize.x,gridSize.y);
    l.linewidth = 3;
    bgGrid.add(l);
  };
  bgGrid.translation.x = inset;
  bgGrid.translation.y = inset;
  two.add(bgGrid);

  var pathLayer = new Two.Group();
  two.add(pathLayer);

  var positionMarker = new Two.Group();
  var positionMarkerLine = new Two.Line(0,0,0,gridSize.y);
  positionMarker.add(positionMarkerLine);
  positionMarker.stroke = '#f00';
  positionMarker.linewidth = 3;
  positionMarker.translation.x = inset;
  positionMarker.translation.y = inset;
  two.add(positionMarker);

  function BeatMeter(x,gridSize,color){
    this.color = color;
    this.rect = new Two.Rectangle(x,gridSize.y,gridSize.x / beats, 0);
    this.rect.stroke = "none";
    this.rect.fill = this.color;
    this.rect.translation.y = gridSize.y + inset;
    this.hitTime = 0;
    this.v = 0;
  }
  BeatMeter.prototype.hitDuration = 1.5;
  BeatMeter.prototype.hit = function(v, now) {
    this.v = v;
    if(typeof now === 'undefined'){
      now = (new Date()).getTime() / 1000;
    }
    this.hitTime = now;
  };
  BeatMeter.prototype.update = function(now) {
    if(typeof now === 'undefined'){
      now = (new Date()).getTime() / 1000;
    }
    var d = now - this.hitTime;
    var f = Math.min(1,d / this.hitDuration);
    this.rect.vertices[0].y =  -(1 - f) * this.v;
    this.rect.vertices[1].y = -(1 - f) * this.v;
  };

  function BeatSet(color, gridSize){
    this.color = color;
    this.gridSize = gridSize;
    this.beatMeters = [];


    this.beatMeterGroup = new Two.Group();
    for (var i = 0; i < beats; i++) {
      this.beatMeters.push(new BeatMeter(i/beats * this.gridSize.x + this.gridSize.x/beats * 0.5,this.gridSize,this.color));
      this.beatMeterGroup.add(this.beatMeters[this.beatMeters.length-1].rect);
    };

    this.beatMeterGroup.translation.x = inset;
    barsLayer.add(this.beatMeterGroup);

    this.volPath = new Two.Path([],false,true);
    for (var i = 0; i < beats+1; i++) {
      var f = i/(beats);
      var x = f*gridSize.x;
      var y = gridSize.y * rnd();
      this.volPath.vertices.push(new Two.Anchor(x,y,x,y,x,y));
    };

    var cap = this.volPath.vertices[this.volPath.vertices.length-1].clone();
    cap.y = this.volPath.vertices[0].y;
    cap.controls.left.y = cap.y;
    cap.controls.right.y = cap.y;

    this.volPath.stroke = this.color;
    this.volPath.fill = 'none';
    this.volGroup = new Two.Group();
    this.volGroup.add(this.volPath);
    this.volGroup.translation.x = this.volGroup.translation.y = inset;
    pathLayer.add(this.volGroup);
  }
  BeatSet.prototype.update = function(now) {
    this.beatMeters.forEach(function(v){ v.update(now); });
  };
  BeatSet.prototype.hit = function(beat,now) {
    this.beatMeters[beat].hit(this.gridSize.y - this.volPath.vertices[beat].y,now);
  };
  BeatSet.prototype.updateBar = function(bar,val) {
    this.volPath.vertices[bar].y = mouseY - inset;
    if(bar == 0){
      this.volPath.vertices[this.volPath.vertices.length - 1].y = val;
    }
  };
  BeatSet.prototype.setActive = function() {
    pathLayer.remove(this.volGroup);
    pathLayer.add(this.volGroup);
    barsLayer.remove(this.beatMeterGroup);
    barsLayer.add(this.beatMeterGroup);
  };

  var beatSets = [];
  var colors = ['#f60','#06f','#0f6'];
  colors.forEach(function(c){
    beatSets.push(new BeatSet(c,gridSize));
  })

  var activeBeatSet = beatSets[0];

  var bpm = 120;
  var bps = 60 / bpm;
  var beatIndicatorTiming = 0.05; // in seconds
  var startTime = (new Date()).getTime() / 1000;

  var fBeatX = gridSize.x / beats;
  var nextBeat = startTime ;

  var lastbeat = 16;

  var measureProg;
  two.bind('update', function() {
    var now = (new Date()).getTime() / 1000;
    var d = now - startTime;
    var absBeat = Math.floor(d / bps);
    var fracBeatSec = d % bps;
    var fracBeat = fracBeatSec / bps;
    var barBeat = absBeat % beats;
    var progX = barBeat * fBeatX + fracBeat * fBeatX;
    measureProg = progX / gridSize.x;

    if(barBeat !== lastbeat){
      beatSets.forEach(function(bs){
        bs.hit(barBeat,now);
      });
    }

    lastbeat = barBeat;
    beatSets.forEach(function(bs){
      bs.update(now);
    });

    if(mouseDown && mouseX !== null && mouseY !== null
      && mouseX >= inset && mouseX <= inset + gridSize.x
      && mouseY >= inset && mouseY <= inset + gridSize.y ){
      var x = mouseX - inset;
      x /= gridSize.x;
      x *= beats;
      x = Math.floor(x);
      activeBeatSet.updateBar(x,mouseY - inset);
      // volPath.vertices[x].y = mouseY - inset;
      // if(x == 0){
      //   volPath.vertices[volPath.vertices.length - 1].y = mouseY - inset;
      // }
    }

    positionMarker.translation.x = inset + progX;

  });
  var mouseX = null, mousey = null, mouseDown = false;

  function mouseTracker(e){
    var off = $(two.renderer.domElement).offset();
    mouseX = e.pageX - off.left
    mouseY = e.pageY - off.top
  }
  function removeTracker(){
    $(window).off('mousemove',mouseTracker);
    mouseX = mouseY = null;
  }
  $(window).on('mousedown',function(){
    $(window).on('mousemove',mouseTracker);
    mouseDown = true;
  });
  $(window).on('mouseup',removeTracker);


  var controls = document.createElement('div');
  var le = colors.map(function(c,i){ return '<li style="background-color:'+c+';">'+(i+1)+'</li>'})
  controls.innerHTML = '<ul class="selector">'+le.join('')+'</ul>'
  document.body.appendChild(controls);

  $('.selector li').on('click',function(e){
    var i = parseInt(e.currentTarget.innerHTML)-1
    activeBeatSet = beatSets[i];
    activeBeatSet.setActive();
  });
  //3d stuff
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / (window.innerHeight-450), 0.1, 1000 );

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight - 400 );
  document.body.appendChild( renderer.domElement );

  camera.position.z = 5;
  camera.position.y = 2;
  camera.position.x = 1;
  camera.lookAt(new THREE.Vector3(0,0,0));

  var dirlight = new THREE.DirectionalLight(0xffffff,1.0);
  dirlight.position.set(2,10,5);
  scene.add(dirlight);
  var dirlight = new THREE.DirectionalLight(0xffffff,1.0);
  dirlight.position.set(-2,-10,5);
  scene.add(dirlight);

  var video = two.renderer.domElement;

  var texture = new THREE.Texture( video );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBFormat;
  texture.generateMipmaps = false;

  var parameters = { color: 0xffffff, map: texture };
  var material_base = new THREE.MeshLambertMaterial( parameters );

  var mesh = new THREE.Mesh(new THREE.SphereGeometry( 2, 32, 32 ),material_base);
  scene.add(mesh);

  function render() {
      requestAnimationFrame(render);
      texture.needsUpdate = true;
      mesh.rotation.y = -measureProg * Math.PI * 2 + Math.PI * 0.5;
      renderer.render(scene, camera);


  }
  render();
})();
