import type { Signal } from './signal.js';

type SignalHandler = (signal: Signal) => void;

export class SignalBus {
  private subscribers = new Map<string, Set<SignalHandler>>();
  private signals: Signal[] = [];

  on(topicPattern: string, handler: SignalHandler): void {
    if (!this.subscribers.has(topicPattern)) {
      this.subscribers.set(topicPattern, new Set());
    }
    this.subscribers.get(topicPattern)!.add(handler);
  }

  off(topicPattern: string, handler: SignalHandler): void {
    this.subscribers.get(topicPattern)?.delete(handler);
  }

  emit(signal: Signal): void {
    this.signals.push(signal);

    for (const [pattern, handlers] of this.subscribers) {
      if (this.matches(signal.topic, pattern)) {
        for (const handler of handlers) {
          handler(signal);
        }
      }
    }
  }

  history(missionId?: string): Signal[] {
    if (missionId) {
      return this.signals.filter((s) => s.missionId === missionId);
    }
    return [...this.signals];
  }

  clearHistory(): void {
    this.signals = [];
  }

  private matches(topic: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return topic.startsWith(prefix + '.') || topic === prefix;
    }
    return topic === pattern;
  }
}
