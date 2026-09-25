const vertex = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uFolded,uReveal,uSeed,uFold,uBands;
uniform vec3 uColor,uAccentColor;
uniform vec2 uBandLines[3];
uniform sampler2D uDyeMap;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03)+.15*noise(p*4.01);}
float box(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}
float edge(vec2 p,vec2 a,vec2 b){vec2 v=b-a,w=p-a;return length(w-v*clamp(dot(w,v)/dot(v,v),0.,1.));}
float shirt(vec2 p){
 vec2 v[12];
 v[0]=vec2(-.22,.68);v[1]=vec2(-.47,.60);v[2]=vec2(-.78,.31);v[3]=vec2(-.59,.06);v[4]=vec2(-.43,.18);v[5]=vec2(-.43,-.68);v[6]=vec2(.43,-.68);v[7]=vec2(.43,.18);v[8]=vec2(.59,.06);v[9]=vec2(.78,.31);v[10]=vec2(.47,.60);v[11]=vec2(.22,.68);
 float d=10.;float s=1.;vec2 a=v[11];
 for(int i=0;i<12;i++){vec2 b=v[i];d=min(d,edge(p,a,b));if((a.y>p.y)!=(b.y>p.y)){if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)s=-s;}a=b;}
 return max(d*s,-(length(p-vec2(0.,.75))-.245));
}
float bundle(vec2 p){
 float theta=atan(p.y,p.x),r=length(p);
 if(uFold<.5)return r-.515-.014*sin(theta*15.+r*30.);
 if(uFold<1.5)return box(p,vec2(.27,.64))-.016*sin(p.y*58.);
 if(uFold<2.5)return r-.46-.035*sin(theta*7.)-.035*sin(theta*11.+1.);
 if(uFold<3.5)return r-.49-.022*sin(theta*18.)-.014*sin(theta*9.+r*24.);
 if(uFold<4.5){vec2 q=vec2((p.x+p.y)*.707,(p.y-p.x)*.707);return box(q,vec2(.42,.49))-.018*sin(q.x*31.);}
 return r-.47-.025*sin(theta*5.+r*18.)-.018*sin(theta*13.);
}
vec2 foldedPoint(vec2 p){
 float r=length(p),a=atan(p.y,p.x);
 if(uFold<.5){float t=a+r*9.;return vec2(cos(t),sin(t))*r*.62;}
 if(uFold<1.5)return vec2((abs(fract((p.x+.9)*3.)*2.-1.)-.5)*.49,p.y*.89);
 if(uFold<2.5)return vec2(sin(p.x*5.+p.y*3.),sin(p.y*5.-p.x*2.))*.36+vec2(fbm(p*9.))*.1;
 if(uFold<3.5){float ray=sin(a*8.+r*13.);return vec2(cos(a*8.),sin(a*8.))*(.16+r*.28+ray*.06);}
 if(uFold<4.5){float zig=abs(fract((p.x+p.y+.9)*2.7)*2.-1.)-.5;return vec2(zig*.72,(p.y-p.x)*.42);}
 return vec2(fbm(p*5.+3.),fbm(p*5.-7.))*.68-vec2(.34);
}
void main(){
 vec2 p=(vUv-.5)*2.08; p.x*=uResolution.x/uResolution.y;
 float n=fbm(p*48.);
 float sd=mix(shirt(p),bundle(p),uFolded);
 float mask=1.-smoothstep(-.003,.006,sd);
 float shadow=(1.-smoothstep(-.01,.065,mix(shirt(p-vec2(.018,-.034)),bundle(p-vec2(.018,-.034)),uFolded)))*.14;
 vec2 dyeP=mix(p,foldedPoint(p),1.-uFolded);
 dyeP+=(vec2(fbm(p*32.),fbm(p*37.+10.))-.5)*.038;
 vec4 dyeData=texture2D(uDyeMap,clamp(dyeP*.5+.5,0.,1.));
 float density=clamp(dyeData.a*3.2,0.,3.);
 float tone=clamp((dyeData.r-.42)/.42,0.,1.);
 float accent=clamp((dyeData.g-.25)/.62,0.,1.);
 float a=atan(p.y,p.x),r=length(p);
 float ridges=sin(r*83.+a*5.+fbm(p*22.)*10.);
 if(uFold>.5&&uFold<1.5)ridges=sin(p.x*91.+fbm(p*22.)*10.);
 if(uFold>1.5&&uFold<2.5)ridges=sin(fbm(p*12.)*45.);
 if(uFold>2.5&&uFold<3.5)ridges=sin(a*14.+r*46.+fbm(p*15.)*8.);
 if(uFold>3.5&&uFold<4.5)ridges=sin((p.x+p.y)*86.+fbm(p*18.)*9.);
 if(uFold>4.5)ridges=sin(fbm(p*7.)*58.+r*16.);
 float resist=smoothstep(-.98,-.48,ridges)*.8+.2;
 float tiedResist=1.;
 for(int i=0;i<3;i++){if(float(i)>=uBands)break;vec2 band=uBandLines[i];float d=abs(dot(dyeP,vec2(cos(band.x),sin(band.x)))-band.y);tiedResist*=mix(.32,1.,smoothstep(.008,.025,d));}
 float stain=clamp(density*.77,0.,1.)*mix(resist,.86,uFolded)*mix(tiedResist,1.,uFolded);
 vec3 grey=mix(vec3(.65),vec3(.19),tone);
 vec3 secretColor=mix(uColor,uAccentColor,clamp(accent,0.,1.));
 vec3 dye=mix(mix(secretColor,vec3(1.),.43*(1.-tone)),secretColor*.56,tone*.6);
 vec3 ink=mix(grey,dye,uReveal);
 vec3 cloth=mix(vec3(.98,.975,.96),ink,stain);
 float wrinkles=(sin(p.x*49.+sin(p.y*11.)*2.)*.02+sin(p.y*24.+p.x*9.)*.012)*(1.-uFolded);
 float foldedLight=sin(a*19.+r*24.)*.045+sin(r*87.-a*7.)*.025;
 if(uFold>.5&&uFold<1.5)foldedLight=sin(p.x*113.)*.095;
 float shade=1.-smoothstep(-.05,.003,sd)*.16+wrinkles+foldedLight*uFolded+(n-.5)*.07;
 cloth*=shade;
 float seam=1.-smoothstep(.003,.007,abs(shirt(p)+.02));
 cloth*=1.-seam*.12*(1.-uFolded);
 float bands=0.;
 for(int i=0;i<3;i++){if(float(i)>=uBands)break;vec2 band=uBandLines[i];float line=abs(p.x*cos(band.x)+p.y*sin(band.x)-band.y);bands=max(bands,1.-smoothstep(.013,.019,line));}
 cloth=mix(cloth,vec3(.38,.37,.34)+.13*smoothstep(-.012,.012,p.x),bands*uFolded);
 gl_FragColor=vec4(mix(vec3(.18,.17,.14),cloth,mask),max(mask,shadow));
}`;
export class ShirtRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!this.gl) throw new Error("WebGL is unavailable");
    const gl = this.gl;
    const compile = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    this.program = gl.createProgram();
    gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(this.program));
    gl.useProgram(this.program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const attr = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = Object.fromEntries(
      [
        "uResolution",
        "uFolded",
        "uReveal",
        "uSeed",
        "uFold",
        "uBands",
        "uBandLines[0]",
        "uColor",
        "uAccentColor",
        "uDyeMap",
      ].map((n) => [n, gl.getUniformLocation(this.program, n)]),
    );
    this.dyeMapSize = 512;
    this.dyeCanvas = document.createElement("canvas");
    this.dyeCanvas.width = this.dyeMapSize;
    this.dyeCanvas.height = this.dyeMapSize;
    this.dyeContext = this.dyeCanvas.getContext("2d");
    this.dyeTexture = gl.createTexture();
    this.dyeShirtId = null;
    this.paintedDrops = 0;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dyeTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.dyeCanvas,
    );
  }
  drawDyeDrop(drop) {
    const [x, y, encodedShade, size] = drop,
      context = this.dyeContext,
      mapSize = this.dyeMapSize,
      shade = encodedShade % 3,
      palette = Math.floor(encodedShade / 3),
      centerX = (x * 0.5 + 0.5) * mapSize,
      centerY = (0.5 - y * 0.5) * mapSize,
      radius = Math.max(7, size * mapSize * 0.92),
      red = 112 + shade * 54,
      green = palette ? 220 : 62,
      gradient = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius,
      );
    gradient.addColorStop(0, `rgba(${red}, ${green}, 38, 0.42)`);
    gradient.addColorStop(0.38, `rgba(${red}, ${green}, 38, 0.24)`);
    gradient.addColorStop(0.74, `rgba(${red}, ${green}, 38, 0.065)`);
    gradient.addColorStop(1, `rgba(${red}, ${green}, 38, 0)`);
    context.globalCompositeOperation = "lighter";
    context.fillStyle = gradient;
    context.fillRect(
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2,
    );
  }
  syncDyeMap(shirt) {
    const gl = this.gl;
    if (this.dyeShirtId !== shirt.id || shirt.drops.length < this.paintedDrops) {
      this.dyeContext.clearRect(0, 0, this.dyeMapSize, this.dyeMapSize);
      this.dyeShirtId = shirt.id;
      this.paintedDrops = 0;
    }
    for (let index = this.paintedDrops; index < shirt.drops.length; index++)
      this.drawDyeDrop(shirt.drops[index]);
    if (this.paintedDrops !== shirt.drops.length) {
      this.paintedDrops = shirt.drops.length;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.dyeTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.dyeCanvas,
      );
    }
  }
  draw(shirt, { folded = 0, reveal = 0, color = "blue" } = {}) {
    const gl = this.gl,
      u = this.uniforms;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uFolded, folded);
    gl.uniform1f(u.uReveal, reveal);
    gl.uniform1f(u.uSeed, shirt.seed);
    gl.uniform1f(u.uFold, shirt.fold);
    gl.uniform1f(u.uBands, shirt.bands);
    this.syncDyeMap(shirt);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dyeTexture);
    gl.uniform1i(u.uDyeMap, 0);
    const bands = new Float32Array(6);
    shirt.bandPlacements.forEach((band, i) =>
      bands.set([band.angle, band.offset], i * 2),
    );
    gl.uniform2fv(u["uBandLines[0]"], bands);
    gl.uniform3fv(
      u.uColor,
      color === "pink" ? [0.94, 0.26, 0.5] : [0.18, 0.49, 0.93],
    );
    gl.uniform3fv(
      u.uAccentColor,
      color === "pink" ? [0.68, 0.34, 0.82] : [0.12, 0.72, 0.78],
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  point(event) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x:
        (((event.clientX - r.left) / r.width - 0.5) * 2.08 * r.width) /
        r.height,
      y: (0.5 - (event.clientY - r.top) / r.height) * 2.08,
    };
  }
  contains({ x, y }, fold) {
    if (fold === 1) return Math.abs(x) < 0.29 && Math.abs(y) < 0.66;
    if (fold === 4) {
      const diagonalX = (x + y) * 0.707,
        diagonalY = (y - x) * 0.707;
      return Math.abs(diagonalX) < 0.44 && Math.abs(diagonalY) < 0.52;
    }
    return Math.hypot(x, y) < (fold === 0 ? 0.54 : 0.52);
  }
}
