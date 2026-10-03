"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { authClient } from "@/lib/auth-client";

const inputCls =
  "mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const btnCls =
  "mt-4 w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const ghostCls =
  "mt-3 w-full rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";
const linkCls = "text-blue-600 hover:underline dark:text-blue-400";

function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      {label}
      <input {...props} className={inputCls} />
    </label>
  );
}

function FormError({ msg }: { msg: string }) {
  return <p className="mt-3 text-center text-sm text-red-600">{msg}</p>;
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1.5 text-sm text-zinc-500">{sub}</p>}
    </div>
  );
}

export function RedirectIfAuthed() {
  const router = useRouter();
  const { data } = authClient.useSession();

  useEffect(() => {
    if (data) router.replace("/dashboard");
  }, [data, router]);

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    setUnverified(false);
    const { error } = await authClient.signIn.email({ email, password });
    if (!error) {
      router.push("/dashboard");
      return;
    }
    setMsg(error.message ?? "Something went wrong, try again.");
    setUnverified(error.status === 403);
    setPending(false);
  }

  async function resend() {
    await authClient.sendVerificationEmail({ email });
    setResent(true);
  }

  return (
    <>
      <Title sub="Sign in to search for leads.">Log in</Title>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>

      {msg && <FormError msg={msg} />}
      {unverified && !resent && (
        <button onClick={resend} className={ghostCls}>
          Resend verification email
        </button>
      )}
      {resent && (
        <p className="mt-3 text-center text-sm text-zinc-500">
          Verification link sent — check your inbox.
        </p>
      )}

      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href="/forgot-password" className={linkCls}>
          Forgot your password?
        </Link>
      </p>
      <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
        No account?{" "}
        <Link href="/signup" className={linkCls}>
          Sign up
        </Link>
      </p>
    </>
  );
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setMsg(error.message ?? "Something went wrong, try again.");
      setPending(false);
      return;
    }
    setDone(true);
  }

  async function resend() {
    await authClient.sendVerificationEmail({ email });
    setResent(true);
  }

  if (done) {
    return (
      <>
        <Title sub="Click the link we emailed you to activate your account.">
          Check your email
        </Title>
        <p className="mt-4 text-center text-sm text-zinc-500">
          We sent a verification link to{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{email}</span>.
        </p>
        {resent ? (
          <p className="mt-3 text-center text-sm text-zinc-500">
            Link resent — check your inbox again.
          </p>
        ) : (
          <button onClick={resend} className={ghostCls}>
            Resend verification email
          </button>
        )}
        <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <Link href="/login" className={linkCls}>
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Title sub="Free account, no card needed.">Sign up</Title>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field
          label="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password (8+ characters)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      {msg && <FormError msg={msg} />}

      <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Already have an account?{" "}
        <Link href="/login" className={linkCls}>
          Log in
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    // 404 = no such account; answer identically to avoid leaking who is registered
    if (error && error.status !== 404) {
      setMsg(error.message ?? "Something went wrong, try again.");
      setPending(false);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <Title sub="If that address has an account, a reset link is on its way.">
          Check your email
        </Title>
        <p className="mt-4 text-center text-sm text-zinc-500">
          The link expires shortly. Check your spam folder if it has not arrived
          in a minute.
        </p>
        <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <Link href="/login" className={linkCls}>
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Title sub="Enter your email and we will send a reset link.">
        Forgot password
      </Title>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {msg && <FormError msg={msg} />}

      <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Remembered it?{" "}
        <Link href="/login" className={linkCls}>
          Log in
        </Link>
      </p>
    </>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }
    setPending(true);
    setMsg("");
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token ?? "",
    });
    if (error) {
      setMsg(error.message ?? "Something went wrong, try again.");
      setPending(false);
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <>
        <Title sub="This reset link is missing or incomplete.">Invalid link</Title>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Request a new one from the{" "}
          <Link href="/forgot-password" className={linkCls}>
            forgot password
          </Link>{" "}
          page.
        </p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <Title sub="Your password has been changed.">Password updated</Title>
        <p className="mt-4 text-center text-sm text-zinc-500">
          You can now sign in with your new password.
        </p>
        <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <Link href="/login" className={linkCls}>
            Log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Title sub="Choose a new password for your account.">Reset password</Title>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field
          label="New password (8+ characters)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>

      {msg && <FormError msg={msg} />}
    </>
  );
}

export function VerifyEmailForm({ token }: { token?: string }) {
  const [state, setState] = useState<"verifying" | "ok" | "error">(
    token ? "verifying" : "error",
  );
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev; the token is single-use
    if (!token || ran.current) return;
    ran.current = true;
    authClient.verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setState("error");
        setMsg(error.message ?? "Something went wrong, try again.");
      } else {
        setState("ok");
      }
    });
  }, [token]);

  if (state === "verifying") {
    return <Title sub="One moment…">Verifying your email</Title>;
  }

  if (state === "error") {
    return (
      <>
        <Title sub={msg || "This verification link is missing or expired."}>
          Verification failed
        </Title>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Request a fresh link by signing up again, or{" "}
          <Link href="/login" className={linkCls}>
            log in
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <>
      <Title sub="Your email address has been confirmed.">Email verified</Title>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Your account is ready — go find some leads.
      </p>
      <p className="mt-4 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
        <Link
          href="/dashboard"
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Open the dashboard
        </Link>
      </p>
    </>
  );
}
