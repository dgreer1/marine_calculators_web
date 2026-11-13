export function linspace(start: number, end: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError('count must be an integer of at least 2')
  }

  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, index) => start + step * index)
}

export function requireFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero`)
  }
}

export function requireFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number of zero or greater`)
  }
}
