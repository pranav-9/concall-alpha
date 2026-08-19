// Build-time shim: next/dynamic's code-splitting needs the Next runtime.
// React.lazy + Suspense reproduces the observable behaviour for a preview.
import * as React from "react";

type Loader<P> = () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>;

export default function dynamic<P extends object>(
  loader: Loader<P>,
  options?: { loading?: React.ComponentType; ssr?: boolean },
): React.ComponentType<P> {
  const Lazy = React.lazy(async () => {
    const mod = await loader();
    return "default" in mod ? (mod as { default: React.ComponentType<P> }) : { default: mod };
  });
  const Loading = options?.loading;
  return function DynamicComponent(props: P) {
    return (
      <React.Suspense fallback={Loading ? <Loading /> : null}>
        <Lazy {...(props as P & React.JSX.IntrinsicAttributes)} />
      </React.Suspense>
    );
  };
}
