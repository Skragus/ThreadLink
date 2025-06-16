import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfigurationOverrideModalProps {
  isOpen: boolean;
  calculatedDrones: number;
  maxDrones: number;
  onProceed: () => void;
  onCancel: () => void;
}

export const ConfigurationOverrideModal: React.FC<ConfigurationOverrideModalProps> = ({
  isOpen,
  calculatedDrones,
  maxDrones,
  onProceed,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-[var(--card-bg)] border border-[var(--divider)] rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header with warning icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Settings Conflict Detected
          </h3>
        </div>

        {/* Body content */}
        <div className="mb-6">
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Your <span className="text-[var(--text-primary)] font-medium">'Drone Density'</span> setting 
            calculated a need for <span className="text-amber-500 font-bold">{calculatedDrones}</span> drones.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-3">
            However, your <span className="text-[var(--text-primary)] font-medium">'Max Drones'</span> safety 
            limit is set to <span className="text-amber-500 font-bold">{maxDrones}</span>.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-3">
            Processing will proceed using only <span className="text-amber-500 font-bold">{maxDrones}</span> drones. 
            This may result in a less detailed summary than you intended.
          </p>
        </div>

        {/* Visual indicator of the override */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-600">Requested:</span>
            <span className="text-amber-500 font-mono">{calculatedDrones} drones</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-amber-600">Will use:</span>
            <span className="text-amber-500 font-mono font-bold">{maxDrones} drones</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Proceed Anyway
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/80 text-white rounded-lg font-medium transition-colors"
          >
            Cancel & Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
};