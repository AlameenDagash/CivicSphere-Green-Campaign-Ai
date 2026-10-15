import React, { useState } from 'react';
import type { Reward } from '../../types/database.types';
import { Gift, ShieldCheck, AlertCircle, Sparkles, Send, CheckCircle2 } from 'lucide-react';

interface RedemptionModalProps {
  reward: Reward | null;
  isOpen: boolean;
  onClose: () => void;
  availablePoints: number;
  onRedeem: (rewardId: string, deliveryInstructions: string, idempotencyKey: string) => Promise<boolean>;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
  reward,
  isOpen,
  onClose,
  availablePoints,
  onRedeem,
}) => {
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Stable idempotency key generated when the modal opens for this reward
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string>(() =>
    `redempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // Reset state when reward changes
  React.useEffect(() => {
    if (reward) {
      setDeliveryInstructions('');
      setErrorMessage(null);
      setIsSuccess(false);
      setIsSubmitting(false);
      setCurrentIdempotencyKey(`redempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [reward]);

  if (!isOpen || !reward) return null;

  const hasEnoughPoints = availablePoints >= reward.points_cost;
  const isOutOfStock = reward.inventory_count !== null && reward.inventory_count <= 0;
  const isEligible = hasEnoughPoints && !isOutOfStock && reward.is_active;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Pass the stable idempotency key through
      const success = await onRedeem(reward.id, deliveryInstructions.trim(), currentIdempotencyKey);
      if (success) {
        setIsSuccess(true);
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Redeem Civic Reward</h2>
              <p className="text-xs text-slate-500">Atomic civic points redemption claim</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Redemption Submitted!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  Your claim for <span className="font-semibold text-slate-900">{reward.title}</span> has been created with status <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">pending</span>.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Your civic points balance has been updated. An Operations & Rewards manager will review and process your claim.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  View My Claims
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Reward Snapshot */}
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                {reward.image_url ? (
                  <img
                    src={reward.image_url}
                    alt={reward.title}
                    className="h-18 w-18 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="flex h-18 w-18 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0 font-bold text-sm">
                    {reward.category.substring(0, 3).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      {reward.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {reward.inventory_count === null
                        ? 'Unlimited stock'
                        : `${reward.inventory_count} remaining`}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 truncate">{reward.title}</h3>
                  {reward.description && (
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{reward.description}</p>
                  )}
                </div>
              </div>

              {/* Points Summary Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Points Cost</span>
                  <div className="text-lg font-bold text-amber-600 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{reward.points_cost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Your Available Points</span>
                  <div className={`text-lg font-bold flex items-center gap-1 ${hasEnoughPoints ? 'text-emerald-700' : 'text-red-600'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{availablePoints.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Warning Alerts */}
              {!hasEnoughPoints && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient Points:</span> You need {(reward.points_cost - availablePoints).toLocaleString()} more civic points to redeem this reward. Participate in activities and courses to earn points.
                  </div>
                </div>
              )}

              {isOutOfStock && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Out of Stock:</span> This reward currently has 0 inventory remaining. Check back later or contact operations.
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="font-medium">{errorMessage}</div>
                </div>
              )}

              {/* Delivery Instructions */}
              <div>
                <label htmlFor="delivery-instructions" className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery / Fulfillment Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="delivery-instructions"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={3}
                  placeholder="Provide physical delivery address, email for vouchers, contact number, or preferred pickup times..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Your details will be reviewed only by authorized Operations & Rewards managers.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
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
                  disabled={!isEligible || isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Processing Atomic Claim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm Redemption ({reward.points_cost} Pts)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
