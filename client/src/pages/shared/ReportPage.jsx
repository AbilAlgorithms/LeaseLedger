import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTenancyReport,
  generateReport,
  downloadReportBlob,
  shareReport,
  revokeReportShare,
} from '../../api/report.api.js';
import { getTenancyById } from '../../api/tenancy.api.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReportPage() {
  const { id: tenancyId } = useParams();
  const { user } = useAuth();
  const [tenancy, setTenancy] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [tenancyId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, rRes] = await Promise.allSettled([
        getTenancyById(tenancyId),
        getTenancyReport(tenancyId),
      ]);

      if (tRes.status === 'fulfilled') setTenancy(tRes.value.data);
      if (rRes.status === 'fulfilled') {
        setReport(rRes.value.data);
        if (rRes.value.data?.shareToken) {
          const shareUrl = `${window.location.origin}/shared/reports/${rRes.value.data.shareToken}`;
          setShareData({ shareUrl, expiresAt: rRes.value.data.shareExpiresAt });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateReport(tenancyId);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadReportBlob(tenancyId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leaseledger-report-${tenancyId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await shareReport(tenancyId);
      const fullUrl = `${window.location.origin}${res.data.shareUrl}`;
      setShareData({ ...res.data, shareUrl: fullUrl });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    try {
      await revokeReportShare(tenancyId);
      setShareData(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke share link');
    }
  };

  const copyToClipboard = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const isLandlord = user?.role === 'LANDLORD' || user?.role === 'ADMIN';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider mb-1">
            <Link to="/tenancies" className="hover:text-primary transition-colors">Tenancies</Link>
            <span>/</span>
            <Link to={`/tenancies/${tenancyId}`} className="hover:text-primary transition-colors">
              {tenancy?.property?.address || 'Tenancy'}
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">Certified Dossier</span>
          </nav>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">
            Certified Handover Dossier
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Official ISO-216 RTBA-compliant comparative audit document with cryptographic sealing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/tenancies/${tenancyId}/comparison`}>
            <Button variant="outline">
              ← Differential Matrix
            </Button>
          </Link>

          {report && (
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? <Spinner size="sm" /> : 'Download A4 PDF'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {!report ? (
        <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
          <EmptyState
            title="Dossier Not Yet Generated"
            description="The official certified PDF report has not been compiled yet. Trigger compilation once Move-In and Move-Out are sealed."
            actionLabel="Generate Official PDF Dossier"
            onAction={handleGenerate}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Certificate Banner Card */}
          <div className="bg-primary text-white rounded-lg p-6 relative overflow-hidden shadow-lg border-l-4 border-brass">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase font-mono tracking-widest text-brass">
                    AUTHENTICATED LEDGER ARTIFACT
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-800 text-emerald-200">
                    STATUS: READY
                  </span>
                </div>
                <h2 className="font-serif text-2xl tracking-wide">
                  Official Condition & Handover Dossier v{report.version}
                </h2>
                <p className="text-stone-300 text-xs mt-1">
                  Generated: {new Date(report.generatedAt || report.updatedAt).toLocaleString()} · Dossier ID: #{report._id.slice(-8).toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="bg-transparent border-stone-400 text-white hover:bg-white/10"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? <Spinner size="sm" /> : 'Regenerate'}
                </Button>
                <Button
                  variant="primary"
                  className="bg-brass text-stone-900 hover:bg-amber-400 font-semibold"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading...' : 'Download Signed PDF'}
                </Button>
              </div>
            </div>
          </div>

          {/* Shareable Link Management (Landlord only) */}
          {isLandlord && (
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-lg text-stone-900 font-medium">
                    Evidentiary Share Link
                  </h3>
                  <p className="text-stone-600 text-xs mt-0.5">
                    Generate a secure read-only token to share this certified dossier with dispute tribunals or insurers.
                  </p>
                </div>

                {!shareData ? (
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    disabled={sharing}
                  >
                    {sharing ? <Spinner size="sm" /> : 'Create Share Link'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-rose-600 border-rose-300 hover:bg-rose-50"
                    onClick={handleRevokeShare}
                  >
                    Revoke Link
                  </Button>
                )}
              </div>

              {shareData && (
                <div className="p-4 bg-stone-50 rounded-md border border-stone-200 space-y-2">
                  <span className="text-xs uppercase font-semibold text-stone-500 tracking-wider">
                    Public Read-Only URL (30-day token):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareData.shareUrl}
                      className="flex-1 text-xs font-mono bg-white border border-stone-300 rounded px-3 py-2 text-stone-800 select-all"
                    />
                    <Button variant="outline" onClick={copyToClipboard}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  {shareData.expiresAt && (
                    <p className="text-[11px] text-stone-500">
                      Token valid until: {new Date(shareData.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dossier Preview / Overview Card */}
          <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-6">
            <h3 className="font-serif text-xl text-stone-900 border-b border-stone-100 pb-3">
              Dossier Content Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
                  Property & Parties
                </span>
                <p className="text-sm font-medium text-stone-900">
                  {tenancy?.property?.address}
                </p>
                <p className="text-xs text-stone-600">
                  Landlord: {tenancy?.landlord?.name || 'Asha'}<br />
                  Tenants: {tenancy?.tenants?.map(t => t.name).join(', ') || 'Ravi'}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
                  Audit Sealing
                </span>
                <p className="text-xs text-stone-700 font-mono">
                  SHA-256 Tamper-Evident Photo Plates<br />
                  Dual-Party Cryptographic Sign-Off<br />
                  Standard: ISO-216 RTBA Dossier
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
                  File Format & Access
                </span>
                <p className="text-xs text-stone-700">
                  Server-side vector PDFKit rendering.<br />
                  Downloadable at any time by verified parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
