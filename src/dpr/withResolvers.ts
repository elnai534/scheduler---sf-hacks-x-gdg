/** Promise.withResolvers is missing before Safari 17.4; pdfjs-dist calls it without a fallback. */
export interface WithResolvers {
  <T>(): { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void }
}
type MaybePromiseCtor = PromiseConstructor & { withResolvers?: WithResolvers }

export function installWithResolvers(P: MaybePromiseCtor = Promise): void {
  if (typeof P.withResolvers === 'function') return
  P.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new P<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
}

installWithResolvers()
