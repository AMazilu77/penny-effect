// "How to verify a nonprofit": the guide every Verify button links to.
// Written for volunteer admins who aren't technical. The checklist itself
// lives in src/lib/verification-guide.ts and is also shown inline on each
// organization's page, prefilled with that organization's EIN.
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { textLink } from "@/components/ui/buttons";
import { requireAdminPage } from "@/lib/admin";
import { HIGHEST_IMPACT_RULE } from "@/lib/highest-impact";
import {
  GIVEWELL_TOP_CHARITIES_URL,
  RED_FLAGS,
  VERIFICATION_NOTE_MIN,
  verificationChecklist,
} from "@/lib/verification-guide";

export const metadata = { title: "How to verify a nonprofit | Admin" };

export default async function VerifyGuidePage() {
  await requireAdminPage();
  const steps = verificationChecklist({ ein: null, everyOrgSlug: null, website: null });

  return (
    <div className="mx-auto max-w-3xl space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">How to verify a nonprofit</h1>
        <p className="text-muted">
          About 10 minutes per organization. On each organization&apos;s page the same checklist appears with links
          already filled in for its EIN.
        </p>
      </header>

      <Card>
        <CardHeader title="What “verified” means here" />
        <div className="space-y-3">
          <p>
            When you verify an organization, donors can see it and give to it. They are trusting us that{" "}
            <strong className="text-heading">a person checked</strong> it is a real, registered US charity, in good
            standing with the IRS, and that the name, tax ID (EIN) and mission all match.
          </p>
          <p>
            Verified is <strong className="text-heading">not</strong> a rating of how well a charity spends money. The one
            exception is the Highest Impact category (below), which follows GiveWell&apos;s research.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="The checklist" description="Do all five. If any one fails, don't verify." />
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.id} className="rounded-control border bg-inset p-4">
              <h3 className="font-semibold">
                {i + 1}. {step.title}
              </h3>
              <p className="mt-1">{step.check}</p>
              {step.links.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {step.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={textLink}>
                      {l.label}
                    </a>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader title="Red flags" />
        <ul className="list-disc space-y-1 ps-5">
          {RED_FLAGS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="mt-4 rounded-control border border-warn bg-warn-soft p-4 text-warn">
          <p className="font-semibold">If you see one:</p>
          <ol className="mt-1 list-decimal space-y-1 ps-5">
            <li>Don&apos;t verify it.</li>
            <li>If it&apos;s already live, hide it. Hiding never deletes anything.</li>
            <li>Write down what you found and tell the other admins. When in doubt, hide it and ask.</li>
          </ol>
        </div>
      </Card>

      <Card>
        <CardHeader title="Optional: Charity Navigator rating" />
        <div className="space-y-3">
          <p>
            After verifying, you can add the organization&apos;s Charity Navigator rating on its admin page: open its
            Charity Navigator profile (the link is filled in), copy the score (0–100) and stars exactly, and save. The
            profile link is required, and the date is set to the day you save it.
          </p>
          <p>
            Never round, adjust or combine the rating with anything else: Charity Navigator&apos;s terms require it to
            be shown exactly as published. It describes how a charity is run, not its impact per dollar. Ratings older
            than about six months are labelled &ldquo;may be out of date&rdquo;; re-check and save to refresh them.
          </p>
          <p className="rounded-control border border-warn bg-warn-soft p-3 text-sm text-warn">
            Until the owner confirms with Charity Navigator that copying ratings by hand is allowed (their API terms
            cover it; their website terms are stricter), only enter ratings when the owner says so.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Highest Impact" />
        <div className="space-y-3">
          <p>
            <strong className="text-heading">Only:</strong> {HIGHEST_IMPACT_RULE}
          </p>
          <p>
            Why: this category promises donors the most good per dollar. We don&apos;t judge that ourselves; we rely on
            GiveWell&apos;s published research, which compares charities in depth. GiveDirectly isn&apos;t a GiveWell Top
            Charity: GiveWell uses it as its cash-transfer benchmark, and the site labels it that way.
          </p>
          <p>
            Before adding an organization to Highest Impact, check that it&apos;s on{" "}
            <a href={GIVEWELL_TOP_CHARITIES_URL} target="_blank" rel="noopener noreferrer" className={textLink}>
              GiveWell&apos;s Top Charities page
            </a>{" "}
            today. If one drops off the list, take it out of Highest Impact (it can stay in its other causes).
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Writing the verification note" />
        <div className="space-y-3">
          <p>
            Every verification needs a short note (at least {VERIFICATION_NOTE_MIN} characters) saying what you checked.
            Other admins see it next to your name, so they know why the organization is live.
          </p>
          <p className="rounded-control border bg-inset p-3">
            Example: &ldquo;IRS: listed, not revoked. ProPublica: 990 for 2024. Candid and Charity Navigator match, no
            advisories. EIN in website footer. Every.org own profile, accepts gifts.&rdquo;
          </p>
          <p>
            If you have any connection to the organization (you work, volunteer or donate there through work), don&apos;t
            verify it: leave it for another admin.
          </p>
        </div>
      </Card>

      <p>
        <Link href="/admin/organizations" className={textLink}>
          ← Back to organizations
        </Link>
      </p>
    </div>
  );
}
