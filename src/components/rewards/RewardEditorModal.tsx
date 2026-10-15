import React, { useState } from 'react';
import type { Reward } from '../../types/database.types';
import { Plus, Edit2, ShieldAlert } from 'lucide-react';

interface RewardEditorModalProps {
  reward: Reward | null; // null for creating new reward
  isOpen: boolean;
  onClose: () => void;
  onSave: (rewardData: {
    title: string;
    description?: string;
    points_cost: number;
    category?: string;
    image_url?: string;
    inventory_count?: number | null;
    is_active?: boolean;
  }) => Promise<boolean>;
}

export const RewardEditorModal: React.FC<RewardEditorModalProps> = ({
  reward,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState<number>(100);
  const [category, setCategory] = useState<string>('merchandise');
  const [imageUrl, setImageUrl] = useState('');
  const [isUnlimitedInventory, setIsUnlimitedInventory] = useState(true);
  const [inventoryCount, setInventoryCount] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setDescription(reward.description || '');
      setPointsCost(reward.points_cost);
      setCategory(reward.category);
      setImageUrl(reward.image_url || '');
      setIsUnlimitedInventory(reward.inventory_count === null);
      setInventoryCount(reward.inventory_count ?? 10);
      setIsActive(reward.is_active);
      setErrorMessage(null);
    } else {
      setTitle('');
      setDescription('');
      setPointsCost(100);
      setCategory('merchandise');
      setImageUrl('');
      setIsUnlimitedInventory(true);
      setInventoryCount(10);
      setIsActive(true);
      setErrorMessage(null);
    }
  }, [reward, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || pointsCost <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        points_cost: pointsCost,
        category,
        image_url: imageUrl.trim() || undefined,
        inventory_count: isUnlimitedInventory ? null : Number(inventoryCount),
        is_active: isActive,
      });

      if (success) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white">
              {reward ? <Edit2 className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {reward ? 'Edit Civic Reward' : 'Create Civic Reward'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure reward details, points, and available inventory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reward Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Civic Champion T-Shirt, Eco Metro Pass..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detail eligibility requirements, item specs, or fulfillment instructions..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Points Cost <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={pointsCost}
                onChange={(e) => setPointsCost(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="merchandise">Merchandise</option>
                <option value="voucher">Voucher</option>
                <option value="experience">Experience</option>
                <option value="civic_perk">Civic Perk</option>
                <option value="recognition">Recognition</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Image URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/item.jpg"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Inventory Controls */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Inventory Management</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimitedInventory}
                  onChange={(e) => setIsUnlimitedInventory(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Unlimited Stock (NULL)</span>
              </label>
            </div>

            {!isUnlimitedInventory && (
              <div className="pt-1">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Remaining Available Units:
                </label>
                <input
                  type="number"
                  min="0"
                  value={inventoryCount}
                  onChange={(e) => setInventoryCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-900 font-mono"
                />
              </div>
            )}
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <div className="text-xs font-semibold text-slate-900">Active in Catalog</div>
              <div className="text-[11px] text-slate-500">
                Inactive rewards are hidden from ordinary tenant users
              </div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving Reward...' : reward ? 'Update Reward' : 'Create Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
