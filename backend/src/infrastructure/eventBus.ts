// src/infrastructure/eventBus.ts
// In-process event bus — đủ dùng cho service-based architecture
// Nếu scale lên microservices thì thay bằng Redis Pub/Sub hoặc RabbitMQ

type Handler = (payload: unknown) => void | Promise<void>;

export class SimpleEventBus {
  private handlers: Map<string, Handler[]> = new Map();

  subscribe(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    console.log(`[EventBus] Subscribed to "${event}"`);
  }

  async publish(event: string, payload: unknown): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    if (handlers.length === 0) {
      console.warn(`[EventBus] No handlers for "${event}"`);
      return;
    }
    console.log(`[EventBus] Publishing "${event}" to ${handlers.length} handler(s)`);
    // Chạy song song tất cả handlers
    await Promise.allSettled(
      handlers.map(h =>
        Promise.resolve(h(payload)).catch(err =>
          console.error(`[EventBus] Handler error for "${event}":`, err)
        )
      )
    );
  }
}
