// "Choosing images": the image policy (D-027) for admins adding news images,
// and for anyone adding photos to the Why give cards. Based on the Dóchas
// Guide to Ethical Communications (the updated Dóchas Code of Conduct on
// Images and Messages). Written for volunteer admins who aren't technical.
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { textLink } from "@/components/ui/buttons";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Choosing images | Admin" };

const DOCHAS_GUIDE_URL = "https://dochas.ie/resources/ethical-communications/guide-to-ethical-communications/";

export default async function ImageGuidePage() {
  await requireAdminPage();

  return (
    <div className="mx-auto max-w-3xl space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Choosing images</h1>
        <p className="text-muted">
          For news images and any photo on the site. A news item works fine without an image: if you&apos;re unsure, leave
          it out.
        </p>
      </header>

      <Card>
        <CardHeader title="The idea in one line" />
        <p>
          Show people with dignity, as people doing things, not as victims to feel sorry for, and tell the truth about what
          the picture shows. Our rules follow the{" "}
          <a href={DOCHAS_GUIDE_URL} target="_blank" rel="noopener noreferrer" className={textLink}>
            Dóchas Guide to Ethical Communications
          </a>
          , which many charities use.
        </p>
      </Card>

      <Card>
        <CardHeader title="Good images" />
        <ul className="list-disc space-y-2 ps-5">
          <li>People acting and deciding: health workers, teachers, farmers, parents, community leaders at work.</li>
          <li>The program itself: nets being handed out, a clinic, a well, a classroom.</li>
          <li>A range of people, not only women and children.</li>
          <li>Photos the organization published itself, about the news you&apos;re posting.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader title="Don't use" />
        <ul className="list-disc space-y-2 ps-5">
          <li>Pictures chosen to make people feel guilty or sorry: crying or starving children, people at their lowest.</li>
          <li>Staged scenes, actors or AI-generated pictures presented as real.</li>
          <li>Tight crops that make someone look more helpless than the full picture does.</li>
          <li>A child who can be recognized in a sensitive story (illness, abuse, conflict, displacement).</li>
          <li>Anyone who could be put at risk by being recognized.</li>
          <li>Images that make it look as if aid alone is the answer, or that the people shown have no say.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader title="Consent" />
        <div className="space-y-3">
          <p>
            If people can be recognized, use a photo only from the organization that took it (it is responsible for having
            their permission), or one where the photographer recorded consent. Large crowds in a public, non-sensitive
            setting are fine.
          </p>
          <p>We never take photos of identifiable people from random websites or image searches.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Describe it honestly" />
        <div className="space-y-3">
          <p>
            The image description says plainly what a sighted person sees (&ldquo;Health workers unloading bed nets from a
            truck&rdquo;). Don&apos;t add drama, and don&apos;t guess at feelings or facts you can&apos;t see.
          </p>
          <p>
            We show news images with the credit &ldquo;Image: &lt;source site&gt;&rdquo;. Photos on our own pages (like
            the Why give cards) also carry a caption saying what, where and when, plus the photographer or organization and
            the licence.
          </p>
        </div>
      </Card>

      <p>
        <Link href="/admin/news" className={textLink}>
          Back to News
        </Link>
      </p>
    </div>
  );
}
