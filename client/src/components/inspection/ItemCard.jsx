import React, { useState, useEffect, useRef } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import PhotoUploader from './PhotoUploader';
import { AlertCircle, ChevronDown, ChevronUp, History, Check } from 'lucide-react';

const RATING_BUTTONS = [
  { value: 5, label: 'EXCELLENT', color: 'hover:border-emerald-500 active:bg-emerald-50', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 4, label: 'GOOD', color: 'hover:border-teal-500 active:bg-teal-50', activeColor: 'bg-teal-700 text-white border-teal-700' },
  { value: 3, label: 'FAIR', color: 'hover:border-amber-500 active:bg-amber-50', activeColor: 'bg-amber-600 text-white border-amber-600' },
  { value: 2, label: 'POOR', color: 'hover:border-orange-500 active:bg-orange-50', activeColor: 'bg-orange-600 text-white border-orange-600' },
  { value: 1, label: 'DAMAGED', color: 'hover:border-rose-500 active:bg-rose-50', activeColor: 'bg-rose-600 text-white border-rose-600' },
  { value: 0, label: 'MISSING', color: 'hover:border-red-700 active:bg-red-50', activeColor: 'bg-red-800 text-white border-red-800' },
];

export default function ItemCard({
  record,
  inspectionType = 'MOVE_IN',
  moveInReference = null,
  onUpdateRecord,
  onUploadPhoto,
  onDeletePhoto,
  onDispute,
  readOnly = false,
  isReviewMode = false,
}) {
  const [rating, setRating] = useState(record.rating ?? 4);
  const [notes, setNotes] = useState(record.notes || '');
  const [showMoveInReference, setShowMoveInReference] = useState(true);
  const [isSaved, setIsSaved] = useState(true);

  const debounceTimerRef = useRef(null);

  // Sync state if record changes externally
  useEffect(() => {
    setRating(record.rating ?? 4);
    setNotes(record.notes || '');
  }, [record.rating, record.notes]);

  const triggerSave = (newRating, newNotes) => {
    setIsSaved(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      onUpdateRecord(record.item?._id || record.item, {
        rating: newRating,
        notes: newNotes,
      });
      setIsSaved(true);
    }, 600);
  };

  const handleRatingClick = (val) => {
    if (readOnly) return;
    setRating(val);
    triggerSave(val, notes);
  };

  const handleNotesChange = (e) => {
    if (readOnly) return;
    const val = e.target.value;
    setNotes(val);
    triggerSave(rating, val);
  };

  const isMoveOut = inspectionType === 'MOVE_OUT';

  return (
    <div
      className={`p-6 rounded-lg border transition-all space-y-4 shadow-sm ${
        record.disputed
          ? 'bg-rose-50/40 border-damage'
          : 'bg-surface-container-lowest border-outline-variant/40'
      }`}
    >
      {/* Item Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-headline font-bold text-base text-primary">
            {record.itemName}
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-on-surface-variant">
            {record.roomName}
          </span>
          {record.item?.category && (
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-outline">
              {record.item.category}
            </span>
          )}
          {record.disputed && (
            <Badge variant="disputed" size="sm">
              Disputed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {!readOnly && (
            <span
              className={`text-[11px] font-mono flex items-center gap-1 transition-opacity ${
                isSaved ? 'text-verified opacity-80' : 'text-on-surface-variant opacity-50'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
              {isSaved ? 'Auto-saved' : 'Saving...'}
            </span>
          )}

          {isReviewMode && !readOnly && !record.disputed && onDispute && (
            <button
              type="button"
              onClick={() => onDispute(record)}
              className="text-xs text-damage hover:underline font-semibold flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Dispute</span>
            </button>
          )}
        </div>
      </div>

      {/* Disputed Banner if active */}
      {record.disputed && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-damage space-y-1">
          <span className="font-bold flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Disputed Entry
          </span>
          <p className="text-on-surface-variant">{record.disputeReason}</p>
        </div>
      )}

      {/* Move-Out Mode: Collapsible Move-In Baseline Reference */}
      {isMoveOut && moveInReference && (
        <div className="p-4 bg-surface-container-low rounded border border-outline-variant/30 space-y-2">
          <button
            type="button"
            onClick={() => setShowMoveInReference(!showMoveInReference)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-primary font-headline"
          >
            <div className="flex items-center gap-1.5 text-primary-container">
              <History className="w-4 h-4 text-brass" />
              <span>Move-In Baseline Reference</span>
            </div>
            {showMoveInReference ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMoveInReference && (
            <div className="pt-2 border-t border-outline-variant/20 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant text-[11px]">Move-In Rating:</span>
                  <Badge
                    variant={
                      moveInReference.rating >= 4
                        ? 'verified'
                        : moveInReference.rating === 3
                        ? 'pending'
                        : 'disputed'
                    }
                    size="sm"
                  >
                    {moveInReference.ratingLabel || `${moveInReference.rating} / 5`}
                  </Badge>
                </div>
                <p className="text-on-surface-variant italic">
                  "{moveInReference.notes || 'No baseline notes recorded'}"
                </p>
              </div>

              {moveInReference.photos?.length > 0 && (
                <div>
                  <span className="text-on-surface-variant text-[11px] block mb-1">
                    Baseline Photos ({moveInReference.photos.length}):
                  </span>
                  <div className="flex items-center gap-2">
                    {moveInReference.photos.map((p) => (
                      <img
                        key={p.id || p._id}
                        src={p.fileUrl}
                        alt="Move-In Baseline"
                        className="w-14 h-11 object-cover rounded border border-outline-variant/40"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5-Point Rating Button Selector */}
      <div className="space-y-1.5 text-left">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">
          Condition Assessment {isMoveOut ? '(Move-Out Exit)' : '(Move-In Baseline)'}
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {RATING_BUTTONS.map((btn) => {
            const isSelected = rating === btn.value;
            return (
              <button
                key={btn.value}
                type="button"
                disabled={readOnly}
                onClick={() => handleRatingClick(btn.value)}
                className={`py-2 px-1 rounded border text-xs font-semibold font-mono tracking-tight transition-all duration-100 flex flex-col items-center justify-center ${
                  isSelected
                    ? btn.activeColor
                    : `bg-surface-container-lowest text-on-surface border-outline-variant/50 ${btn.color}`
                } ${readOnly ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
              >
                <span className="text-sm font-bold">{btn.value}</span>
                <span className="text-[10px] leading-tight truncate">{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Qualitative Notes Textarea */}
      <div className="space-y-1 text-left">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">
          Qualitative Evidentiary Notes
        </label>
        <textarea
          rows={2}
          disabled={readOnly}
          value={notes}
          onChange={handleNotesChange}
          placeholder="e.g. Surface pristine, no scratches observed; all accessories verified present."
          className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface disabled:bg-surface-container-low"
        />
      </div>

      {/* Photo Plate Attachments */}
      <div className="pt-2 border-t border-outline-variant/20">
        <PhotoUploader
          photos={record.photos || []}
          onUpload={(formData) => onUploadPhoto(record.item?._id || record.item, formData)}
          onDelete={onDeletePhoto}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
