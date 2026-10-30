import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  ShieldCheck,
  FileText,
  Camera,
  GitCompare,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-outline-variant/30 bg-gradient-to-b from-surface to-surface-container-low/40">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest border border-outline-variant/40 text-xs font-mono text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-verified animate-pulse" />
            <span>Dual-Party Verification · Cryptographically Sealed Handover Ledger</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-headline text-primary tracking-tight leading-[1.15]">
            Rental condition documentation, <br />
            <span className="text-primary-container italic font-serif">tamper-proof</span> and dispute-free.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-on-surface-variant leading-relaxed">
            LeaseLedger replaces scattered chats and unorganized photos with a single, mutually confirmed,
            timestamped baseline at move-in and an automated differential comparison at move-out.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/register">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                View Seeded Demo
              </Button>
            </Link>
          </div>

          {/* Quick Demo Credentials Pill */}
          <div className="pt-4 text-xs text-on-surface-variant flex flex-wrap items-center justify-center gap-3">
            <span>Instant Demo Accounts:</span>
            <span className="bg-surface-container px-2 py-0.5 rounded font-mono">asha@leaseledger.test (Landlord)</span>
            <span className="bg-surface-container px-2 py-0.5 rounded font-mono">ravi@leaseledger.test (Tenant)</span>
          </div>
        </div>
      </section>

      {/* The 4-Step Process Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-wider text-brass font-bold font-mono">
            How LeaseLedger Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-headline text-primary mt-2">
            From Move-In Baseline to Move-Out Settlement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-3">
            <div className="w-10 h-10 rounded bg-primary-container text-on-primary flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h3 className="font-headline font-bold text-base text-primary">Property Setup</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Landlord defines rooms and inventory items, creates a tenancy, and sends a single-use secure invite.
            </p>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-3">
            <div className="w-10 h-10 rounded bg-primary-container text-on-primary flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h3 className="font-headline font-bold text-base text-primary">Move-In Inspection</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Joint room walk-through. Both rate items, upload photos with SHA-256 hashes, record meters, and dual-confirm to lock.
            </p>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-3">
            <div className="w-10 h-10 rounded bg-primary-container text-on-primary flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h3 className="font-headline font-bold text-base text-primary">Move-Out Audit</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Repeat walk-through with Move-In baseline photos side-by-side. Dual-party confirmation seals the handover.
            </p>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-3">
            <div className="w-10 h-10 rounded bg-brass text-white flex items-center justify-center font-bold font-mono">
              04
            </div>
            <h3 className="font-headline font-bold text-base text-primary">Automated Diff & PDF</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Comparison engine classifies every item (Unchanged, Deteriorated, Improved, Missing) and exports an archival PDF dossier.
            </p>
          </div>
        </div>
      </section>

      {/* Architectural Guarantee Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 bg-primary-container text-on-primary rounded-xl space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-wider text-brass font-bold font-mono">
              Judicial & Evidentiary Standard
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-headline mt-2 text-white">
              Built on Three Immutable Guarantees
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brass">
                <Lock className="w-5 h-5" />
                <h4 className="font-headline font-semibold text-white">Post-Lock Immutability</h4>
              </div>
              <p className="text-xs text-on-primary-container leading-relaxed">
                Once both parties confirm, records are frozen at the database driver level. Modifications can only occur as timestamped, attributed amendments.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brass">
                <Camera className="w-5 h-5" />
                <h4 className="font-headline font-semibold text-white">Cryptographic Photo Hashing</h4>
              </div>
              <p className="text-xs text-on-primary-container leading-relaxed">
                Every uploaded photograph generates a SHA-256 tamper-evident digest computed before storage, verifying authentic condition plates.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brass">
                <GitCompare className="w-5 h-5" />
                <h4 className="font-headline font-semibold text-white">Objective Comparison</h4>
              </div>
              <p className="text-xs text-on-primary-container leading-relaxed">
                Pre-existing defects documented at move-in are preserved automatically so tenants are never penalized for pre-tenancy wear and tear.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="max-w-3xl mx-auto px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold font-headline text-primary">
          Ready to experience a dispute-free rental handover?
        </h2>
        <p className="text-sm text-on-surface-variant">
          Sign up today as a Landlord or Tenant, or explore the preloaded flat12 scenario immediately.
        </p>
        <div className="pt-2">
          <Link to="/register">
            <Button variant="primary" size="lg">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
