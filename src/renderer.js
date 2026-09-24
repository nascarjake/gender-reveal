const vertex = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uFolded,uReveal,uSeed,uFold,uBands;
uniform int uCount;
uniform vec4 uDrops[64];
uniform vec3 uColor;
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
 return r-.46-.035*sin(theta*7.)-.035*sin(theta*11.+1.);
}
vec2 foldedPoint(vec2 p){
 float r=length(p),a=atan(p.y,p.x);
 if(uFold<.5){float t=a+r*9.;return vec2(cos(t),sin(t))*r*.62;}
 if(uFold<1.5)return vec2((abs(fract((p.x+.9)*3.)*2.-1.)-.5)*.49,p.y*.89);
 return vec2(sin(p.x*5.+p.y*3.),sin(p.y*5.-p.x*2.))*.36+vec2(fbm(p*9.))*.1;
}
void main(){
 vec2 p=(vUv-.5)*2.08; p.x*=uResolution.x/uResolution.y;
 float n=fbm(p*48.);
 float sd=mix(shirt(p),bundle(p),uFolded);
 float mask=1.-smoothstep(-.003,.006,sd);
 float shadow=(1.-smoothstep(-.01,.065,mix(shirt(p-vec2(.018,-.034)),bundle(p-vec2(.018,-.034)),uFolded)))*.14;
 vec2 dyeP=mix(foldedPoint(p),p,uFolded);
 dyeP+=(vec2(fbm(p*32.),fbm(p*37.+10.))-.5)*.038;
 float density=0.,tone=0.;
 for(int i=0;i<64;i++){if(i>=uCount)break;vec4 drop=uDrops[i];float d=length(dyeP-drop.xy);float ink=exp(-d*d/(drop.w*drop.w*.75));density+=ink;tone+=ink*(drop.z*.5);}
 tone/=max(.001,density);
 float a=atan(p.y,p.x),r=length(p);
 float ridges=sin(r*83.+a*5.+fbm(p*22.)*10.);
 if(uFold>.5&&uFold<1.5)ridges=sin(p.x*91.+fbm(p*22.)*10.);
 if(uFold>1.5)ridges=sin(fbm(p*12.)*45.);
 float resist=smoothstep(-.98,-.48,ridges)*.8+.2;
 float stain=clamp(density*.77,0.,1.)*mix(resist,.86,uFolded);
 vec3 grey=mix(vec3(.65),vec3(.19),tone);
 vec3 dye=mix(mix(uColor,vec3(1.),.43*(1.-tone)),uColor*.56,tone*.6);
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
 for(int i=0;i<3;i++){if(float(i)>=uBands)break;float t=float(i)*1.0472;float line=abs(p.x*cos(t)+p.y*sin(t));if(uFold>.5&&uFold<1.5)line=abs(p.y-(float(i)-1.)*.32);bands=max(bands,1.-smoothstep(.013,.019,line));}
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
        "uCount",
        "uDrops[0]",
        "uColor",
      ].map((n) => [n, gl.getUniformLocation(this.program, n)]),
    );
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
    gl.uniform1i(u.uCount, shirt.drops.length);
    const drops = new Float32Array(256);
    shirt.drops.forEach((d, i) => drops.set(d, i * 4));
    gl.uniform4fv(u["uDrops[0]"], drops);
    gl.uniform3fv(
      u.uColor,
      color === "pink" ? [0.94, 0.26, 0.5] : [0.18, 0.49, 0.93],
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
    return Math.hypot(x, y) < (fold === 0 ? 0.54 : 0.52);
  }
}
