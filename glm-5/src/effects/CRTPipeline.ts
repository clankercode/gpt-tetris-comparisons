import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uResolution;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  
  float scanline = sin(uv.y * uResolution.y * 2.0) * 0.04;
  vec4 color = texture2D(uMainSampler, uv);
  
  color.rgb -= scanline;
  
  float vignette = 1.0 - length(uv - 0.5) * 0.8;
  color.rgb *= vignette;
  
  float rgbOffset = 0.002;
  color.r = texture2D(uMainSampler, uv + vec2(rgbOffset, 0.0)).r;
  color.b = texture2D(uMainSampler, uv - vec2(rgbOffset, 0.0)).b;
  
  float noise = fract(sin(dot(uv + uTime * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
  color.rgb += noise * 0.02;
  
  color.rgb = pow(color.rgb, vec3(1.1));
  
  gl_FragColor = color;
}
`;

export class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private time = 0;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'CRTPipeline',
      fragShader,
    });
  }

  override onPreRender(): void {
    this.time += 0.016;
    this.set1f('uTime', this.time);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
