import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      try {
        const res = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Verification token is invalid or expired.');
      }
    }
    verify();
  }, [token]);

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 text-center space-y-6">
        {status === 'loading' && (
          <div className="space-y-3">
            <Spinner size="lg" />
            <h3 className="font-headline font-bold text-lg text-primary">Verifying Email...</h3>
            <p className="text-xs text-on-surface-variant">Connecting to ledger...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-verified mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-headline font-bold text-xl text-primary">Email Verified!</h3>
            <p className="text-sm text-on-surface-variant">{message}</p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Sign In to Your Account
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-damage mx-auto flex items-center justify-center">
              <XCircle className="w-7 h-7" />
            </div>
            <h3 className="font-headline font-bold text-xl text-damage">Verification Failed</h3>
            <p className="text-sm text-on-surface-variant">{message}</p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
