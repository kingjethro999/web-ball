import * as T from "three";

/** Tint only the exported fabric mask. Source skin, hair and piping are intact. */
export function suppliedKit(source: T.Material, color: T.ColorRepresentation) {
  const material = source.clone() as T.MeshStandardMaterial;
  material.vertexColors = false;
  material.emissive.set(0);
  material.emissiveMap = null;
  material.roughness = 0.82;
  const tint = new T.Color(color);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.webBallKit = { value: tint };
    shader.vertexShader =
      "attribute vec4 color_1;\nvarying vec2 kitMask;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nkitMask = color_1.rg;",
    );
    shader.fragmentShader =
      "uniform vec3 webBallKit;\nvarying vec2 kitMask;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      // Replace the baked red name/number inside the back panel. Each match
      // player receives its own number attached to the spine, below.
      float redInk = smoothstep(0.001,0.012,diffuseColor.r-max(diffuseColor.g,diffuseColor.b))*kitMask.g;
      if(redInk > 0.001) {
        vec3 cloth = vec3(0.0); float weight = 0.0;
        for(int i=1;i<=3;i++) {
          float offset = float(i)/128.0;
          for(int axis=0;axis<4;axis++) {
            vec2 delta = axis==0 ? vec2(offset,0.0) : axis==1 ? vec2(-offset,0.0) : axis==2 ? vec2(0.0,offset) : vec2(0.0,-offset);
            vec3 nearby = texture2D(map,vMapUv+delta).rgb;
            float neutral = smoothstep(0.82,0.95,min(nearby.r,min(nearby.g,nearby.b))/max(0.001,max(nearby.r,max(nearby.g,nearby.b))));
            cloth += nearby*neutral; weight += neutral;
          }
        }
        vec3 cleanCloth = weight > 0.01 ? cloth/weight : vec3(diffuseColor.r*0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb,cleanCloth,redInk);
      }
      diffuseColor.rgb *= mix(vec3(1.0), webBallKit, max(kitMask.r,redInk));`,
    );
  };
  material.customProgramCacheKey = () => "web-ball-supplied-kit-v5";
  return material;
}
