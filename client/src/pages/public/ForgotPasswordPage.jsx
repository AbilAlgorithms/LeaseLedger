import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(data.email);
      setIsSubmitted(true);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
      toast.success('Password recovery link has been generated.');
    } catch (err) {
      toast.error('Unable to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-headline text-primary">Reset Password</h2>
          <p className="text-xs text-on-surface-variant">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-3">
            <div className="flex items-center gap-2 text-verified font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset Link Dispatched</span>
            </div>
            <p className="text-on-surface-variant">
              If an account exists for that email, we have dispatched a recovery email.
            </p>
            {resetToken && (
              <div className="pt-2 border-t border-emerald-200">
                <span className="text-[11px] text-on-surface-variant block mb-1">
                  Development direct reset shortcut:
                </span>
                <Link to={`/reset-password/${resetToken}`}>
                  <Button variant="primary" size="sm" className="w-full">
                    Proceed to Reset Password
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. asha@leaseledger.test"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              icon={Mail}
            >
              Send Reset Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
