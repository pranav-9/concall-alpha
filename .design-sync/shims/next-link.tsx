// Build-time shim: design-system bundles render outside a Next.js app, where
// next/link's router context does not exist. A plain anchor is the honest
// stand-in — same DOM, same styling hooks, no router.
import * as React from "react";

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href?: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  locale?: string | false;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, passHref, locale, ...rest },
  ref,
) {
  const resolved = typeof href === "string" ? href : href?.pathname;
  return <a ref={ref} href={resolved} {...rest} />;
});

export default Link;
