// app/about/page.tsx
export const metadata = {
  title: "About | Penny Effect",
  description: "Learn what The Penny Effect is all about."
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold mb-2">About The Penny Effect</h1>
      <p>
        The Penny Effect is a platform for micro-donations that add up to big
        change. Our mission is to make generosity effortless by letting users
        support causes they care about — automatically, transparently, and at
        any scale.
      </p>
      <p>
        Every cent counts. By combining small actions from many people, we can
        create powerful collective impact.
      </p>
      <p>
        Whether you round up your spare change or donate a few cents per day,
        you’re part of something bigger. That’s the Penny Effect.
      </p>
    </div>
  );
}
