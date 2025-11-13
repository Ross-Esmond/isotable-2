import { Map } from 'immutable';
import { EventType } from './Event';
import { Component } from './Component';
import type {
  CreatedEvent,
  DragEvent,
  DropEvent,
  Event,
  GrabEvent,
} from './Event';

let lastEvents = Map<number, Event>();
let lastComponents = Map<number, Component>();

export function resetEvents() {
  lastEvents = Map<number, Event>();
  lastComponents = Map<number, Component>();
}

export function processEvents(nextEvents: Map<number, Event>): Map<number, Component> {
  const lastKeys = lastEvents.keySeq().toSet();
  const nextKeys = nextEvents.keySeq().toSet();

  const nextComponents = lastComponents.asMutable();

  const lastOnly = lastKeys.subtract(nextKeys);
  const nextOnly = nextKeys.subtract(lastKeys);

  if (!lastOnly.isEmpty()) {
    throw new Error('events were removed');
  }

  const grabs = Map<number, [number, number, [number, number]]>().asMutable();
  const moves = Map<number, [number, [number, number]]>().asMutable();
  const drops = Map<number, [number, number]>().asMutable();

  for (const nextKey of nextOnly) {
    const event = nextEvents.get(nextKey)!;
    if (event.type === EventType.Create) {
      const { componentId, x, y } = event as CreatedEvent;
      nextComponents.set(
        componentId,
        Component.create(componentId, x, y),
      );
    } else if (event.type === EventType.Grab) {
      const { componentId, pointerId, snowportId, x, y } = event as GrabEvent;
      grabs.update(
        componentId,
        [-1, 0, [0, 0]],
        ([lastId, id, [lastX, lastY]]) => (
          snowportId > lastId ? [snowportId, pointerId, [x, y]] : [lastId, id, [lastX, lastY]]
        ),
      );
    } else if (event.type === EventType.Drag) {
      const { componentId, snowportId, x, y } = event as DragEvent;
      moves.update(
        componentId,
        [-1, [0, 0]],
        ([lastId, [lastX, lastY]]) => (
          snowportId > lastId ? [snowportId, [x, y]] : [lastId, [lastX, lastY]]
        ),
      );
    } else if (event.type === EventType.Drop) {
      const { componentId, pointerId, snowportId } = event as DropEvent;
      drops.update(
        componentId,
        [-1, 0],
        ([lastId, id]) => (
          snowportId > lastId ? [snowportId, pointerId] : [lastId, id]
        ),
      );
    }
  }

  for (const [id, [snowportId, pointerId, [x, y]]] of grabs) {
    nextComponents.update(id, (component) => {
      if (component == null) {
        throw new Error('component was grabbed but did not yet exist');
      }
      return component.setGrab(snowportId, pointerId, x, y);
    });
  }

  for (const [id, [, [x, y]]] of moves) {
    nextComponents.update(id, (component) => {
      if (component == null) {
        throw new Error('component was moved but did not yet exist');
      }
      return component.setPosition(x, y);
    });
  }

  for (const [id, [snowportId]] of drops) {
    nextComponents.update(id, (component) => {
      if (component == null) {
        throw new Error('component was dropped but did not yet exist');
      }
      // TODO deal with multiple pointerIds
      if ((component.grab?.snowportId ?? -1) < snowportId) {
        return component.removeGrab();
      };
    });
  }

  lastEvents = nextEvents;
  lastComponents = nextComponents.asImmutable();

  return lastComponents;
}
