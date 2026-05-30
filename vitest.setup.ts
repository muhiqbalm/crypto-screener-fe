import '@testing-library/jest-dom/vitest'

// Mock IntersectionObserver (not available in jsdom)
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  observe(_target: Element): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

// Mock ResizeObserver (not available in jsdom)
class ResizeObserverMock implements ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  observe(_target: Element): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unobserve(_target: Element): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
})

// Mock matchMedia (not available in jsdom)
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
