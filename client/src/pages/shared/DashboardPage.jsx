import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenancyApi } from '../../api/tenancy.api';
import { propertyApi } from '../../api/property.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import {
  Building,
  Key,
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLandlord, isTenant } = useAuth();

  const { data: tenancies, isLoading: loadingTenancies } = useQuery({
    queryKey: ['tenancies'],
    queryFn: async () => {
      const res = await tenancyApi.getTenancies();
      return res.data.data;
    },
  });

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', false],
    queryFn: async () => {
      if (!isLandlord) return [];
      const res = await propertyApi.getProperties({ archived: false });
      return res.data.data;
    },
    enabled: isLandlord,
  });

  const isLoading = loadingTenancies || (isLandlord && loadingProperties);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-primary">
              Welcome back, {user?.name}
            </h1>
            <Badge variant={isLandlord ? 'landlord' : 'tenant'}>
              {user?.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {isLandlord
              ? 'Oversee your rental portfolio, track inspection confirmations, and initiate handovers'
              : 'Review your rental baseline, confirm condition reports, and log tenancy maintenance'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLandlord && (
            <>
              <Link to="/properties">
                <Button variant="secondary" size="sm" icon={Building}>
                  Properties
                </Button>
              </Link>
              <Link to="/tenancies/new">
                <Button variant="primary" size="sm" icon={Plus}>
                  New Tenancy
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : (
        <>
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                {isLandlord ? 'Active Properties' : 'My Rentals'}
              </span>
              <p className="font-headline font-bold text-3xl text-primary">
                {isLandlord ? properties?.length || 0 : tenancies?.length || 0}
              </p>
              <span className="text-xs text-on-surface-variant">Registered in portfolio</span>
            </div>

            <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                Tenancies Active
              </span>
              <p className="font-headline font-bold text-3xl text-verified">
                {tenancies?.filter((t) => t.status === 'ACTIVE').length || 0}
              </p>
              <span className="text-xs text-on-surface-variant">Ongoing tenancy terms</span>
            </div>

            <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                Pending Handover Action
              </span>
              <p className="font-headline font-bold text-3xl text-pending">
                {tenancies?.filter((t) => t.status === 'PENDING').length || 0}
              </p>
              <span className="text-xs text-on-surface-variant">Awaiting inspection sign-off</span>
            </div>
          </div>

          {/* Tenancies Section */}
          <div className="space-y-4">
            <h2 className="font-headline font-bold text-xl text-primary">Tenancy Handover Ledgers</h2>

            {!tenancies || tenancies.length === 0 ? (
              <EmptyState
                title="No tenancies found"
                description={
                  isLandlord
                    ? 'Create your first tenancy to invite tenants and initiate the Move-In condition inspection.'
                    : 'You do not have any linked tenancies. Once a landlord invites you, accept the invitation link to see your tenancy here.'
                }
                icon={Calendar}
                actionText={isLandlord ? 'Create First Tenancy' : undefined}
                onAction={isLandlord ? () => window.location.assign('/tenancies/new') : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tenancies.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 hover:border-primary/50 transition-all p-6 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] uppercase">
                              {t.property?.type || 'APARTMENT'}
                            </span>
                            <span className="text-[11px] font-mono text-outline">
                              Ref #{t.id?.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-headline font-bold text-lg text-primary leading-tight">
                            {t.property?.address}
                          </h3>
                        </div>
                        <Badge
                          variant={
                            t.status === 'ACTIVE'
                              ? 'verified'
                              : t.status === 'COMPLETED'
                              ? 'brass'
                              : 'pending'
                          }
                        >
                          {t.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-outline-variant/20">
                        <div>
                          <span className="text-on-surface-variant block text-[11px]">
                            {isLandlord ? 'Tenant(s):' : 'Landlord:'}
                          </span>
                          <span className="font-semibold text-primary">
                            {isLandlord
                              ? t.tenants?.length > 0
                                ? t.tenants.map((u) => u.name).join(', ')
                                : 'Pending Invite'
                              : t.landlord?.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-on-surface-variant block text-[11px]">Duration:</span>
                          <span className="font-mono text-primary">
                            {new Date(t.startDate).toLocaleDateString()} –{' '}
                            {new Date(t.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-mono">
                        Started {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                      <Link to={`/tenancies/${t.id}`}>
                        <Button variant="primary" size="sm" icon={ArrowRight}>
                          View Timeline Hub
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
