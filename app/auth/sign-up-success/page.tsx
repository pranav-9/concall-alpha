import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent you a confirmation link. Open it to activate
                your account — you won&apos;t be able to log in until you do.
              </p>
              <p className="text-sm text-muted-foreground">
                No email after a minute or two? Check your spam folder. You can
                also resend the link from the{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  login page
                </Link>{" "}
                if it never arrives.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
