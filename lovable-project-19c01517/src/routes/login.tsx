import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field, inputClass } from "@/components/auth-card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — ProjectPulse" },
      { name: "description", content: "Log in to ProjectPulse to verify hackathon submissions against real code evidence." },
      { property: "og:title", content: "Log in — ProjectPulse" },
      { property: "og:description", content: "Log in to ProjectPulse to verify hackathon submissions against real code evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    if (login(email, password)) {
      navigate({ to: "/dashboard" });
    } else {
      setErrors({ form: "Invalid email or password" });
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Access your submission verification workspace.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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

        <div>
          <Field label="Password" error={errors.password}>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + " pr-10"}
                autoComplete="current-password"
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
          <Link to="/login" className="mt-1.5 inline-block text-[12.5px] text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>

        {errors.form ? <p className="text-[12.5px] text-destructive">{errors.form}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Log in
        </button>
      </form>

      <p className="mt-4 text-[13px] text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-3 text-[12px] text-muted-foreground">
        Demo credentials: admin@projectpulse.ai / admin123
      </p>
    </AuthShell>
  );
}
