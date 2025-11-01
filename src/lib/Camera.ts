import * as THREE from 'three'
import { Map } from 'immutable'

export class Camera {
  readonly x: number
  readonly y: number
  readonly squareSize: number
  readonly pointers: Map<number, { x: number; y: number }>

  constructor(
    x = 0,
    y = 0,
    squareSize = 100,
    pointers = Map<number, { x: number; y: number }>(),
  ) {
    this.x = x
    this.y = y
    this.squareSize = squareSize
    this.pointers = pointers
  }

  setPosition(x: number, y: number): Camera {
    return new Camera(x, y, this.squareSize, this.pointers)
  }

  updatePosition(fn: (x: number, y: number) => [number, number]): Camera {
    const [newX, newY] = fn(this.x, this.y)
    return new Camera(newX, newY, this.squareSize, this.pointers)
  }

  setSquareSize(squareSize: number): Camera {
    return new Camera(this.x, this.y, squareSize, this.pointers)
  }

  updateSquareSize(fn: (size: number) => number): Camera {
    return new Camera(this.x, this.y, fn(this.squareSize), this.pointers)
  }

  zoom(factor: number): Camera {
    return this.updateSquareSize((s) => Math.max(10, s + factor * 10))
  }

  getWorldPosition(
    x: number,
    y: number,
    width: number,
    height: number,
  ): [number, number] {
    const actualSquareSide = Math.min(width, height)
    const xCentered = (x - width / 2) / actualSquareSide
    const yCentered = (y - height / 2) / actualSquareSide
    const worldX2 = this.x + xCentered * this.squareSize
    const worldY2 = this.y - yCentered * this.squareSize
    return [worldX2, worldY2]
  }

  addPointer(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Camera {
    const [worldX, worldY] = this.getWorldPosition(x, y, width, height)
    return new Camera(
      this.x,
      this.y,
      this.squareSize,
      this.pointers.set(id, { x: worldX, y: worldY }),
    )
  }

  updatePointer(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Camera {
    if (!this.pointers.has(id)) {
      return this
    }

    const [worldXnext, worldYnext] = this.getWorldPosition(x, y, width, height)
    const { x: worldX, y: worldY } = this.pointers.get(id)!
    return this.setPosition(
      this.x + worldX - worldXnext,
      this.y + worldY - worldYnext,
    )
  }

  removePointer(id: number): Camera {
    return new Camera(this.x, this.y, this.squareSize, this.pointers.remove(id))
  }

  apply(actualCamera: THREE.Camera, width: number, height: number): void {
    if (actualCamera instanceof THREE.OrthographicCamera) {
      const ratio = width / height
      if (ratio <= 1) {
        actualCamera.left = -this.squareSize / 2
        actualCamera.right = this.squareSize / 2
        actualCamera.top = this.squareSize / 2 / ratio
        actualCamera.bottom = -(this.squareSize / 2) / ratio
      } else {
        actualCamera.top = this.squareSize / 2
        actualCamera.bottom = -this.squareSize / 2
        actualCamera.left = -(this.squareSize / 2) * ratio
        actualCamera.right = (this.squareSize / 2) * ratio
      }
      actualCamera.position.set(this.x, this.y, actualCamera.position.z)

      actualCamera.updateProjectionMatrix()
    } else {
      throw new Error('Camera.apply only supports OrthographicCamera')
    }
  }
}
