"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Moon, Sun, Shuffle, ChevronRight, ChevronLeft } from "lucide-react"
import { useTheme } from "next-themes"

const vertexShader = `
  uniform float uTime;
  uniform float uElevation;
  uniform float uSpeed;
  uniform float uWarping;
  uniform float uRidgeFrequency;
  uniform float uRidgeHeight;
  uniform float uTurbulence;
  uniform bool uTransformTo2D;
  varying float vElevation;
  varying vec2 vUv;

  //	Classic Perlin 3D Noise 
  //	by Stefan Gustavson
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
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    float baseElevation = cnoise(vec3(modelPosition.x * uWarping, modelPosition.z * uWarping - uTime * uSpeed, 0.0)) * uElevation;
    float ridges = sin(modelPosition.x * uRidgeFrequency + modelPosition.z * uRidgeFrequency) * uRidgeHeight;
    float turbulence = cnoise(vec3(modelPosition.x * 2.0, modelPosition.z * 2.0, uTime * 0.1)) * uTurbulence;
    float elevation = baseElevation + ridges + turbulence;
    
    if (uTransformTo2D) {
      modelPosition.y = 0.0;
    } else {
      modelPosition.y += elevation;
    }
    
    vElevation = elevation;
    
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`

const fragmentShader = `
  uniform vec3 uLowColor;
  uniform vec3 uHighColor;
  uniform float uColorStrength;
  uniform float uColorDiffusion;
  uniform bool uLineColorMode;
  uniform vec3 uLineColor;
  uniform float uLineThickness;
  uniform float uLineHeight;
  
  varying float vElevation;
  varying vec2 vUv;

  void main() {
    float mixStrength = (vElevation + uColorDiffusion) * uColorStrength;
    vec3 color = mix(uLowColor, uHighColor, mixStrength);

    if (uLineColorMode) {
      float lineIntensity = mod(vElevation * uLineHeight, uLineThickness) / uLineThickness;
      lineIntensity = step(0.5, lineIntensity);
      color = mix(uLineColor, color, lineIntensity);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

function Terrain({ 
  mapSize,
  speed,
  generalTopography, 
  maxElevation, 
  warping,
  ridgeFrequency,
  ridgeHeight,
  turbulence,
  highColor,
  lowColor,
  colorStrength,
  colorDiffusion,
  lineColorMode,
  lineColor,
  lineThickness,
  lineHeight,
  transformTo2D
}) {
  const mesh = useRef()
  const uniforms = useRef({
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uElevation: { value: maxElevation },
    uWarping: { value: warping },
    uRidgeFrequency: { value: ridgeFrequency },
    uRidgeHeight: { value: ridgeHeight },
    uTurbulence: { value: turbulence },
    uLowColor: { value: new THREE.Color(lowColor) },
    uHighColor: { value: new THREE.Color(highColor) },
    uColorStrength: { value: colorStrength },
    uColorDiffusion: { value: colorDiffusion },
    uLineColorMode: { value: lineColorMode },
    uLineColor: { value: new THREE.Color(lineColor) },
    uLineThickness: { value: lineThickness },
    uLineHeight: { value: lineHeight },
    uTransformTo2D: { value: transformTo2D }
  })

  useFrame((state) => {
    const { clock } = state
    mesh.current.material.uniforms.uTime.value = clock.getElapsedTime()
    mesh.current.material.uniforms.uSpeed.value = speed
    mesh.current.material.uniforms.uElevation.value = maxElevation
    mesh.current.material.uniforms.uWarping.value = warping
    mesh.current.material.uniforms.uRidgeFrequency.value = ridgeFrequency
    mesh.current.material.uniforms.uRidgeHeight.value = ridgeHeight
    mesh.current.material.uniforms.uTurbulence.value = turbulence
    mesh.current.material.uniforms.uLowColor.value = new THREE.Color(lowColor)
    mesh.current.material.uniforms.uHighColor.value = new THREE.Color(highColor)
    mesh.current.material.uniforms.uColorStrength.value = colorStrength
    mesh.current.material.uniforms.uColorDiffusion.value = colorDiffusion
    mesh.current.material.uniforms.uLineColorMode.value = lineColorMode
    mesh.current.material.uniforms.uLineColor.value = new THREE.Color(lineColor)
    mesh.current.material.uniforms.uLineThickness.value = lineThickness
    mesh.current.material.uniforms.uLineHeight.value = lineHeight
    mesh.current.material.uniforms.uTransformTo2D.value = transformTo2D
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

const CustomSlider = ({ value, onChange, min, max, step, label }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Label htmlFor={label} className="text-xs">{label}</Label>
      <span className="text-xs text-muted-foreground">{value.toFixed(2)}</span>
    </div>
    <Slider
      id={label}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(newValue) => onChange(newValue[0])}
    />
  </div>
)

const ColorInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={label} className="text-xs">{label}</Label>
    <div className="flex items-center space-x-2">
      <Input
        id={label}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 p-0 border-none"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-8 text-xs"
      />
    </div>
  </div>
)

export default function TopographicMapGenerator() {
  const { theme, setTheme } = useTheme()
  const [mapSize, setMapSize] = useState(10)
  const [speed, setSpeed] = useState(0.1)
  const [generalTopography, setGeneralTopography] = useState(0.2)
  const [maxElevation, setMaxElevation] = useState(2)
  const [warping, setWarping] = useState(0.5)
  const [ridgeFrequency, setRidgeFrequency] = useState(5)
  const [ridgeHeight, setRidgeHeight] = useState(0.1)
  const [turbulence, setTurbulence] = useState(0.1)
  const [lineColorMode, setLineColorMode] = useState(true)
  const [lineColor, setLineColor] = useState("#ffffff")
  const [lineThickness, setLineThickness] = useState(0.05)
  const [lineHeight, setLineHeight] = useState(20)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [highElevationColor, setHighElevationColor] = useState("#ffffff")
  const [lowElevationColor, setLowElevationColor] = useState("#000000")
  const [elevationColorStrength, setElevationColorStrength] = useState(1.5)
  const [elevationColorDiffusion, setElevationColorDiffusion] = useState(0.5)
  const [transformTo2D, setTransformTo2D] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const randomize = () => {
    setGeneralTopography(Math.random())
    setMaxElevation(Math.random() * 3 + 1)
    setWarping(Math.random() * 1.5)
    setRidgeFrequency(Math.random() * 10 + 1)
    setRidgeHeight(Math.random() * 0.2)
    setTurbulence(Math.random() * 0.2)
    setLineThickness(Math.random() * 0.1)
    setLineHeight(Math.random() * 30 + 10)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 2, 3], fov: 75 }}>
          <color attach="background" args={[backgroundColor]} />
          <Terrain
            mapSize={mapSize}
            speed={speed}
            generalTopography={generalTopography}
            maxElevation={maxElevation}
            warping={warping}
            ridgeFrequency={ridgeFrequency}
            ridgeHeight={ridgeHeight}
            turbulence={turbulence}
            highColor={highElevationColor}
            lowColor={lowElevationColor}
            colorStrength={elevationColorStrength}
            colorDiffusion={elevationColorDiffusion}
            lineColorMode={lineColorMode}
            lineColor={lineColor}
            lineThickness={lineThickness}
            lineHeight={lineHeight}
            transformTo2D={transformTo2D}
          />
          <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        </Canvas>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      {sidebarOpen && (
        <div className="w-80 p-4 bg-card text-card-foreground overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Topographic Map Generator</h2>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <Accordion type="multiple" defaultValue={["miscellaneous", "topography", "color"]} className="w-full">
            <AccordionItem value="miscellaneous">
              <AccordionTrigger>Miscellaneous</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="transformTo2D" className="text-sm">Transform to 2D plane</Label>
                    <Switch
                      id="transformTo2D"
                      checked={transformTo2D}
                      onCheckedChange={setTransformTo2D}
                    />
                  </div>
                  <CustomSlider label="Size of the map" value={mapSize} onChange={setMapSize} min={1} max={20} step={0.1} />
                  <CustomSlider label="Speed" value={speed} onChange={setSpeed} min={0} max={1} step={0.01} />
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="topography">
              <AccordionTrigger>Topography</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <CustomSlider label="General topography" value={generalTopography} onChange={setGeneralTopography} min={0} max={1} step={0.01} />
                  <CustomSlider label="Max. elevation" value={maxElevation} onChange={setMaxElevation} min={0} max={5} step={0.01} />
                  <CustomSlider label="Warping" value={warping} onChange={setWarping} min={0} max={3} step={0.01} />
                  <CustomSlider label="Ridge frequency" value={ridgeFrequency} onChange={setRidgeFrequency} min={0} max={20} step={0.1} />
                  <CustomSlider label="Ridge height" value={ridgeHeight} onChange={setRidgeHeight} min={0} max={0.5} step={0.01} />
                  <CustomSlider label="Turbulence" value={turbulence} onChange={setTurbulence} min={0} max={0.5} step={0.01} />
                  <Button onClick={randomize} className="w-full">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Randomize
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="color">
              <AccordionTrigger>Color</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lineColorMode" className="text-sm">Activate line color mode</Label>
                    <Switch
                      id="lineColorMode"
                      checked={lineColorMode}
                      onCheckedChange={setLineColorMode}
                    />
                  </div>
                  <ColorInput label="Line color" value={lineColor} onChange={setLineColor} />
                  <CustomSlider label="Line thickness" value={lineThickness} onChange={setLineThickness} min={0} max={0.2} step={0.001} />
                  <CustomSlider label="Line height" value={lineHeight} onChange={setLineHeight} min={1} max={50} step={0.1} />
                  <ColorInput label="Background color" value={backgroundColor} onChange={setBackgroundColor} />
                  <ColorInput label="High elevation color" value={highElevationColor} onChange={setHighElevationColor} />
                  <ColorInput label="Low elevation color" value={lowElevationColor} onChange={setLowElevationColor} />
                  <CustomSlider label="Elevation color strength" value={elevationColorStrength} onChange={setElevationColorStrength} min={0} max={3} step={0.01} />
                  <CustomSlider label="Elevation color diffusion" value={elevationColorDiffusion} onChange={setElevationColorDiffusion} min={0} max={5} step={0.01} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  )
}