import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuth } from '@/src/store/auth';
import { useChild } from '@/src/store/child';

type Props = {
  children: React.ReactNode;
};

export function RouteGuard({ children }: Props) {
  const { user, isHydrated } = useAuth();
  const child = useChild();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (!isHydrated) return;

    const first = segments[0];
    const second = segments[1];
    const inOnboarding = first === 'onboarding';

    if (!user) {
      if (!inOnboarding || second === 'create-child') {
        router.replace('/onboarding/welcome');
      }
      return;
    }

    if (!child) {
      if (second !== 'create-child') {
        router.replace('/onboarding/create-child');
      }
      return;
    }

    if (inOnboarding) {
      router.replace('/');
    }
  }, [isHydrated, user, child, segments]);

  return <>{children}</>;
}
