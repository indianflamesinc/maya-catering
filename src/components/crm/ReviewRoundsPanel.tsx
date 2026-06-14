// ============================================================
// src/components/crm/ReviewRoundsPanel.tsx
// Shows full review history, diffs, and admin actions
// Place this on /admin/enquiries/[id] page
// ============================================================

'use client';

import { useState } from 'react';

interface ReviewRound {
  id: string;
  round_number: number;
  status: string;
  sheet_url: string;
  sent_at: string;
  responded_at: string | null;
  accepted_at: string | null;
  customer_changes: any[] | null;
  sent_snapshot: any;
  customer_comments: string | null;
  admin_notes: string | null;
}

interface Props {
  enquiryId: string;
  quoteId: string;
  rounds: ReviewRound[];
  onRoundUpdate: () => void; // callback to refresh parent
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent_for_review:     { label: 'Awaiting Customer',   color: 'bg-yellow-100 text-yellow-800' },
  customer_responded:  { label: 'Customer Responded ⚡', color: 'bg-blue-100 text-blue-800' },
  admin_reviewing:     { label: 'You Are Reviewing',   color: 'bg-purple-100 text-purple-800' },
  accepted:            { label: '✅ Accepted & Locked', color: 'bg-green-100 text-green-800' },
  revised:             { label: 'Revised — New Round Sent', color: 'bg-gray-100 text-gray-600' },
  cancelled:           { label: 'Cancelled',            color: 'bg-red-100 text-red-700' },
};

export function ReviewRoundsPanel({ enquiryId, quoteId, rounds, onRoundUpdate }: Props) {
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const latestRound = rounds[rounds.length - 1];

  async function handleAccept(roundId: string) {
    setActionLoading('accept');
    await patchRound(roundId, { status: 'accepted', accepted_at: new Date().toISOString() });
    // Also update enquiry status
    await fetch('/api/enquiries/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enquiry_id: enquiryId, review_status: 'review_accepted' }),
    });
    setActionLoading(null);
    onRoundUpdate();
  }

  async function handleSendRevised(roundId: string) {
    setActionLoading('revised');
    // Mark current round as revised
    await patchRound(roundId, { status: 'revised', admin_notes: adminNote });
    // Trigger a new send-review (creates next round)
    await fetch('/api/quotes/send-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enquiry_id: enquiryId, quote_id: quoteId }),
    });
    setAdminNote('');
    setActionLoading(null);
    onRoundUpdate();
  }

  async function handleSaveNote(roundId: string) {
    setActionLoading('note');
    await patchRound(roundId, { admin_notes: adminNote });
    setAdminNote('');
    setActionLoading(null);
    onRoundUpdate();
  }

  async function patchRound(roundId: string, updates: Record<string, any>) {
    await fetch('/api/quotes/review-round-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: roundId, updates }),
    });
  }

  if (rounds.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C9A84C]">
        Customer Review Rounds
      </h3>

      {rounds.map((round, idx) => {
        const isLatest = idx === rounds.length - 1;
        const status = STATUS_LABELS[round.status] ?? { label: round.status, color: 'bg-gray-100 text-gray-600' };
        const changes = round.customer_changes ?? [];
        const snapshot = round.sent_snapshot?.tray_items ?? [];

        return (
          <div
            key={round.id}
            className={`rounded-xl border ${isLatest ? 'border-[#C9A84C]' : 'border-gray-200'} bg-white overflow-hidden`}
          >
            {/* Round header */}
            <div className={`flex items-center justify-between px-4 py-3 ${isLatest ? 'bg-[#05091A]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${isLatest ? 'text-[#C9A84C]' : 'text-gray-700'}`}>
                  Round {round.round_number}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Sent: {fmtDate(round.sent_at)}</span>
                {round.responded_at && <span>Responded: {fmtDate(round.responded_at)}</span>}
                <a
                  href={round.sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C9A84C] font-medium hover:underline"
                >
                  📋 Open Sheet
                </a>
              </div>
            </div>

            {/* Changes diff */}
            {changes.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Customer Changes
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b">
                        <th className="text-left py-1 pr-4">Dish</th>
                        <th className="text-left py-1 pr-4">Category</th>
                        <th className="text-left py-1 pr-4">Tray Size</th>
                        <th className="text-left py-1 pr-4">Qty (original)</th>
                        <th className="text-left py-1 pr-4 text-blue-600">Qty (customer)</th>
                        <th className="text-left py-1">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.filter((c: any) => c.dish).map((c: any, i: number) => {
                        const orig = snapshot.find(
                          (o: any) => o.dish_name?.toLowerCase() === c.dish?.toLowerCase()
                        );
                        const qtyChanged = orig && String(orig.tray_quantity) !== String(c.quantity);
                        return (
                          <tr key={i} className={`border-b border-gray-50 ${qtyChanged ? 'bg-blue-50' : ''}`}>
                            <td className="py-1.5 pr-4 font-medium">{c.dish}</td>
                            <td className="py-1.5 pr-4 text-gray-500">{c.category}</td>
                            <td className="py-1.5 pr-4">{c.tray_size}</td>
                            <td className="py-1.5 pr-4 text-gray-400">
                              {orig?.tray_quantity ?? '—'}
                            </td>
                            <td className={`py-1.5 pr-4 font-bold ${qtyChanged ? 'text-blue-700' : 'text-gray-500'}`}>
                              {c.quantity}
                              {qtyChanged && <span className="ml-1 text-xs text-blue-500">changed</span>}
                            </td>
                            <td className="py-1.5 text-gray-600 italic">{c.comments || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Admin notes */}
            {round.admin_notes && (
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-800">
                <strong>Your note:</strong> {round.admin_notes}
              </div>
            )}

            {/* Action zone — only on latest unresolved round */}
            {isLatest && round.status === 'customer_responded' && (
              <div className="px-4 py-4 bg-gray-50 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Your Actions
                </p>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Internal note (optional — not shown to customer)…"
                  rows={2}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A84C]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAccept(round.id)}
                    disabled={!!actionLoading}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === 'accept' ? 'Locking…' : '✅ Accept & Lock Quote'}
                  </button>
                  <button
                    onClick={() => handleSendRevised(round.id)}
                    disabled={!!actionLoading}
                    className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#05091A] hover:bg-[#E2C87A] disabled:opacity-50"
                  >
                    {actionLoading === 'revised' ? 'Sending…' : '📋 Send Revised Quote (Round ' + (round.round_number + 1) + ')'}
                  </button>
                  <button
                    onClick={() => handleSaveNote(round.id)}
                    disabled={!!actionLoading || !adminNote.trim()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    {actionLoading === 'note' ? 'Saving…' : 'Save Note'}
                  </button>
                </div>
              </div>
            )}

            {round.status === 'accepted' && (
              <div className="px-4 py-3 bg-green-50 text-sm text-green-800 font-medium">
                ✅ Quote accepted and locked on {fmtDate(round.accepted_at!)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });
}
