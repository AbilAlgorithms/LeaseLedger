import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { LogIn, Key, Mail, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      {/* Quick Fill Demo Banner */}
      <div className="mb-6 p-4 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brass font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Demo One-Click Fill</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount('asha@leaseledger.test', 'Asha@1234')}
            className="px-2 py-1.5 text-xs bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 rounded text-center transition-colors"
          >
            <span className="font-semibold block text-primary">Asha</span>
            <span className="text-[10px] text-on-surface-variant font-mono">Landlord</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('ravi@leaseledger.test', 'Ravi@1234')}
            className="px-2 py-1.5 text-xs bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 rounded text-center transition-colors"
          >
            <span className="font-semibold block text-primary">Ravi</span>
            <span className="text-[10px] text-on-surface-variant font-mono">Tenant</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('admin@leaseledger.test', 'Admin@123')}
            className="px-2 py-1.5 text-xs bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 rounded text-center transition-colors"
          >
            <span className="font-semibold block text-primary">Admin</span>
            <span className="text-[10px] text-on-surface-variant font-mono">System</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold font-headline text-primary">Sign in to LeaseLedger</h2>
          <p className="text-xs text-on-surface-variant">
            Enter your credentials to access your properties and handover ledgers
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. asha@leaseledger.test"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary pr-10 text-on-surface"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-outline-variant hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-error font-medium">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
