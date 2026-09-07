import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';

// The standalone bundle has no Next.js chunk loader; React still loads the real component.
export default function dynamic<Props extends object>(loader: () => Promise<{ default: ComponentType<Props> }>) {
  const Component = lazy(loader);
  return function LazyComponent(props: Props) {
    return <Suspense fallback={null}><Component {...props} /></Suspense>;
  };
}
