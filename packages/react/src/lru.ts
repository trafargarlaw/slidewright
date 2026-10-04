/** A small map that forgets its least recently used entries. */
export class LruCache<K, V> {
  readonly #entries = new Map<K, V>();
  readonly #limit: number;

  constructor(limit: number) {
    this.#limit = limit;
  }

  get(key: K): V | undefined {
    const value = this.#entries.get(key);
    if (value !== undefined) {
      this.#entries.delete(key);
      this.#entries.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.#entries.delete(key);
    this.#entries.set(key, value);
    if (this.#entries.size > this.#limit) {
      const oldest = this.#entries.keys().next();
      if (!oldest.done) this.#entries.delete(oldest.value);
    }
  }
}
