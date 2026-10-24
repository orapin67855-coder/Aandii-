import { AuthScreen } from "@/features/auth/AuthScreen";

export default function SignupPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-8">
      <AuthScreen mode="signup" />
    </main>
  );
}
