type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
};

/**
 * Executes a function with retry logic using exponential backoff
 * @param fn The async function to retry
 * @param options Retry options
 * @returns The result of the function or throws an error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
  } = options;

  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw new Error("Retry attempts exhausted");
}

/**
 * Applies retry with backoff to an array of promises
 * @param promises An array of functions that return promises
 * @param options Retry options
 * @returns A promise that resolves to an array of results
 */
export async function retryAllWithBackoff<T>(
  promises: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  const retryPromises = promises.map(promiseFn =>
    () => retryWithBackoff(promiseFn, options)
  );

  return Promise.all(retryPromises.map(p => p()));
}
