import { Provider as JotaiProvider } from 'jotai';
import { QueryClient } from '@tanstack/react-query';
import { queryClientAtom } from 'jotai-tanstack-query';
import { useHydrateAtoms } from 'jotai/utils';

// Create a custom provider that bridges Jotai with React Query
export function ReactiveStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <QueryClientHydrator>
        {children}
      </QueryClientHydrator>
    </JotaiProvider>
  );
}

function QueryClientHydrator({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });

  useHydrateAtoms([[queryClientAtom, queryClient]]);
  
  return <>{children}</>;
}