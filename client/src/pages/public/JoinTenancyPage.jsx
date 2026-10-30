import React, { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tenancyApi } from '../../api/tenancy.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { Building, Key, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function JoinTenancyPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isTenant } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const res = await tenancyApi.validateInvitation(token);
      return res.data.data;
    },
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => tenancyApi.acceptInvitation(token),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Joined tenancy successfully!');
      setAccepted(true);
      setTimeout(() => {
        navigate(`/tenancies/${res.data.data.tenancyId}`);
      }, 1500);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to accept invitation');
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm text-on-surface-variant font-mono">Verifying invitation cryptographic token...</p>
      </div>
    );
  }

  if (error || !inviteData) {
    const errorMsg = error?.response?.data?.error?.message || 'This invitation is invalid or has expired.';
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-surface-container-lowest p-8 rounded-lg border border-error/30 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-headline font-bold text-xl text-primary">Invitation Unavailable</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="secondary" size="sm">
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { tenancy } = inviteData;

  return (
    <div className="max-w-xl mx-auto my-12 px-4 space-y-6">
      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary-container text-brass mx-auto flex items-center justify-center font-bold text-lg font-headline">
            LL
          </div>
          <h1 className="font-headline font-bold text-2xl text-primary">
            Rental Handover Invitation
          </h1>
          <p className="text-xs text-on-surface-variant">
            You have been invited to participate as a verified Tenant for this property
          </p>
        </div>

        {/* Property & Tenancy Summary Card */}
        <div className="p-5 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                Property Address
              </span>
              <h3 className="font-headline font-bold text-base text-primary">
                {tenancy.property.address}
              </h3>
            </div>
            <Badge variant="default" size="sm">
              {tenancy.property.type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-outline-variant/20 text-xs">
            <div>
              <span className="text-on-surface-variant block text-[11px]">Landlord / Owner:</span>
              <span className="font-semibold text-primary">{tenancy.landlord.name}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[11px]">Tenancy Duration:</span>
              <span className="font-mono text-primary">
                {new Date(tenancy.startDate).toLocaleDateString()} – {new Date(tenancy.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Acceptance or Auth Call to Action */}
        {accepted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-verified mx-auto" />
            <h4 className="font-bold text-sm text-verified">Invitation Accepted!</h4>
            <p className="text-xs text-on-surface-variant">Redirecting to tenancy timeline...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="p-5 bg-surface-container rounded-lg space-y-3 text-center">
            <h4 className="font-headline font-semibold text-sm text-primary">
              Please sign in or create an account to accept
            </h4>
            <p className="text-xs text-on-surface-variant">
              An account is required to cryptographically bind your digital confirmation and signatures.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to="/login" state={{ from: location }}>
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" state={{ from: location }}>
                <Button variant="primary" size="sm">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        ) : !isTenant ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-2 text-center">
            <p className="font-semibold">
              You are currently logged in as a <span className="uppercase font-bold">{user.role}</span>.
            </p>
            <p>
              Tenancy invitations must be accepted by a user registered with the <strong>TENANT</strong> role.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <div className="text-xs text-on-surface-variant flex items-center justify-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-verified" />
              <span>Signed in as: {user.name} ({user.email})</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
              icon={CheckCircle2}
            >
              Accept Invitation & Join Property
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
