'use client';

import { buttonPrimary } from "@/components/ui/buttons";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatCents } from '@/lib/money';

type OrganizationOption = { id: string; name: string; description: string | null };

export default function DonationForm() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Updated immediately (unlike state), so a second click in the same instant is ignored.
  const inFlight = useRef(false);
  // One key per gift: sent with the request so the server records it at most
  // once (double-clicks, retries). Replaced only after a gift is recorded, so a
  // retry after an error reuses it and can't create a duplicate.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  // Load organizations on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        const data = await res.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        console.error('Failed to load organizations:', err);
      } finally {
        setOrgsLoaded(true);
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // ignore extra clicks while a request is in flight
    inFlight.current = true;
    setSubmitting(true);
    setStatus('');

    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, amount, message, idempotencyKey }),
      });

      if (res.ok) {
        const data: { donation: { amountCents: number; currency: string } } = await res.json();
        // Honest wording: nothing is charged until the donation partner is integrated.
        setStatus(
          `Recorded your ${formatCents(data.donation.amountCents, data.donation.currency)} gift. ` +
            'No payment was taken. Real payments arrive with our donation partner.',
        );
        setAmount('');
        setMessage('');
        setIdempotencyKey(crypto.randomUUID()); // next gift gets a fresh key
        // Re-render the server parts of the page (totals, recent gifts) with the new row.
        router.refresh();
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false); // re-enable the button (after success or error)
    }
  };

  const field = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-heading">Organization</span>
          <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required className={field}>
            <option value="">Select an organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        {orgsLoaded && organizations.length === 0 && (
          <p className="text-sm text-muted">
            No organizations are available yet. We only list nonprofits we have verified; check back soon.
          </p>
        )}

        <label className="space-y-1">
          <span className="text-sm font-semibold text-heading">Amount (USD)</span>
          <input
            type="number"
            min="1"
            max="10000"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5.00"
            required
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-semibold text-heading">Message (optional)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={field} />
        </label>

        <button type="submit" disabled={submitting} aria-busy={submitting} className={`${buttonPrimary} disabled:cursor-wait disabled:opacity-70`}>
          {submitting ? "Recording…" : "Record donation"}
        </button>
        <p className="text-sm text-muted">No payment is taken yet.</p>
      </form>

      {status && <p className="mt-4 text-sm" role="status">{status}</p>}
    </div>
  );
}
