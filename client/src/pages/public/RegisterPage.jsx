import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { UserPlus, Building, KeyRound, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[0-9]/, 'Must include at least one number'),
  role: z.enum(['LANDLORD', 'TENANT']),
  phone: z.string().optional(),
});

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('TENANT');
  const [isLoading, setIsLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'TENANT',
      name: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await registerUser(data);
      if (res.data?.verifyToken) {
        setVerifyToken(res.data.verifyToken);
      } else {
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold font-headline text-primary">Create an Account</h2>
          <p className="text-xs text-on-surface-variant">
            Join LeaseLedger to collaboratively document and verify rental handovers
          </p>
        </div>

        {/* Dev Verification Token Simulation Banner */}
        {verifyToken && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-2">
            <div className="font-semibold text-verified flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Registration Successful!</span>
            </div>
            <p className="text-on-surface-variant">
              In development mode, you can verify your account immediately:
            </p>
            <Link to={`/verify-email/${verifyToken}`}>
              <Button variant="primary" size="sm" className="w-full mt-1">
                Click here to verify email
              </Button>
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Role Selection Cards */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              I am joining as a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('LANDLORD')}
                className={`p-3 rounded border text-left flex flex-col justify-between transition-colors ${
                  selectedRole === 'LANDLORD'
                    ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                    : 'border-outline-variant/60 hover:bg-surface-container'
                }`}
              >
                <Building className="w-5 h-5 text-primary mb-2" />
                <div>
                  <span className="font-bold text-sm text-primary block">Landlord / Owner</span>
                  <span className="text-[11px] text-on-surface-variant">Manage properties & invites</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('TENANT')}
                className={`p-3 rounded border text-left flex flex-col justify-between transition-colors ${
                  selectedRole === 'TENANT'
                    ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                    : 'border-outline-variant/60 hover:bg-surface-container'
                }`}
              >
                <KeyRound className="w-5 h-5 text-primary mb-2" />
                <div>
                  <span className="font-bold text-sm text-primary block">Tenant</span>
                  <span className="text-[11px] text-on-surface-variant">Join & co-inspect tenancy</span>
                </div>
              </button>
            </div>
          </div>

          <Input
            label="Full Name"
            placeholder="e.g. Eleanor Vance"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. eleanor@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Mobile / Phone (Optional)"
            type="tel"
            placeholder="+61 400 123 456"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            error={errors.password?.message}
            helperText="At least 8 characters with at least 1 uppercase letter and 1 number"
            {...register('password')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            icon={UserPlus}
          >
            Create {selectedRole === 'LANDLORD' ? 'Landlord' : 'Tenant'} Account
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
