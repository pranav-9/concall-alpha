import { isSafeNextPath } from "@/lib/safe-next-path";
import { companyCodeFromNext } from "@/lib/signup-gate";
import { SignUpForm } from "@/components/sign-up-form";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolved = await searchParams;
  // Drop anything that is not a same-site path before it reaches the form.
  const nextPath = isSafeNextPath(resolved?.next) ? resolved.next : null;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm nextPath={nextPath} readingCompany={companyCodeFromNext(nextPath)} />
      </div>
    </div>
  );
}
