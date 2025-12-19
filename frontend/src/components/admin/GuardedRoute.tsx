import React from 'react';

type GuardedRouteProps = {
  children?: React.ReactNode;
};

export default function GuardedRoute({ children }: GuardedRouteProps): JSX.Element {
  return <>{children}</>;
}


