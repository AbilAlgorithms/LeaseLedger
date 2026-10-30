import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTenancyComparison, runComparison } from '../../api/comparison.api.js';
import { getTenancyById } from '../../api/tenancy.api.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function ComparisonPage() {
  const { id: tenancyId } = useParams();
  const [tenancy, setTenancy] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    loadData();
  }, [tenancyId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes] = await Promise.allSettled([
        getTenancyById(tenancyId),
        getTenancyComparison(tenancyId),
      ]);

      if (tRes.status === 'fulfilled') setTenancy(tRes.value.data);
      if (cRes.status === 'fulfilled') setComparison(cRes.value.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runComparison(tenancyId);
      setComparison(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run comparison engine');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const items = comparison?.items || [];
  const filteredItems = items.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'DETERIORATED') return item.result === 'CHANGED_DETERIORATED';
    if (filter === 'IMPROVED') return item.result === 'IMPROVED';
    if (filter === 'PRE_EXISTING') return item.preExisting;
    if (filter === 'UNCHANGED') return item.result === 'UNCHANGED' && !item.preExisting;
    return true;
  });

  const getResultBadge = (item) => {
    if (item.preExisting) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          PRE-EXISTING WEAR
        </span>
      );
    }
    switch (item.result) {
      case 'CHANGED_DETERIORATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
            DETERIORATED ({item.moveOutRating - item.moveInRating})
          </span>
        );
      case 'IMPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            IMPROVED (+{item.moveOutRating - item.moveInRating})
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-red-200 text-red-900 border border-red-400">
            MISSING
          </span>
        );
      case 'UNCHANGED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
            UNCHANGED
          </span>
        );
    }
  };

  const getRatingBadge = (rating, label) => {
    const colors = {
      5: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      4: 'bg-teal-50 text-teal-800 border-teal-300',
      3: 'bg-amber-50 text-amber-800 border-amber-300',
      2: 'bg-orange-50 text-orange-800 border-orange-300',
      1: 'bg-rose-50 text-rose-800 border-rose-300',
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
          colors[rating] || 'bg-stone-50 text-stone-700'
        }`}
      >
        ★ {rating}/5 · {label || 'RATED'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider mb-1">
            <Link to="/tenancies" className="hover:text-primary transition-colors">Tenancies</Link>
            <span>/</span>
            <Link to={`/tenancies/${tenancyId}`} className="hover:text-primary transition-colors">
              {tenancy?.property?.address || 'Tenancy'}
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">Differential Ledger</span>
          </nav>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">
            Condition Comparison Matrix
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Objective Move-In vs. Move-Out differential analysis with cryptographic evidence plates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRunComparison}
            disabled={running}
          >
            {running ? <Spinner size="sm" /> : 'Re-run Comparison'}
          </Button>

          <Link to={`/tenancies/${tenancyId}/report`}>
            <Button variant="primary">
              View Certified PDF Report →
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {!comparison ? (
        <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
          <EmptyState
            title="Comparison Not Yet Generated"
            description="Move-In and Move-Out inspections must both be completed and locked before running the differential comparison engine."
            actionLabel="Run Differential Comparison"
            onAction={handleRunComparison}
          />
        </div>
      ) : (
        <>
          {/* Executive Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-stone-200">
              <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Total Inspected</span>
              <p className="text-2xl font-serif text-stone-900 mt-1">{comparison.counts?.total || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-200">
              <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Unchanged</span>
              <p className="text-2xl font-serif text-stone-700 mt-1">{comparison.counts?.unchanged || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-rose-200 bg-rose-50/30">
              <span className="text-xs uppercase tracking-wider text-rose-700 font-medium">Deteriorated</span>
              <p className="text-2xl font-serif text-rose-700 mt-1">{comparison.counts?.deteriorated || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/30">
              <span className="text-xs uppercase tracking-wider text-emerald-700 font-medium">Improved</span>
              <p className="text-2xl font-serif text-emerald-700 mt-1">{comparison.counts?.improved || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-200">
              <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Missing</span>
              <p className="text-2xl font-serif text-stone-900 mt-1">{comparison.counts?.missing || 0}</p>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 mr-2">Filter View:</span>
            {[
              { id: 'ALL', label: `All Items (${items.length})` },
              { id: 'DETERIORATED', label: `Deteriorated (${comparison.counts?.deteriorated || 0})` },
              { id: 'IMPROVED', label: `Improved (${comparison.counts?.improved || 0})` },
              { id: 'PRE_EXISTING', label: `Pre-existing Wear (${items.filter(i => i.preExisting).length})` },
              { id: 'UNCHANGED', label: `Unchanged (${items.filter(i => i.result === 'UNCHANGED' && !i.preExisting).length})` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === btn.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Comparison Cards Matrix */}
          <div className="space-y-4">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-stone-200 p-5 shadow-sm hover:border-stone-300 transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-stone-100 pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-semibold text-brass">
                        {item.roomName}
                      </span>
                      <span className="text-stone-300">·</span>
                      <h3 className="font-serif text-lg text-stone-900 font-medium">
                        {item.itemName}
                      </h3>
                    </div>
                  </div>
                  <div>{getResultBadge(item)}</div>
                </div>

                {/* Pre-existing wear notice banner */}
                {item.preExisting && (
                  <div className="mb-4 p-2.5 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
                    <span className="font-bold">🛡 Fair Wear & Tear Notice:</span>
                    <span>
                      Condition was noted as fair or with pre-existing wear upon Move-In. Tenant is legally exempt from liability for this wear.
                    </span>
                  </div>
                )}

                {/* Two-column side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Move In State */}
                  <div className="bg-stone-50/70 p-4 rounded-md border border-stone-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Move-In Condition
                      </span>
                      {getRatingBadge(item.moveInRating, item.moveInRatingLabel)}
                    </div>
                    <p className="text-xs text-stone-600 italic">
                      "{item.moveInNotes || 'No specific notes recorded'}"
                    </p>
                    {item.moveInPhotos?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block mb-1">
                          Evidence Plate ({item.moveInPhotos.length})
                        </span>
                        <div className="flex gap-2">
                          {item.moveInPhotos.map((url, pIdx) => (
                            <img
                              key={pIdx}
                              src={url}
                              alt="Move-In Plate"
                              className="h-16 w-16 object-cover rounded border border-stone-300 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewPhoto(url)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Move Out State */}
                  <div className="bg-stone-50/70 p-4 rounded-md border border-stone-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Move-Out Condition
                      </span>
                      {getRatingBadge(item.moveOutRating, item.moveOutRatingLabel)}
                    </div>
                    <p className="text-xs text-stone-600 italic">
                      "{item.moveOutNotes || 'No specific notes recorded'}"
                    </p>
                    {item.moveOutPhotos?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block mb-1">
                          Evidence Plate ({item.moveOutPhotos.length})
                        </span>
                        <div className="flex gap-2">
                          {item.moveOutPhotos.map((url, pIdx) => (
                            <img
                              key={pIdx}
                              src={url}
                              alt="Move-Out Plate"
                              className="h-16 w-16 object-cover rounded border border-stone-300 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewPhoto(url)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {item.amended && (
                  <div className="mt-3 text-xs text-stone-500 bg-stone-100 p-2 rounded">
                    <strong>Post-lock Amendment Applied:</strong> {item.amendmentNote}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Utility Meter Deltas */}
          {comparison.meterDeltas?.length > 0 && (
            <div className="bg-white rounded-lg border border-stone-200 p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-xl text-stone-900">
                Utility Meter Consumption Differential
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {comparison.meterDeltas.map((meter, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-4 rounded-md border border-stone-200 bg-stone-50/50 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {meter.meterType}
                      </span>
                      <span className="text-xs font-mono bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                        {meter.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-600">
                      <span>Move-In: <strong>{meter.moveIn}</strong></span>
                      <span>Move-Out: <strong>{meter.moveOut}</strong></span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                      <span className="text-xs font-medium text-stone-700">Net Consumption:</span>
                      <span className={`text-base font-serif font-bold ${meter.anomaly ? 'text-rose-600' : 'text-primary'}`}>
                        {meter.used} {meter.unit}
                      </span>
                    </div>
                    {meter.anomaly && (
                      <p className="text-[10px] text-rose-600">
                        Warning: Move-out reading is lower than move-in reading.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          title="Evidentiary Photographic Plate"
        >
          <div className="space-y-4">
            <img
              src={previewPhoto}
              alt="Expanded Evidence"
              className="w-full h-auto max-h-[70vh] object-contain rounded border border-stone-200"
            />
            <div className="p-3 bg-stone-100 rounded text-xs font-mono text-stone-700">
              SHA-256 Verifiable Plate Hash Attached to Ledger
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
