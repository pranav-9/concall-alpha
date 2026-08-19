// Build-time shim: no Next router exists in a design-system bundle. Every hook
// returns an inert value so components that read navigation state still render.
const noop = () => {};

export function useRouter() {
  return {
    push: noop,
    replace: noop,
    refresh: noop,
    back: noop,
    forward: noop,
    prefetch: noop,
  };
}

export function usePathname(): string {
  return "/";
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams<T = Record<string, string>>(): T {
  return {} as T;
}

export function useSelectedLayoutSegment(): string | null {
  return null;
}

export function useSelectedLayoutSegments(): string[] {
  return [];
}

export function redirect(_url: string): never {
  throw new Error("redirect() is not available in a design-system preview");
}

export function notFound(): never {
  throw new Error("notFound() is not available in a design-system preview");
}
