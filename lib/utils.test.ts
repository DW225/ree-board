import { cn } from './utils';

test('merges conditional and responsive width overrides', () => {
  expect(cn('p-2', false, { hidden: false }, ['p-4'])).toBe('p-4');
  expect(cn('max-w-lg', 'max-w-[700px]')).toBe('max-w-[700px]');
  expect(cn('md:p-2', 'md:p-4', 'p-1')).toBe('md:p-4 p-1');
  expect(cn('text-sm', 'text-red-500')).toBe('text-sm text-red-500');
  expect(cn('data-[state=open]:animate-in', 'data-[state=closed]:animate-out'))
    .toBe('data-[state=open]:animate-in data-[state=closed]:animate-out');
});
