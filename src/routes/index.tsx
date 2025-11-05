import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import type { DatabaseEvent, Event } from '@/lib/Event';
import supabase from '@/lib/supabase';
import { Surface } from '@/lib/Surface';
import { createDatabaseUpserts, processDatabaseEvent } from '@/lib/Event';

export const Route = createFileRoute('/')({ component: App });

function App() {
  const shell = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const surfaceRef = useRef<Surface | null>(null);

  const queryClient = useQueryClient();

  const { data: databaseEvents } = useQuery<Array<Event>>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('*');
      return (data || []).map((event) =>
        processDatabaseEvent(event as DatabaseEvent),
      );
    },
    throwOnError: true,
  });

  useEffect(() => {
    supabase.channel('changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => queryClient.invalidateQueries({ queryKey: ['events'] }),
      )
      .subscribe();
  }, []);

  useEffect(() => {
    if (surfaceRef.current == null) {
      surfaceRef.current = Surface.create().setDatabaseEvents(databaseEvents ?? []);
    } else {
      surfaceRef.current = surfaceRef.current.setDatabaseEvents(databaseEvents ?? []);
    }
  }, [databaseEvents]);

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
      surfaceRef.current = surfaceRef.current?.render(renderer) ?? null;
    }
    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      shell.current?.removeChild(renderer.domElement);
    };
  }, [shell.current]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    surfaceRef.current =
      surfaceRef.current?.updateCamera((camera) =>
        camera.zoom(event.deltaY / 120),
      ) ?? null;
  }

  function pointerdown(event: PointerEvent) {
    shell.current?.setPointerCapture(event.pointerId);
    surfaceRef.current =
      surfaceRef.current?.grab(
        event.pointerId,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      ) ?? null;
  }

  function pointermove(event: PointerEvent) {
    surfaceRef.current =
      surfaceRef.current?.drag(
        event.pointerId,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      ) ?? null;

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
  }

  function pointerup(event: PointerEvent) {
    shell.current?.releasePointerCapture(event.pointerId);
    surfaceRef.current = surfaceRef.current?.drop(event.pointerId) ?? null;
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
