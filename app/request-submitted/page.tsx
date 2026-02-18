import Link from "next/link";

export default async function RequestSubmittedPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const resolved = await searchParams;
  const id = resolved?.id ?? null;

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950/70 p-6 space-y-4">
        <h1 className="text-2xl font-extrabold text-white">Request received</h1>
        <p className="text-sm text-gray-300">
          Thanks — we’ve logged your submission.
        </p>
        <p className="text-sm text-gray-400">
          Reference ID:{" "}
          <span className="font-mono text-gray-200">
            {id ?? "Unavailable"}
          </span>
        </p>
        <Link
          href="/"
          prefetch={false}
          className="inline-flex text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
