export interface RoomModelOperations<TModel> {
  parse(source: string): Promise<TModel>;
  attach(model: TModel): void;
  detach(model: TModel): void;
  dispose(model: TModel): void;
}

export interface RoomModelDiagnostics {
  visibleRoomId: string | null;
  cachedRoomIds: string[];
  parseCountByRoom: Record<string, number>;
}

export class RoomModelRegistry<TModel> {
  private cache = new Map<string, TModel>();
  private visibleRoomId: string | null = null;
  private parseCountByRoom = new Map<string, number>();
  private generationByRoom = new Map<string, number>();
  private currentGeneration = 0;

  private operations: RoomModelOperations<TModel>;

  constructor(operations: RoomModelOperations<TModel>) {
    this.operations = operations;
  }

  async load(roomId: string, source: string): Promise<TModel> {
    const generation = this.generation(roomId);
    const model = await this.operations.parse(source);
    if (generation !== this.generationByRoom.get(roomId)) {
      this.operations.dispose(model);
      return this.cache.get(roomId) as TModel;
    }
    this.replaceCached(roomId, model);
    return model;
  }

  async replace(roomId: string, source: string): Promise<TModel> {
    const model = await this.load(roomId, source);
    if (this.visibleRoomId === roomId) {
      this.operations.attach(model);
    }
    return model;
  }

  show(roomId: string): TModel | null {
    if (this.visibleRoomId === roomId) {
      return this.cache.get(roomId) ?? null;
    }
    this.hideCurrent();
    const model = this.cache.get(roomId) ?? null;
    if (model) {
      this.visibleRoomId = roomId;
      this.operations.attach(model);
    } else {
      this.visibleRoomId = roomId;
    }
    return model;
  }

  hideCurrent(): void {
    if (this.visibleRoomId) {
      const model = this.cache.get(this.visibleRoomId);
      if (model) {
        this.operations.detach(model);
      }
    }
    this.visibleRoomId = null;
  }

  remove(roomId: string): void {
    this.hideIfVisible(roomId);
    const model = this.cache.get(roomId);
    if (model) {
      this.operations.dispose(model);
      this.cache.delete(roomId);
      this.generation(roomId);
    }
  }

  dispose(): void {
    this.hideCurrent();
    for (const model of this.cache.values()) {
      this.operations.dispose(model);
    }
    this.cache.clear();
    this.parseCountByRoom.clear();
    this.generationByRoom.clear();
  }

  diagnostics(): RoomModelDiagnostics {
    return {
      visibleRoomId: this.visibleRoomId,
      cachedRoomIds: [...this.cache.keys()],
      parseCountByRoom: Object.fromEntries(this.parseCountByRoom),
    };
  }

  private replaceCached(roomId: string, model: TModel) {
    const previous = this.cache.get(roomId);
    if (previous) {
      this.operations.dispose(previous);
    }
    this.cache.set(roomId, model);
    this.parseCountByRoom.set(roomId, (this.parseCountByRoom.get(roomId) ?? 0) + 1);
    if (this.visibleRoomId === roomId) {
      this.operations.attach(model);
    }
  }

  private hideIfVisible(roomId: string) {
    if (this.visibleRoomId === roomId) {
      const model = this.cache.get(roomId);
      if (model) {
        this.operations.detach(model);
      }
      this.visibleRoomId = null;
    }
  }

  private generation(roomId: string): number {
    this.currentGeneration += 1;
    this.generationByRoom.set(roomId, this.currentGeneration);
    return this.currentGeneration;
  }
}
