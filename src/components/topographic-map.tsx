"use client"

import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const vertexShader = `
  uniform float uTime;
  uniform float uElevation;
  uniform float uSpeed;
  uniform float uWarping;
  varying float vElevation;

  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

  float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
  }

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    float elevation = cnoise(vec3(modelPosition.x * uWarping, modelPosition.z * uWarping - uTime * uSpeed, 0.0)) * uElevation;
    modelPosition.y += elevation;
    
    vElevation = elevation;
    
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`

const fragmentShader = `
  uniform vec3 uLowColor;
  uniform vec3 uHighColor;
  uniform float uColorStrength;
  uniform float uColorDiffusion;
  
  varying float vElevation;

  void main() {
    float mixStrength = (vElevation + uColorDiffusion) * uColorStrength;
    vec3 color = mix(uLowColor, uHighColor, mixStrength);
    gl_FragColor = vec4(color, 1.0);
  }
`

function Terrain({ 
  mapSize,
  speed,
  generalTopography, 
  maxElevation, 
  warping,
  highColor,
  lowColor,
  colorStrength,
  colorDiffusion
}) {
  const mesh = useRef()
  const uniforms = useRef({
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uElevation: { value: maxElevation },
    uWarping: { value: warping },
    uLowColor: { value: new THREE.Color(lowColor) },
    uHighColor: { value: new THREE.Color(highColor) },
    uColorStrength: { value: colorStrength },
    uColorDiffusion: { value: colorDiffusion },
  })

  useFrame((state) => {
    const { clock } = state
    mesh.current.material.uniforms.uTime.value = clock.getElapsedTime()
    mesh.current.material.uniforms.uSpeed.value = speed
    mesh.current.material.uniforms.uElevation.value = maxElevation
    mesh.current.material.uniforms.uWarping.value = warping
    mesh.current.material.uniforms.uLowColor.value = new THREE.Color(lowColor)
    mesh.current.material.uniforms.uHighColor.value = new THREE.Color(highColor)
    mesh.current.material.uniforms.uColorStrength.value = colorStrength
    mesh.current.material.uniforms.uColorDiffusion.value = colorDiffusion
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI * 0.5, 0, 0]}>
      <planeGeometry args={[mapSize, mapSize, 256, 256]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
      />
    </mesh>
  )
}

const CustomSlider = ({ value, onChange, min, max, step }) => (
  <div className="relative w-full h-1 bg-secondary rounded-full">
    <div 
      className="absolute top-0 left-0 h-full bg-primary rounded-l-full" 
      style={{ width: `${((value - min) / (max - min)) * 100}%` }} 
    />
    <Slider 
      value={[value]} 
      onValueChange={(newValue) => onChange(newValue[0])} 
      min={min} 
      max={max} 
      step={step} 
      className="absolute inset-0" 
    />
  </div>
)

export default function TopographicMap() {
  const [mapSize, setMapSize] = useState(10)
  const [speed, setSpeed] = useState(0.75)
  const [generalTopography, setGeneralTopography] = useState(0.42)
  const [maxElevation, setMaxElevation] = useState(1.48)
  const [warping, setWarping] = useState(2.19)
  const [lineColorMode, setLineColorMode] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [elevationColorMode, setElevationColorMode] = useState(true)
  const [highElevationColor, setHighElevationColor] = useState("#7F7F7F")
  const [lowElevationColor, setLowElevationColor] = useState("#000000")
  const [elevationColorStrength, setElevationColorStrength] = useState(1.50)
  const [elevationColorDiffusion, setElevationColorDiffusion] = useState(2.00)

  const randomize = () => {
    setGeneralTopography(Math.random())
    setMaxElevation(Math.random() * 5)
    setWarping(Math.random() * 3)
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
          <color attach="background" args={[backgroundColor]} />
          <Terrain
            mapSize={mapSize}
            speed={speed}
            generalTopography={generalTopography}
            maxElevation={maxElevation}
            warping={warping}
            highColor={highElevationColor}
            lowColor={lowElevationColor}
            colorStrength={elevationColorStrength}
            colorDiffusion={elevationColorDiffusion}
          />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>
      <div className="w-64 p-3 bg-card text-card-foreground overflow-y-auto text-xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="transformTo2D" className="text-xs">Transform to 2D plane</Label>
            <Switch
              id="transformTo2D"
              checked={false}
              onCheckedChange={() => {}}
              className="scale-75"
            />
          </div>
          {[
            { label: "Size of the map", value: mapSize, setValue: setMapSize, min: 1, max: 20, step: 0.1 },
            { label: "Speed", value: speed, setValue: setSpeed, min: 0, max: 1, step: 0.01 },
            { label: "General topography", value: generalTopography, setValue: setGeneralTopography, min: 0, max: 1, step: 0.01 },
            { label: "Max. elevation", value: maxElevation, setValue: setMaxElevation, min: 0, max: 5, step: 0.01 },
            { label: "Warping", value: warping, setValue: setWarping, min: 0, max: 3, step: 0.01 },
            { label: "Elevation color strength", value: elevationColorStrength, setValue: setElevationColorStrength, min: 0, max: 3, step: 0.01 },
            { label: "Elevation color diffusion", value: elevationColorDiffusion, setValue: setElevationColorDiffusion, min: 0, max: 5, step: 0.01 },
          ].map(({ label, value, setValue, min, max, step }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor={label} className="text-xs">{label}</Label>
                <Input
                  id={label}
                  type="number"
                  value={value.toFixed(2)}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-16 h-5 text-xs bg-input text-input-foreground"
                  min={min}
                  max={max}
                  step={step}
                />
              </div>
              <CustomSlider value={value} onChange={setValue} min={min} max={max} step={step} />
            </div>
          ))}
          <Button onClick={randomize} className="w-full h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">Randomize</Button>
          <div className="flex items-center justify-between">
            <Label htmlFor="lineColorMode" className="text-xs">Activate line color mode</Label>
            <Switch
              id="lineColorMode"
              checked={lineColorMode}
              onCheckedChange={setLineColorMode}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="elevationColorMode" className="text-xs">Activate elevation color mode</Label>
            <Switch
              id="elevationColorMode"
              checked={elevationColorMode}
              onCheckedChange={setElevationColorMode}
              className="scale-75"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="highElevationColor" className="text-xs">High elevation color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="highElevationColor"
                type="color"
                value={highElevationColor}
                onChange={(e) => setHighElevationColor(e.target.value)}
                className="w-8 h-5 p-0 bg-transparent border-0"
              />
              <Input
                type="text"
                value={highElevationColor}
                onChange={(e) => setHighElevationColor(e.target.value)}
                className="flex-1 h-5 text-xs bg-input text-input-foreground"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lowElevationColor" className="text-xs">Low elevation color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="lowElevationColor"
                type="color"
                value={lowElevationColor}
                onChange={(e) => setLowElevationColor(e.target.value)}
                className="w-8 h-5 p-0 bg-transparent border-0"
              />
              <Input
                type="text"
                value={lowElevationColor}
                onChange={(e) => setLowElevationColor(e.target.value)}
                className="flex-1 h-5 text-xs bg-input text-input-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}