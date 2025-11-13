export interface Grab {
  snowportId: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

export class Component {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number = 0;
  readonly width: number;
  readonly height: number;
  readonly color: number = 0xffffff;
  readonly grab: Grab | null = null;

  private constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    grab: Grab | null,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.grab = grab;
  }

  static create(id: number, x: number, y: number): Component {
    return new Component(id, x, y, 6.35, 8.89, null);
  }

  setPosition(x: number, y: number): Component {
    return new Component(this.id, x, y, this.width, this.height, this.grab);
  }

  setGrab(snowportId: number, pointerId: number, offsetX: number, offsetY: number): Component {
    return new Component(this.id, this.x, this.y, this.width, this.height, {
      snowportId,
      pointerId,
      offsetX,
      offsetY,
    });
  }

  removeGrab(): Component {
    return new Component(
      this.id,
      this.x,
      this.y,
      this.width,
      this.height,
      null,
    );
  }
}
