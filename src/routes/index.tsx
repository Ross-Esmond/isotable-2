import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent} from 'react';
import supabase from '@/lib/supabase'
import { Component } from '@/lib/Component'
import { Surface } from '@/lib/Surface'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const shell = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const surfaceRef = useRef<Surface | null>(null)

  useEffect(() => {
    surfaceRef.current = Surface.create().addComponents([
      Component.create(0, 0),
      Component.create(10, 0),
      Component.create(-10, 0),
    ])
  }, [])

  const { data: components } = useQuery<Array<Component>>({
    queryKey: ['components'],
    queryFn: async () => {
      const { data } = await supabase.from('components').select('*')
      return data || []
    },
  })

  useEffect(() => {
    if (shell.current == null) return

    if (rendererRef.current == null) {
      rendererRef.current = new THREE.WebGLRenderer()
    }

    const renderer = rendererRef.current
    renderer.setSize(window.innerWidth, window.innerHeight)

    window.onresize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    shell.current?.appendChild(renderer.domElement)

    function animate() {
      surfaceRef.current = surfaceRef.current?.render(renderer) ?? null
    }
    renderer.setAnimationLoop(animate)

    return () => {
      renderer.setAnimationLoop(null)
      shell.current?.removeChild(renderer.domElement)
    }
  }, [shell.current])

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose()
    }
  }, [])

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    surfaceRef.current =
      surfaceRef.current?.updateCamera((camera) =>
        camera.zoom(event.deltaY / 120),
      ) ?? null
  }

  function pointerdown(event: PointerEvent) {
    shell.current?.setPointerCapture(event.pointerId)
    surfaceRef.current =
      surfaceRef.current?.grab(
        event.pointerId,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      ) ?? null
  }

  function pointermove(event: PointerEvent) {
    surfaceRef.current =
      surfaceRef.current?.drag(
        event.pointerId,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      ) ?? null
  }

  function pointerup(event: PointerEvent) {
    shell.current?.releasePointerCapture(event.pointerId)
    surfaceRef.current = surfaceRef.current?.drop(event.pointerId) ?? null
  }

  return (
    <div
      ref={shell}
      className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      onWheel={onWheel}
      onPointerDown={pointerdown}
      onPointerMove={pointermove}
      onPointerUp={pointerup}
    ></div>
  )
}
