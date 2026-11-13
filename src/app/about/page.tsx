// app/about/page.tsx
import { Card } from "@/components/ui/Card";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: `About | ${BRAND_NAME}`,
  description: "What The Penny Effect is, and how giving works here.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-(--space-section)">
      <h1 className="text-3xl font-bold">About {BRAND_NAME}</h1>
      <Card className="space-y-4">
        <p>
          {BRAND_NAME} makes small, regular giving easy and visible. Small inputs, large effects: that&apos;s
          the idea behind our logo, the Lorenz attractor.
        </p>
        <p>
          You choose the causes you care about. We list only nonprofits a person on our team has checked: each
          is a registered US charity with an EIN, and our donation partner can send it money.
        </p>
        <p>
          <strong className="text-heading">We never hold your money.</strong> Gifts will be processed by our donation
          partner, Every.org, which takes the payment, sends your tax receipt and pays the charity. Until that
          connection is live, gifts you record here are clearly marked &ldquo;recorded, not yet paid&rdquo;.
        </p>
        <p>Every number we show you comes from your own records. No sample data, no estimates presented as fact.</p>
      </Card>
    </div>
  );
}
