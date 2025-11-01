import { nanoid } from 'nanoid'

export class Component {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly z: number = 0
  readonly width: number
  readonly height: number
  readonly color: number = 0xffffff

  private constructor(id: string, x = 0, y = 0, width = 6.35, height = 8.89) {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  static create(x: number, y: number): Component {
    return new Component(nanoid(), x, y)
  }

  setPosition(x: number, y: number): Component {
    return new Component(this.id, x, y)
  }
}
