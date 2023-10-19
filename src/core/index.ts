import { traverseCode } from './babel'

export function resolveCode(code: string, id: string) {
  return traverseCode(code, id)
}
