import { describe, expect, it } from 'vitest'
import { installWithResolvers, type WithResolvers } from './withResolvers.ts'

describe('installWithResolvers', () => {
  it('defines it when missing, and the result resolves and rejects', async () => {
    const P = class extends Promise<unknown> {} as unknown as PromiseConstructor & { withResolvers?: WithResolvers }
    P.withResolvers = undefined // shadow the inherited static, as on old Safari
    expect(P.withResolvers).toBeUndefined()
    installWithResolvers(P)
    const a = P.withResolvers!<number>()
    a.resolve(5)
    await expect(a.promise).resolves.toBe(5)
    const b = P.withResolvers!<number>()
    b.reject(new Error('no'))
    await expect(b.promise).rejects.toThrow('no')
  })
  it('leaves an existing implementation untouched', () => {
    const fn = (() => ({})) as unknown as WithResolvers
    const P = class extends Promise<unknown> {} as unknown as PromiseConstructor & { withResolvers?: WithResolvers }
    P.withResolvers = fn
    installWithResolvers(P)
    expect(P.withResolvers).toBe(fn)
  })
})
