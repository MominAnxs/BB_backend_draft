'use client';
import { useState } from 'react';
import { X, AlertTriangle, Save, CheckCircle } from 'lucide-react';

interface AddToCLAProps {
  clientName: string;
  onClose: () => void;
  onSave: (claData: { reason: string; status: 'Saved' | 'Sureshot'; dateAdded: string }) => void;
}

export function AddToCLA({ clientName, onClose, onSave }: AddToCLAProps) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'Saved' | 'Sureshot'>('Saved');
  const [errors, setErrors] = useState({ reason: '' });

  const handleSubmit = () => {
    // Validation
    if (!reason.trim()) {
      setErrors({ reason: 'Please provide a reason for adding to CLA list' });
      return;
    }

    // Save CLA data
    onSave({
      reason: reason.trim(),
      status,
      dateAdded: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-[#272727]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white">Add to CLA List</h2>
                <p className="text-white/80 text-caption">Client Can Leave Anytime</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-white text-body truncate">Client: <strong>{clientName}</strong></p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Info Banner */}
          <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#272727] text-body mb-1">
                  <strong>CLA (Can Leave Anytime) List</strong>
                </p>
                <p className="text-[#5A5A6F] text-caption">
                  Track clients who may churn or are at risk. This helps in proactive account management and retention strategies.
                </p>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="text-[#272727] mb-3 block">
              CLA Status <span className="text-[#E85D4D]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStatus('Saved')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  status === 'Saved'
                    ? 'border-[#204CC7] bg-[#F6F7FF] shadow-md shadow-[#204CC7]/10'
                    : 'border-[#204CC7]/20 bg-white hover:border-[#204CC7]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Save className={`w-5 h-5 ${status === 'Saved' ? 'text-[#204CC7]' : 'text-[#5A5A6F]'}`} />
                  {status === 'Saved' && (
                    <div className="w-5 h-5 bg-[#204CC7] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className={`text-body mb-1 ${status === 'Saved' ? 'text-[#204CC7]' : 'text-[#272727]'}`}>
                  Saved
                </p>
                <p className="text-[#5A5A6F] text-caption">
                  Client is at risk but situation is manageable
                </p>
              </button>

              <button
                onClick={() => setStatus('Sureshot')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  status === 'Sureshot'
                    ? 'border-[#E85D4D] bg-[#FDD7D0] shadow-md shadow-[#E85D4D]/10'
                    : 'border-[#204CC7]/20 bg-white hover:border-[#E85D4D]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-5 h-5 ${status === 'Sureshot' ? 'text-[#E85D4D]' : 'text-[#5A5A6F]'}`} />
                  {status === 'Sureshot' && (
                    <div className="w-5 h-5 bg-[#E85D4D] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className={`text-body mb-1 ${status === 'Sureshot' ? 'text-[#E85D4D]' : 'text-[#272727]'}`}>
                  Sureshot
                </p>
                <p className="text-[#5A5A6F] text-caption">
                  Client is highly likely to leave soon
                </p>
              </button>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="text-[#272727] mb-2 block">
              Reason for CLA <span className="text-[#E85D4D]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors({ reason: '' });
              }}
              placeholder="E.g., Budget constraints, dissatisfied with results, internal team changes, competitor offer..."
              className={`w-full px-4 py-3 border rounded-lg bg-[#F6F7FF] text-[#272727] placeholder:text-[#5A5A6F] focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none ${
                errors.reason ? 'border-[#E85D4D] ring-2 ring-[#E85D4D]/20' : 'border-[#204CC7]/20'
              }`}
              rows={4}
            />
            {errors.reason && (
              <p className="text-[#E85D4D] text-caption mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.reason}
              </p>
            )}
            <p className="text-[#5A5A6F] text-caption mt-2">
              Be specific to help the team understand the situation and take appropriate action.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-[#F6F7FF] to-[#E8EBFF] rounded-lg p-4 border border-[#204CC7]/10">
            <p className="text-[#5A5A6F] text-caption mb-2">Preview</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#5A5A6F] text-body">Status:</span>
                <span className={`px-3 py-1 rounded-full text-caption ${
                  status === 'Saved' 
                    ? 'bg-[#DBEAFE] text-[#204CC7]' 
                    : 'bg-[#FDD7D0] text-[#E85D4D]'
                }`}>
                  {status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5A5A6F] text-body">Date Added:</span>
                <span className="text-[#272727] text-body">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-[#204CC7]/20 text-[#272727] rounded-lg hover:bg-[#F6F7FF] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              !reason.trim()
                ? 'bg-[#5A5A6F] text-white cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white hover:shadow-lg hover:shadow-[#F59E0B]/25'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Add to CLA List</span>
          </button>
        </div>
      </div>
    </div>
  );
}
