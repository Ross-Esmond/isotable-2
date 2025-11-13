import { createFileRoute } from '@tanstack/react-router';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import supabase from '@/lib/supabase';
import {useSupabaseSurface} from '@/lib/SupabaseSurface';

export const Route = createFileRoute('/')({ component: App });

function App() {
  const shell = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [render, setSurface] = useSupabaseSurface(supabase);

  useEffect(() => {
    if (shell.current == null) return;

    if (rendererRef.current == null) {
      rendererRef.current = new THREE.WebGLRenderer();
    }

    const renderer = rendererRef.current;
    renderer.setSize(window.innerWidth, window.innerHeight);

    window.onresize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    shell.current.appendChild(renderer.domElement);

    function animate() {
      render(renderer);
    }
    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      shell.current?.removeChild(renderer.domElement);
    };
  });

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    setSurface(surface => surface.updateCamera((camera) =>
      camera.zoom(event.deltaY / 120),
    ));
  }

  function pointerdown(event: PointerEvent) {
    shell.current?.setPointerCapture(event.pointerId);
    setSurface(surface => surface.grab(
      event.pointerId,
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    ));
  }

  function pointermove(event: PointerEvent) {
    setSurface(surface => surface.drag(
      event.pointerId,
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    ));
    /*
    if (
      databaseEvents != null &&
      surfaceRef.current != null &&
      surfaceRef.current.events.count() > databaseEvents.length
    ) {
      const what = supabase
        .from('events')
        .upsert(
          createDatabaseUpserts(databaseEvents, surfaceRef.current.events),
        );
      what.then((what) => { console.log(what) });
    }
     */
  }

  function pointerup(event: PointerEvent) {
    shell.current?.releasePointerCapture(event.pointerId);
    setSurface(surface => surface.drop(event.pointerId));
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
  );
}
