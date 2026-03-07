import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role ? "/profile" : "/onboarding");
  }

  redirect("/signin");

  return (
    <main>
      <Link href="/signin">Sign in</Link>
    </main>
  );
}
