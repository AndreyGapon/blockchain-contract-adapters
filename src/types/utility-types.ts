/**
 *
 * Constructs a new type by marking specified keys of the given type as optional.
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
