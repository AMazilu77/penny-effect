"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Cause = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

const CAUSES: Cause[] = [
  { id: "humanitarian", name: "Humanitarian Aid", description: "Disaster relief, refugee support, and global health initiatives.", emoji: "🌍" },
  { id: "animal", name: "Animal Welfare", description: "Wildlife conservation, rescue centers, and adoption programs.", emoji: "🐘" },
  { id: "environment", name: "Environment", description: "Reforestation, ocean cleanup, and clean-energy projects.", emoji: "🌳" },
  { id: "mental_health", name: "Mental Health", description: "Counseling access, awareness, and suicide prevention.", emoji: "🧠" },
  { id: "political", name: "Political Reform", description: "Transparency, civil rights, and fair-vote advocacy.", emoji: "🏛️" },
  { id: "medical", name: "Medical Research", description: "Funding for cancer, rare-disease, and biotech research.", emoji: "💉" },
  { id: "education", name: "Education", description: "Schools, literacy, and STEM outreach programs.", emoji: "📚" },
  { id: "space", name: "Space & Science", description: "Scientific advancement, exploration, and innovation.", emoji: "🚀" },
];

export default function OnboardingInterestsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [progress, setProgress] = useState(50); // Example static progress for step 2 of 4
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectAll) {
      setSelected(CAUSES.map(c => c.id));
    } else if (selected.length === CAUSES.length) {
      // If user manually deselects one, uncheck "all causes"
      setSelectAll(false);
    }
  }, [selectAll]);

  const toggleCause = (id: string) => {
    if (selectAll) setSelectAll(false); // disable "all" if manually choosing
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAllowLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationAllowed(true);
        // You could POST this to /api/location if desired
        console.log("User location:", pos.coords.latitude, pos.coords.longitude);
      },
      err => console.warn("Location denied:", err)
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
      router.push("/dashboard"); // continue onboarding flow
    } catch (err) {
      console.error(err);
      alert("There was an error saving your interests.");
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectAll || selected.length > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-10 bg-gradient-to-b from-slate-900 to-black text-white">
      {/* Progress bar */}
      <div className="w-full max-w-3xl mb-6">
        <div className="text-sm mb-1">Step 2 of 4 — Choose your causes</div>
        <div className="w-full bg-slate-700 h-2 rounded-full">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-semibold mb-2">What causes move you?</h1>
      <p className="text-gray-300 mb-8 text-center max-w-2xl">
        Select at least one type of cause you care about to see a curated feed of nonprofits and real-world updates.  
        You can also volunteer or get involved locally.
      </p>

      {/* "All Causes" checkbox */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={e => setSelectAll(e.target.checked)}
            className="w-5 h-5 accent-emerald-500"
          />
          <span className="text-lg">I care about all causes</span>
        </label>
      </div>

      {/* Cause grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mb-10">
        {CAUSES.map(cause => (
          <button
            key={cause.id}
            onClick={() => toggleCause(cause.id)}
            className={`p-5 rounded-2xl border transition-all text-left ${
              selected.includes(cause.id)
                ? "bg-emerald-600/20 border-emerald-400 shadow-lg shadow-emerald-900"
                : "border-slate-600 hover:border-emerald-400/50"
            }`}
          >
            <div className="text-3xl mb-3">{cause.emoji}</div>
            <div className="font-medium text-xl mb-1">{cause.name}</div>
            <p className="text-sm text-gray-400">{cause.description}</p>
          </button>
        ))}
      </div>

      {/* Location permission */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleAllowLocation}
          className={`px-5 py-2 rounded-full text-sm ${
            locationAllowed
              ? "bg-emerald-700"
              : "bg-slate-700 hover:bg-emerald-700 transition"
          }`}
        >
          {locationAllowed ? "Location Enabled ✅" : "Enable Location for Local Opportunities"}
        </button>
      </div>

      {/* Continue button */}
      <button
        onClick={handleSubmit}
        disabled={!canContinue || loading}
        className={`px-8 py-3 rounded-full font-semibold text-lg transition-all ${
          canContinue
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Saving..." : "Continue"}
      </button>

      <p className="text-gray-400 text-sm mt-4">
        You can update your interests anytime in your profile.
      </p>
    </main>
  );
}
