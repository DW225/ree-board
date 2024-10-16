import { useState, useCallback } from "react";

export function useSetState<T>(
  initialState: Set<T> = new Set()
): [Set<T>, (updateFn: (prev: Set<T>) => Set<T>) => void] {
  const [state, setState] = useState(initialState);

  const setStateWrapper = useCallback((updateFn: (prev: Set<T>) => Set<T>) => {
    setState((prev) => {
      const newState = updateFn(prev);
      return newState !== prev ? newState : prev;
    });
  }, []);

  return [state, setStateWrapper];
}
