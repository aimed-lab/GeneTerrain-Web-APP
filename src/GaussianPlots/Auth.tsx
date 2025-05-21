import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { LogIn, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetRequestTime, setResetRequestTime] = useState<number | null>(null);

  // Check for access token in URL for password reset
  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash &&
      hash.includes("access_token") &&
      hash.includes("type=recovery")
    ) {
      setIsResetPassword(true);
      // Clear the URL without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isResetPassword) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) throw updateError;
        setSuccess(
          "Password has been successfully reset. You can now sign in with your new password."
        );
        setIsResetPassword(false);
        return;
      }

      if (isForgotPassword) {
        // Check if we need to enforce rate limiting
        if (resetRequestTime) {
          const timeSinceLastRequest = Date.now() - resetRequestTime;
          const remainingTime = Math.ceil(
            (50000 - timeSinceLastRequest) / 1000
          );

          if (timeSinceLastRequest < 50000) {
            // 50 seconds in milliseconds
            throw new Error(
              `Please wait ${remainingTime} seconds before requesting another reset email.`
            );
          }
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: window.location.origin,
          }
        );

        if (resetError) {
          if (resetError.message.includes("rate_limit")) {
            throw new Error(
              "Please wait 50 seconds before requesting another reset email."
            );
          }
          throw resetError;
        }

        setResetRequestTime(Date.now());
        setSuccess("Password reset email sent. Please check your inbox.");
        return;
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        setSuccess("Sign up successful! You can now sign in.");
        setIsSignUp(false);
        return;
      }

      const { error: signInError, data } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
      if (!data.session) throw new Error("No session created");

      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPassword("");
  };

  const resetForm = () => {
    setIsForgotPassword(false);
    setIsResetPassword(false);
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setResetRequestTime(null);
  };

  // Calculate remaining time for rate limit
  const getRemainingTime = () => {
    if (!resetRequestTime) return 0;
    const elapsed = Date.now() - resetRequestTime;
    return Math.max(0, Math.ceil((50000 - elapsed) / 1000));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center relative">
          {(isForgotPassword || isResetPassword || success) && (
            <button
              onClick={resetForm}
              className="absolute left-0 top-0 text-gray-500 hover:text-gray-700 flex items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to login
            </button>
          )}
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <LogIn className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isResetPassword
              ? "Set new password"
              : isForgotPassword
              ? "Reset your password"
              : isSignUp
              ? "Create your account"
              : "Sign in to your account"}
          </h2>
          {!isForgotPassword && !isResetPassword && !success && (
            <p className="mt-2 text-sm text-gray-600">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          )}
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
            <p className="text-sm">{success}</p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!isResetPassword && (
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required={!isResetPassword}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              )}

              {!isForgotPassword && (
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={
                        isSignUp || isResetPassword
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder={
                        isResetPassword
                          ? "Enter new password"
                          : isSignUp
                          ? "Create password"
                          : "Password"
                      }
                    />
                  </div>
                  {(isSignUp || isResetPassword) && (
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>
              )}

              {(isSignUp || isResetPassword) && (
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required={isSignUp || isResetPassword}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              )}
            </div>

            {!isSignUp && !isForgotPassword && !isResetPassword && (
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (isForgotPassword &&
                  !!resetRequestTime &&
                  getRemainingTime() > 0)
              }
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isResetPassword
                    ? "Set new password"
                    : isForgotPassword
                    ? resetRequestTime && getRemainingTime() > 0
                      ? `Wait ${getRemainingTime()}s to resend`
                      : "Send reset instructions"
                    : isSignUp
                    ? "Sign up"
                    : "Sign in"}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
