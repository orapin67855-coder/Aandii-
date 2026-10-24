import { AuthScreen } from "@/features/auth/AuthScreen";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-8">
      <AuthScreen mode="login" />
    </main>
  );
}
