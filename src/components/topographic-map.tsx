"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// ... (vertex and fragment shaders remain unchanged)

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
  // ... (Terrain component remains unchanged)
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

export default function AnimatedTopographicMap() {
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