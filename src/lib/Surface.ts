import { Map } from 'immutable'
import * as THREE from 'three'
import { Camera } from './Camera'
import type { Component } from './Component'

const material = new THREE.MeshBasicMaterial({ color: 0xffffff })

interface grab {
  component: string
  offsetX: number
  offsetY: number
}

export class Surface {
  readonly camera: Camera
  readonly priorComponents: Map<string, Component>
  readonly components: Map<string, Component>
  readonly grabbedComponents: Map<number, grab>
  readonly meshes: Map<string, THREE.Mesh>

  private readonly threeScene: THREE.Scene
  private readonly threeCamera: THREE.Camera

  private constructor(
    camera: Camera,
    priorComponents: Map<string, Component>,
    components: Map<string, Component>,
    grabbedComponents: Map<number, grab>,
    meshes: Map<string, THREE.Mesh>,
    threeScene: THREE.Scene,
    threeCamera: THREE.Camera,
  ) {
    this.camera = camera
    this.priorComponents = priorComponents
    this.components = components
    this.grabbedComponents = grabbedComponents
    this.meshes = meshes
    this.threeScene = threeScene
    this.threeCamera = threeCamera
  }

  static create(): Surface {
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0, 200)
    camera.position.z = 100
    return new Surface(
      new Camera(),
      Map<string, Component>(),
      Map<string, Component>(),
      Map<number, grab>(),
      Map<string, THREE.Mesh>(),
      new THREE.Scene(),
      camera,
    )
  }

  setCamera(camera: Camera): Surface {
    return new Surface(
      camera,
      this.priorComponents,
      this.components,
      this.grabbedComponents,
      this.meshes,
      this.threeScene,
      this.threeCamera,
    )
  }

  updateCamera(fn: (camera: Camera) => Camera): Surface {
    return this.setCamera(fn(this.camera))
  }

  addComponents(components: Array<Component>): Surface {
    let newComponents = this.components
    for (const component of components) {
      newComponents = newComponents.set(component.id, component)
    }
    return this.setComponents(newComponents)
  }

  setComponents(components: Map<string, Component>): Surface {
    return new Surface(
      this.camera,
      this.priorComponents,
      components,
      this.grabbedComponents,
      this.meshes,
      this.threeScene,
      this.threeCamera,
    )
  }

  setGrabbedComponents(grabbedComponents: Map<number, grab>): Surface {
    return new Surface(
      this.camera,
      this.priorComponents,
      this.components,
      grabbedComponents,
      this.meshes,
      this.threeScene,
      this.threeCamera,
    )
  }

  grab(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Surface {
    let result = null
    const [xWorld, yWorld] = this.camera.getWorldPosition(x, y, width, height)
    for (const component of this.components.values()) {
      const halfWidth = component.width / 2
      const halfHeight = component.height / 2
      if (
        xWorld >= component.x - halfWidth &&
        xWorld <= component.x + halfWidth &&
        yWorld >= component.y - halfHeight &&
        yWorld <= component.y + halfHeight
      ) {
        if (result === null || component.z > result.z) {
          result = component
        }
      }
    }
    if (result !== null) {
      return this.setGrabbedComponents(
        this.grabbedComponents.set(id, {
          component: result.id,
          offsetX: xWorld - result.x,
          offsetY: yWorld - result.y,
        }),
      )
    } else {
      return this.setCamera(this.camera.addPointer(id, x, y, width, height))
    }
  }

  drag(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Surface {
    if (this.grabbedComponents.has(id)) {
      const grab = this.grabbedComponents.get(id)!
      const component = this.components.get(grab.component)!
      const [xWorld, yWorld] = this.camera.getWorldPosition(x, y, width, height)
      const updatedComponent = component.setPosition(
        xWorld - grab.offsetX,
        yWorld - grab.offsetY,
      )
      return this.setComponents(
        this.components.set(grab.component, updatedComponent),
      )
    } else {
      return this.setCamera(this.camera.updatePointer(id, x, y, width, height))
    }
  }

  drop(id: number): Surface {
    if (this.grabbedComponents.has(id)) {
      return this.setGrabbedComponents(this.grabbedComponents.remove(id))
    } else {
      return this.setCamera(this.camera.removePointer(id))
    }
  }

  render(renderer: THREE.WebGLRenderer): Surface {
    const [width, height] = renderer.getSize(new THREE.Vector2())
    this.camera.apply(this.threeCamera, width, height)

    const oldKeys = this.priorComponents.keySeq().toSet()
    const newKeys = this.components.keySeq().toSet()
    const onlyNew = newKeys.subtract(oldKeys)
    const both = oldKeys.intersect(newKeys)
    const onlyOld = oldKeys.subtract(newKeys)

    const meshes = this.meshes.asMutable()

    for (const key of onlyNew) {
      const component = this.components.get(key)
      if (component) {
        const geometry = new THREE.BoxGeometry(
          component.width,
          component.height,
          0.02,
        )

        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(component.x, component.y, component.z)
        this.threeScene.add(mesh)
        meshes.set(component.id, mesh)
      }
    }

    for (const key of both) {
      const component = this.components.get(key)
      const mesh = this.meshes.get(key)
      if (component && mesh) {
        mesh.position.set(component.x, component.y, component.z)
      }
    }

    for (const key of onlyOld) {
      const mesh = this.meshes.get(key)
      if (mesh) {
        this.threeScene.remove(mesh)
        meshes.remove(key)
      }
    }

    renderer.render(this.threeScene, this.threeCamera)

    return new Surface(
      this.camera,
      this.components,
      this.components,
      this.grabbedComponents,
      meshes.asImmutable(),
      this.threeScene,
      this.threeCamera,
    )
  }
}
