// eslint-disable-next-line @typescript-eslint/ban-types
export function requiredWalletAddress(target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: any[]) {
    const instance = this as any

    if (!instance.options.wallet.address) {
      return {
        error: `${target.constructor.name}.${propertyKey}: address is not provided`,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return originalMethod?.apply(this, args)
  }
}
