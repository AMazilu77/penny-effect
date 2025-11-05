"use client";

import React, { useState, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";

type Cause = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

const CAUSES: Cause[] = [
  { id: "Humanitarian Aid", name: "Humanitarian Aid", description: "Disaster relief, refugee support, and global health initiatives.", emoji: "🌍" },
  { id: "Animal Welfare", name: "Animal Welfare", description: "Wildlife conservation, rescue centers, and adoption programs.", emoji: "🐘" },
  { id: "Environment", name: "Environment", description: "Reforestation, ocean cleanup, and clean-energy projects.", emoji: "🌳" },
  { id: "Mental Health", name: "Mental Health", description: "Counseling access, awareness, and suicide prevention.", emoji: "🧠" },
  { id: "Political Reform", name: "Political Reform", description: "Transparency, civil rights, and fair-vote advocacy.", emoji: "🏛️" },
  { id: "Medical Research", name: "Medical Research", description: "Funding for cancer, rare-disease, and biotech research.", emoji: "💉" },
  { id: "Education", name: "Education", description: "Schools, literacy, and STEM outreach programs.", emoji: "📚" },
  { id: "Space & Science", name: "Space & Science", description: "Scientific advancement, exploration, and innovation.", emoji: "🚀" },
];

export default function OnboardingInterestsPage(): JSX.Element {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [progress] = useState(50);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectAll) {
      setSelected(CAUSES.map((c) => c.id));
    } else if (selected.length === CAUSES.length) {
      setSelectAll(false);
    }
  }, [selectAll, selected.length]);

  const toggleCause = (id: string) => {
    if (selectAll) setSelectAll(false);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAllowLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setLocationAllowed(true),
      (err) => console.warn("Location denied:", err)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          causes: selectAll ? ["all"] : selected,
          locationAllowed,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("There was an error saving your interests.");
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectAll || selected.length > 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center px-6 py-10">
      {/* Progress bar */}
      <div className="w-full max-w-3xl mb-8">
        <div className="text-sm mb-1 text-gray-600">
          Step 2 of 2 — Choose your causes
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-semibold text-emerald-700 mb-2">
        What causes move you?
      </h1>
      <p className="text-center max-w-2xl mb-10 text-gray-600">
        Select at least one cause to personalize your feed with nonprofits and real-world updates.
      </p>

      {/* "All Causes" checkbox */}
      <div className="mb-8">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={(e) => setSelectAll(e.target.checked)}
            className="w-5 h-5 accent-emerald-600"
          />
          <span className="text-lg text-gray-700 font-medium">
            I care about all causes
          </span>
        </label>
      </div>

      {/* Cause grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mb-10">
        {CAUSES.map((cause) => (
          <button
            key={cause.id}
            type="button"
            onClick={() => toggleCause(cause.id)}
            className={`p-5 rounded-2xl border text-left transition-all duration-200 shadow-sm hover:shadow-md ${
              selected.includes(cause.id)
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200"
                : "bg-white border-gray-300 hover:border-emerald-300"
            }`}
          >
            <div className="text-3xl mb-3">{cause.emoji}</div>
            <div className="font-semibold text-lg text-emerald-800 mb-1">
              {cause.name}
            </div>
            <p className="text-sm text-gray-600">{cause.description}</p>
          </button>
        ))}
      </div>

      {/* Location permission */}
      <div className="flex items-center gap-3 mb-10">
        <button
          type="button"
          onClick={handleAllowLocation}
          className={`px-6 py-2 rounded-full text-sm font-medium border transition ${
            locationAllowed
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white border-gray-300 hover:border-emerald-400 text-gray-700"
          }`}
        >
          {locationAllowed ? "Location Enabled ✅" : "Enable Location for Local Opportunities"}
        </button>
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canContinue || loading}
        className={`px-10 py-3 rounded-full font-semibold text-lg transition-all shadow-sm ${
          canContinue
            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {loading ? "Saving..." : "Continue"}
      </button>

      <p className="text-gray-500 text-sm mt-6">
        You can update your interests anytime in your profile.
      </p>
    </main>
  );
}
