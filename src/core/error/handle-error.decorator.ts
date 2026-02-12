import { simplifyError } from './handle-error.simplify';

type AsyncMethod = (
  ...args: unknown[]
) => Promise<unknown> | AsyncGenerator<unknown>;

export function HandleError(customMessage?: string, record?: string) {
  return function <T>(
    _target: T,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<AsyncMethod>,
  ) {
    const method = descriptor.value;

    if (!method) return;

    descriptor.value = function (
      ...args: Parameters<AsyncMethod>
    ): Promise<unknown> | AsyncGenerator<unknown> {
      const result = method!.apply(this, args);

      if (
        result != null &&
        typeof (result as AsyncGenerator<unknown>)[Symbol.asyncIterator] ===
          'function'
      ) {
        const gen = result as AsyncGenerator<unknown>;
        return (async function* () {
          try {
            for await (const value of gen) {
              yield value;
            }
          } catch (error) {
            simplifyError(error as Error, customMessage, record);
          }
        })();
      }

      return (async () => {
        try {
          return await (result as Promise<unknown>);
        } catch (error) {
          simplifyError(error as Error, customMessage, record);
        }
      })();
    } as AsyncMethod;
  };
}
