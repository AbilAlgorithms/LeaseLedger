import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionApi } from '../../api/inspection.api';
import { useDraft } from '../../hooks/useDraft';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import ItemCard from '../../components/inspection/ItemCard';
import MeterForm from '../../components/inspection/MeterForm';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Layers,
  Zap,
  FileCheck,
  WifiOff,
  Clock,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InspectionWizardPage() {
  const { id: tenancyId, type } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inspectionType = type.toUpperCase().replace('-', '_'); // 'MOVE_IN' or 'MOVE_OUT'

  // Fetch or initialize inspection
  const { data: inspectionInit, isLoading: initializing } = useQuery({
    queryKey: ['inspection-init', tenancyId, inspectionType],
    queryFn: async () => {
      const res = await inspectionApi.createOrGetInspection(tenancyId, inspectionType);
      return res.data.data;
    },
  });

  const inspectionId = inspectionInit?.id || inspectionInit?._id;

  // Fetch full details
  const { data: inspection, isLoading: loadingDetails } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const res = await inspectionApi.getInspection(inspectionId);
      return res.data.data;
    },
    enabled: !!inspectionId,
  });

  const { isOffline, saveDraft } = useDraft(inspectionId);

  // Stepper state
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const roomsList = inspection?.roomsMap ? Object.keys(inspection.roomsMap) : [];
  // Steps: Room 1, Room 2, ..., 'Utility Meters', 'Ready for Review'
  const steps = [...roomsList, 'Utility Meters'];

  const isMetersStep = activeStepIndex === roomsList.length;

  const updateRecordMutation = useMutation({
    mutationFn: ({ itemId, data }) =>
      inspectionApi.updateConditionRecord(inspectionId, itemId, data),
    onSuccess: (res, vars) => {
      saveDraft(vars.itemId, vars.data);
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
    onError: (err, vars) => {
      // Save locally if offline or server fails
      saveDraft(vars.itemId, vars.data);
      toast('Saved offline on this device', { icon: '💾' });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ itemId, formData }) =>
      inspectionApi.uploadRecordPhoto(inspectionId, itemId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId) => inspectionApi.deleteRecordPhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
      toast.success('Photo removed');
    },
  });

  const updateMeterMutation = useMutation({
    mutationFn: ({ meterType, data }) =>
      inspectionApi.updateMeterReading(inspectionId, meterType, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => inspectionApi.submitInspection(inspectionId),
    onSuccess: () => {
      toast.success('Inspection submitted for mutual review');
      navigate(`/tenancies/${tenancyId}/inspections/${type}/review`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit inspection');
    },
  });

  if (initializing || loadingDetails) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-on-surface-variant">Loading inspection walkthrough matrix...</p>
      </div>
    );
  }

  if (!inspection) return null;

  // If inspection is locked or already in review, redirect to review/confirm screen
  const isLocked = inspection.status === 'LOCKED';
  const currentRoomName = roomsList[activeStepIndex];
  const currentRoomRecords = currentRoomName ? inspection.roomsMap[currentRoomName] || [] : [];

  const completedRoomsCount = roomsList.filter((r) =>
    (inspection.roomsMap[r] || []).every((rec) => rec.rating !== undefined)
  ).length;

  const totalSteps = steps.length;
  const progressPercent = Math.round(((activeStepIndex + 1) / totalSteps) * 100);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Offline Draft Banner */}
      {isOffline && (
        <div className="p-3.5 bg-amber-500 text-white rounded-lg flex items-center justify-between shadow-md text-xs font-medium animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> Network connection interrupted. Your ratings and notes are
              being cached locally on this device and will sync upon reconnecting.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-amber-600 px-2 py-0.5 rounded">Offline Cached</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div className="space-y-1">
          <Link
            to={`/tenancies/${tenancyId}`}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tenancy Hub</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl text-primary">
              {inspectionType === 'MOVE_IN' ? 'Move-In Inspection Walkthrough' : 'Move-Out Exit Inspection'}
            </h1>
            <Badge variant={isLocked ? 'verified' : inspection.status === 'IN_REVIEW' ? 'pending' : 'default'}>
              {inspection.status}
            </Badge>
          </div>
          <p className="text-xs text-on-surface-variant font-mono">
            Property: {inspection.tenancy?.property?.address}
          </p>
        </div>

        <div>
          <Link to={`/tenancies/${tenancyId}/inspections/${type}/review`}>
            <Button variant="secondary" size="sm" icon={FileCheck}>
              Review Summary & Sign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
          <span>
            Step {activeStepIndex + 1} of {totalSteps}:{' '}
            <strong className="text-primary font-headline">
              {isMetersStep ? 'Utility Meters' : currentRoomName}
            </strong>
          </span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stepper Pills Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {steps.map((st, idx) => {
          const isActive = idx === activeStepIndex;
          const isPassed = idx < activeStepIndex;

          return (
            <button
              key={st}
              type="button"
              onClick={() => setActiveStepIndex(idx)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : isPassed
                  ? 'bg-emerald-50 text-verified border border-emerald-200'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {isPassed ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{st}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content: Room Items OR Meters Form */}
      {isMetersStep ? (
        <div className="space-y-6">
          <MeterForm
            meters={inspection.meters || []}
            readOnly={isLocked}
            onUpdateMeter={(meterType, data) =>
              updateMeterMutation.mutateAsync({ meterType, data })
            }
          />

          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 flex items-center justify-between">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveStepIndex(activeStepIndex - 1)}
              icon={ArrowLeft}
            >
              Previous Room
            </Button>
            <Button
              variant="brass"
              size="md"
              isLoading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              icon={FileCheck}
            >
              Submit Inspection for Review
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                <Layers className="w-5 h-5 text-brass" />
                <span>Room: {currentRoomName}</span>
              </h2>
              <span className="text-xs text-on-surface-variant font-mono">
                {currentRoomRecords.length} items cataloged
              </span>
            </div>
          </div>

          {/* Cards for each item in this room */}
          <div className="space-y-4">
            {currentRoomRecords.map((record) => {
              // If move-out, find move-in baseline record
              const moveInRef = inspection.moveInBaseline?.records?.find(
                (r) => r.item?._id?.toString() === record.item?._id?.toString()
              );

              return (
                <ItemCard
                  key={record.id || record._id}
                  record={record}
                  inspectionType={inspectionType}
                  moveInReference={moveInRef}
                  readOnly={isLocked}
                  onUpdateRecord={(itemId, data) =>
                    updateRecordMutation.mutate({ itemId, data })
                  }
                  onUploadPhoto={(itemId, formData) =>
                    uploadPhotoMutation.mutateAsync({ itemId, formData })
                  }
                  onDeletePhoto={(photoId) => deletePhotoMutation.mutate(photoId)}
                />
              );
            })}
          </div>

          {/* Bottom Step Actions */}
          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 flex items-center justify-between">
            <Button
              variant="secondary"
              size="md"
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex(activeStepIndex - 1)}
              icon={ArrowLeft}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setActiveStepIndex(activeStepIndex + 1)}
              icon={ArrowRight}
            >
              {activeStepIndex === roomsList.length - 1 ? 'Proceed to Utility Meters' : 'Next Room'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
