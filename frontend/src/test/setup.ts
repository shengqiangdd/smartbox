import '@testing-library/jest-dom'

// Mock localStorage for Zustand persist middleware
const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  },
  writable: true,
  configurable: true,
})

// Mock URL.createObjectURL and revokeObjectURL for jsdom
if (typeof URL.createObjectURL === 'undefined') {
  let blobId = 0
  URL.createObjectURL = (_blob: Blob) => `blob:mock-${++blobId}`
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = (_url: string) => { /* no-op in jsdom */ }
}

