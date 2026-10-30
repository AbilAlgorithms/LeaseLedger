import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReport, downloadPublicReportBlob } from '../../api/report.api.js';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

export default function SharedReportPage() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPublicReport();
  }, [token]);

  const loadPublicReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicReport(token);
      setReport(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'This shared dossier link is invalid, revoked, or has expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadPublicReportBlob(token);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leaseledger-certified-dossier.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4FBF7] flex flex-col justify-center items-center p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-mono uppercase tracking-wider text-stone-600">
          Verifying Cryptographic Ledger Token...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4FBF7] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-stone-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="font-serif text-2xl text-stone-900">Access Restricted</h1>
          <p className="text-stone-600 text-sm">{error}</p>
          <div className="pt-2">
            <a
              href="/"
              className="text-xs uppercase font-semibold tracking-wider text-primary hover:underline"
            >
              Return to LeaseLedger Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tenancy = report?.tenancy;
  const comparison = report?.comparison;

  return (
    <div className="min-h-screen bg-[#F4FBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Official Header Strip */}
        <div className="bg-[#183D35] text-white rounded-lg p-6 shadow-md border-l-4 border-brass">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-brass">
                OFFICIAL CERTIFIED COMPARISON REPORT · ISO-216 RTBA COMPLIANT
              </span>
              <h1 className="font-serif text-3xl tracking-tight mt-1">
                LeaseLedger Evidentiary Dossier
              </h1>
              <p className="text-stone-300 text-xs mt-1">
                Property: {tenancy?.property?.address} · Version {report.version}
              </p>
            </div>

            <Button
              variant="primary"
              className="bg-brass text-stone-900 hover:bg-amber-400 font-semibold"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download Official PDF'}
            </Button>
          </div>
        </div>

        {/* Audit Details */}
        <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-6 shadow-sm">
          <h2 className="font-serif text-xl text-stone-900 border-b border-stone-100 pb-3">
            Handover & Tenancy Record
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Parties
              </span>
              <p className="text-stone-800">
                <strong>Landlord:</strong> {tenancy?.landlord?.name} ({tenancy?.landlord?.email})
              </p>
              <p className="text-stone-800 mt-1">
                <strong>Tenants:</strong> {tenancy?.tenants?.map((t) => `${t.name} (${t.email})`).join(', ')}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Tenancy Term
              </span>
              <p className="text-stone-800">
                {new Date(tenancy?.startDate).toLocaleDateString()} — {new Date(tenancy?.endDate).toLocaleDateString()}
              </p>
              <p className="text-xs font-mono text-emerald-700 mt-1">
                Status: {tenancy?.status}
              </p>
            </div>
          </div>

          {comparison?.summary && (
            <div className="p-4 bg-stone-50 rounded border border-stone-200">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Executive Comparison Summary
              </span>
              <p className="text-sm font-serif text-stone-800 italic">
                "{comparison.summary}"
              </p>
            </div>
          )}

          {/* Metric Counts */}
          {comparison?.counts && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 bg-stone-50 rounded border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-stone-500">Total Items</span>
                <p className="text-lg font-serif text-stone-900">{comparison.counts.total}</p>
              </div>
              <div className="p-3 bg-stone-50 rounded border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-stone-500">Unchanged</span>
                <p className="text-lg font-serif text-stone-700">{comparison.counts.unchanged}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded border border-rose-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-rose-700">Deteriorated</span>
                <p className="text-lg font-serif text-rose-700">{comparison.counts.deteriorated}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-700">Improved</span>
                <p className="text-lg font-serif text-emerald-700">{comparison.counts.improved}</p>
              </div>
              <div className="p-3 bg-stone-50 rounded border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-stone-500">Missing</span>
                <p className="text-lg font-serif text-stone-700">{comparison.counts.missing}</p>
              </div>
            </div>
          )}

          <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500 gap-2">
            <span>Cryptographic Seal: SHA-256 Verified Plates</span>
            <span className="font-mono">Certified by LeaseLedger Audit Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
