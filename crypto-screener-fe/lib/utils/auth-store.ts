// Placeholder bearer token store.
// Task 2.4 will expand this with setToken and any persistence logic.
let _token = ''

export function getToken(): string {
  return _token
}

export function setToken(t: string): void {
  _token = t
}
