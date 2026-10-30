import React, { useRef, useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Camera, Trash2, Maximize2, ShieldCheck, UploadCloud, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PhotoUploader({
  photos = [],
  onUpload,
  onDelete,
  disabled = false,
  readOnly = false,
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPEG, PNG, WebP) are accepted');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image exceeds 8 MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    setIsUploading(true);
    try {
      await onUpload(formData);
      toast.success('Photo plate attached and hashed');
    } catch (err) {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            isLoading={isUploading}
            icon={Camera}
          >
            Attach Photo Plate
          </Button>
          <span className="text-[11px] text-on-surface-variant font-mono">
            {photos.length} plate{photos.length === 1 ? '' : 's'} attached
          </span>
        </div>
      )}

      {/* Thumbnails Gallery */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {photos.map((photo) => (
            <div
              key={photo.id || photo._id}
              className="group relative rounded border border-outline-variant/40 bg-surface-container overflow-hidden aspect-[4/3] flex flex-col justify-end shadow-sm"
            >
              <img
                src={photo.fileUrl}
                alt="Condition Evidence"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />

              {/* SHA-256 Stamp Overlay */}
              <div className="relative z-10 bg-primary/85 backdrop-blur-xs text-white p-1 px-1.5 flex items-center justify-between text-[9px] font-mono leading-tight">
                <span className="truncate max-w-[90px]" title={photo.sha256}>
                  SHA:{photo.sha256?.slice(0, 8)}...
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="hover:text-brass transition-colors"
                  title="Expand Full Plate"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>

              {/* Delete button (if not readOnly) */}
              {!readOnly && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this photographic plate?')) {
                      onDelete(photo.id || photo._id);
                    }
                  }}
                  className="absolute top-1.5 right-1.5 z-20 p-1 rounded bg-black/60 hover:bg-error text-white transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Photo Inspection Lightbox Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title="Photographic Evidentiary Plate"
        subtitle={
          selectedPhoto ? `Captured ${new Date(selectedPhoto.takenAt).toLocaleString()}` : ''
        }
        maxWidth="max-w-2xl"
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="rounded overflow-hidden border border-outline-variant/40 bg-black flex items-center justify-center max-h-[65vh]">
              <img
                src={selectedPhoto.fileUrl}
                alt="Full Evidence"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="p-3 bg-surface-container-low rounded border border-outline-variant/30 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <ShieldCheck className="w-4 h-4 text-verified" />
                <span>Cryptographic Digest (SHA-256 Verifiable):</span>
              </div>
              <p className="font-mono text-[11px] text-on-surface-variant break-all select-all">
                {selectedPhoto.sha256}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
