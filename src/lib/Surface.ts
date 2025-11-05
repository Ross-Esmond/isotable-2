import { List, Map, Set } from 'immutable';
import * as THREE from 'three';
import { Camera } from './Camera';
import { EventType } from './Event';
import { processEvents } from './eventProcessor';
import { takeSnowportId } from './logicClock';
import type { DragEvent, Event, GrabEvent } from './Event';

const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

export class Surface {
  readonly camera: Camera;

  readonly priorEvents: List<Event>;
  readonly events: List<Event>;

  readonly meshes: Map<number, THREE.Mesh>;
  private readonly threeScene: THREE.Scene;
  private readonly threeCamera: THREE.Camera;

  private constructor(
    camera: Camera,
    priorEvents: List<Event>,
    events: List<Event>,
    meshes: Map<number, THREE.Mesh>,
    threeScene: THREE.Scene,
    threeCamera: THREE.Camera,
  ) {
    this.camera = camera;

    this.priorEvents = priorEvents;
    this.events = events;

    this.meshes = meshes;
    this.threeScene = threeScene;
    this.threeCamera = threeCamera;
  }

  static create(): Surface {
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0, 200);
    camera.position.z = 100;
    const events = List<Event>();
    return new Surface(
      new Camera(),
      events,
      events,
      Map<number, THREE.Mesh>(),
      new THREE.Scene(),
      camera,
    );
  }

  setCamera(camera: Camera): Surface {
    return new Surface(
      camera,
      this.priorEvents,
      this.events,
      this.meshes,
      this.threeScene,
      this.threeCamera,
    );
  }

  updateCamera(fn: (camera: Camera) => Camera): Surface {
    return this.setCamera(fn(this.camera));
  }

  setDatabaseEvents(events: Array<Event>): Surface {
    let ids = this.events.reduce((ids, { snowportId }) => ids.add(snowportId), Set<number>());
    const nextEvents = this.events.asMutable();
    for (const event of events) {
      if (!ids.has(event.snowportId)) {
        nextEvents.push(event);
      }
    }

    return new Surface(
      this.camera,
      this.priorEvents,
      nextEvents.asImmutable(),
      this.meshes,
      this.threeScene,
      this.threeCamera,
    );
  }

  private addEvent(event: Event): Surface {
    return new Surface(
      this.camera,
      this.priorEvents,
      this.events.push(event),
      this.meshes,
      this.threeScene,
      this.threeCamera,
    );
  }

  grab(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Surface {
    const [components] = processEvents(this.events, this.events);
    let result = null;
    const [xWorld, yWorld] = this.camera.getWorldPosition(x, y, width, height);
    for (const component of components) {
      const halfWidth = component.width / 2;
      const halfHeight = component.height / 2;
      if (
        xWorld >= component.x - halfWidth &&
        xWorld <= component.x + halfWidth &&
        yWorld >= component.y - halfHeight &&
        yWorld <= component.y + halfHeight
      ) {
        if (result === null || component.z > result.z) {
          result = component;
        }
      }
    }
    if (result !== null) {
      return this.addEvent({
          entity: 0,
          type: EventType.Grab,
          snowportId: takeSnowportId(),
          pointerId: id,
          componentId: result.id,
          xOffset: xWorld - result.x,
          yOffset: yWorld - result.y,
        } as GrabEvent);
    } else {
      return this.setCamera(this.camera.addPointer(id, x, y, width, height));
    }
  }

  drag(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Surface {
    const [components] = processEvents(this.events, this.events);
    const component = components.find((c) => c.grab?.pointerId === id);
    if (component?.grab) {
      const [xWorld, yWorld] = this.camera.getWorldPosition(
        x,
        y,
        width,
        height,
      );
      return this.addEvent({
          entity: 0,
          type: EventType.Drag,
          snowportId: takeSnowportId(),
          pointerId: id,
          componentId: component.id,
          x: xWorld - component.grab.offsetX,
          y: yWorld - component.grab.offsetY,
        } as DragEvent);
    } else {
      return this.setCamera(this.camera.updatePointer(id, x, y, width, height));
    }
  }

  drop(id: number): Surface {
    const [components] = processEvents(this.events, this.events);
    const component = components.find((c) => c.grab?.pointerId === id);
    if (component?.grab) {
      return this.addEvent({
          entity: 0,
          type: EventType.Drop,
          snowportId: takeSnowportId(),
          pointerId: id,
          componentId: component.id,
        });
    } else {
      return this.setCamera(this.camera.removePointer(id));
    }
  }

  render(renderer: THREE.WebGLRenderer): Surface {
    const [width, height] = renderer.getSize(new THREE.Vector2());
    this.camera.apply(this.threeCamera, width, height);

    const [existingComponents, createdComponents] = processEvents(
      this.events,
      this.priorEvents,
    );

    const meshes = this.meshes.asMutable();

    for (const component of createdComponents) {
      const geometry = new THREE.BoxGeometry(
        component.width,
        component.height,
        0.02,
      );

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(component.x, component.y, component.z);
      this.threeScene.add(mesh);
      meshes.set(component.id, mesh);
    }

    for (const component of existingComponents) {
      const mesh = this.meshes.get(component.id);
      if (mesh) {
        mesh.position.set(component.x, component.y, component.z);
      }
    }

    renderer.render(this.threeScene, this.threeCamera);

    return new Surface(
      this.camera,
      this.events,
      this.events,
      meshes.asImmutable(),
      this.threeScene,
      this.threeCamera,
    );
  }
}
