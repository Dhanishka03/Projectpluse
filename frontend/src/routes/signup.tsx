import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field, inputClass } from "@/components/auth-card";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — ProjectPulse" },
      { name: "description", content: "Create a ProjectPulse account to verify hackathon submissions with code-level evidence." },
      { property: "og:title", content: "Create account — ProjectPulse" },
      { property: "og:description", content: "Create a ProjectPulse account to verify hackathon submissions with code-level evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agree?: string }>({});

  useEffect(() => {
    if (user) navigate({ to: "/hackathons" });
  }, [user, navigate]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Use at least 8 characters";
    if (!agree) next.agree = "You must agree to the Terms";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    signup(name.trim(), email.trim());
    navigate({ to: "/hackathons" });
  }

  return (
    <AuthShell title="Create account" subtitle="Start verifying submissions against real code.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Name" error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Jane Doe"
            autoComplete="name"
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass + " pr-10"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <div>
          <label className="flex items-start gap-2 text-[13px] text-foreground">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 size-3.5 accent-[var(--accent)]"
            />
            I agree to the Terms
          </label>
          {errors.agree ? <p className="mt-1 text-[12.5px] text-destructive">{errors.agree}</p> : null}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Create account
        </button>
      </form>

      <p className="mt-4 text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
