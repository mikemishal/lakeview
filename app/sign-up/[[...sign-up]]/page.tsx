import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#e2e8f0_55%,_#cbd5e1_100%)] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Project Lakeview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-600">
            Start here, then choose whether you are joining as an owner or provider.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </div>
      </section>
    </main>
  );
}
