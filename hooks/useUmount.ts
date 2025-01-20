import { useEffectOnce } from "@/lib/utils/effect";
import { useRef } from "react";

const useUnmount = (fn: () => void): void => {
  const fnRef = useRef(fn);

  // update the ref each render so if it change the newest callback will be invoked
  fnRef.current = fn;

  useEffectOnce(() => () => fnRef.current());
};

export default useUnmount;
