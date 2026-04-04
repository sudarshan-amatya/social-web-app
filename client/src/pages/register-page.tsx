import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username is required")
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores"),
  email: z.email("Enter a valid email address").trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one capital letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

type RegisterForm = {
  name: string;
  username: string;
  email: string;
  password: string;
};

type RegisterField = keyof RegisterForm;
type FieldErrors = Partial<Record<RegisterField, string>>;
type TouchedFields = Partial<Record<RegisterField, boolean>>;

function getFieldErrors(values: RegisterForm): FieldErrors {
  const result = registerSchema.safeParse(values);

  if (result.success) {
    return {};
  }

  const nextErrors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0] as RegisterField | undefined;

    if (field && !nextErrors[field]) {
      nextErrors[field] = issue.message;
    }
  }

  return nextErrors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: RegisterField, value: string) {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    if (touchedFields[field]) {
      const nextErrors = getFieldErrors(nextForm);
      setFieldErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
    }
  }

  function handleBlur(field: RegisterField) {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    const nextErrors = getFieldErrors(form);
    setFieldErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = registerSchema.safeParse(form);

    if (!parsed.success) {
      setTouchedFields({
        name: true,
        username: true,
        email: true,
        password: true,
      });
      setFieldErrors(getFieldErrors(form));
      return;
    }

    setLoading(true);

    try {
      await register(parsed.data);
      navigate("/");
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;

      if (apiErrors) {
        setFieldErrors(apiErrors);
        setTouchedFields({
          name: true,
          username: true,
          email: true,
          password: true,
        });
      }

      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Start building your profile and sharing updates.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Input
                placeholder="Full name"
                className="h-11 rounded-xl"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {touchedFields.name && fieldErrors.name ? (
                <p className="px-1 text-sm text-red-600">{fieldErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Input
                placeholder="Username"
                className="h-11 rounded-xl"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                onBlur={() => handleBlur("username")}
                aria-invalid={Boolean(fieldErrors.username)}
              />
              {touchedFields.username && fieldErrors.username ? (
                <p className="px-1 text-sm text-red-600">
                  {fieldErrors.username}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Input
                placeholder="Email"
                type="email"
                className="h-11 rounded-xl"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
              />
              {touchedFields.email && fieldErrors.email ? (
                <p className="px-1 text-sm text-red-600">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Input
                placeholder="Password"
                type="password"
                className="h-11 rounded-xl"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete="new-password"
              />
              {touchedFields.password && fieldErrors.password ? (
                <p className="px-1 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="px-1 text-sm text-zinc-500">
                  Use at least 8 characters, 1 capital letter, and 1 number.
                </p>
              )}
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-zinc-900 dark:text-zinc-200">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
