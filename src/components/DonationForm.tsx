'use client';

import { useState, useEffect } from 'react';

export default function DonationForm() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  // Load organizations on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        const data = await res.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        console.error('Failed to load organizations:', err);
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');

    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, amount, message }),
      });

      if (res.ok) {
        setStatus('Donation successful! 🎉');
        setAmount('');
        setMessage('');
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error.');
    }
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <h2 className="text-xl font-bold mb-4">Make a Donation</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          required
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <option value="">Select an organization</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Donation amount"
          required
          className="text-lg font-semibold mb-2 text-white/80"
        />

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message"
          className="text-lg font-semibold mb-2 text-white/80e"
        />

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 rounded p-2 font-semibold"
        >
          Donate
        </button>
      </form>

      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
  );
}
