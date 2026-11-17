// app/why-give/all/page.tsx: "Read it all on one page". The full text of the
// Why give cards (/why-give), for screen readers, search engines and anyone
// who prefers scrolling; the cards carry a shorter version of the same copy.
// The case for giving, and for giving carefully, with real data. Every number comes from src/data/impact (each with a source,
// licence and retrieval date; src/lib/impact.ts). Ranges stay ranges; the page
// never says a particular gift "saved a life".
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { ChartFigure, SourceLine } from "@/components/charts/ChartFigure";
import { LineChart } from "@/components/charts/LineChart";
import { RangeChart } from "@/components/charts/RangeChart";
import { HIGHEST_IMPACT_SLUG } from "@/lib/highest-impact";
import { allFacts, dollars, formatValue, fact, FACTS_RETRIEVED, first, last, percentChange, SERIES, WHERE_YOU_STAND, wholeNumber } from "@/lib/impact";
import { WHY_GIVE_PATH } from "@/lib/why-give-cards";
import { Cite, rows } from "../parts";

export const metadata = {
  title: `Why give (one page) | ${BRAND_NAME}`,
  description: "How much good a small amount can do, why charities differ so much, and the evidence behind it.",
};


export default function WhyGivePage() {
  const child = SERIES.childMortality;
  const poverty = SERIES.extremePoverty;
  const malaria = SERIES.malariaDeaths;
  const malariaLow = malaria.points.reduce((a, b) => (b.value < a.value ? b : a));

  const amf = fact("givewell-amf");
  const mc = fact("givewell-mc");
  const topAverages = fact("givewell-top-charities-averages");
  const amfAvg = fact("givewell-amf-average");
  const mcAvg = fact("givewell-mc-average");
  const who = fact("who-malaria-factsheet");
  const britannica = fact("britannica-ea");
  const netCost = fact("givewell-amf-net-cost");
  const smcCost = fact("givewell-mc-cycle-cost");
  const cochrane = fact("cochrane-itn");
  const ord = fact("ord-dcp2");
  const singer = fact("singer-1972");
  const worked = fact("givewell-worked-example");
  const w = WHERE_YOU_STAND;

  return (
    <div className="mx-auto max-w-3xl space-y-(--space-section)">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Why give?</h1>
        <p className="text-lg text-fg">
          Most of us can do a great deal of good at very little cost to ourselves. This page sets out why, with the evidence
          and its limits, so you can judge for yourself.
        </p>
        <p>
          <Link href={WHY_GIVE_PATH} className={textLink}>
            Read it as short cards instead
          </Link>
        </p>
      </header>

      {/* 1. Singer */}
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">The child in the pond</h2>
        <p>
          In 1972 the philosopher Peter Singer asked a simple question. Suppose you walk past a shallow pond and see a small
          child drowning. You could wade in and pull the child out, but your clothes would be ruined. Almost everyone agrees
          you should save the child: ruined clothes matter very little next to a life.
        </p>
        <p>
          Singer argued that the principle behind that answer doesn&apos;t stop at the edge of the pond. If we can prevent
          something very bad from happening without giving up anything of comparable importance, we ought to do it, and it
          shouldn&apos;t matter whether the person is in front of us or on the other side of the world.
        </p>
        <p>
          Encyclopaedia Britannica credits Singer, starting with this essay, with laying &ldquo;much of the philosophical
          groundwork&rdquo; of the movement now called <em>effective altruism</em>: doing as much good as we can with what we
          give. <Cite href={britannica.source.url}>Britannica</Cite>
        </p>
        <Cite href={singer.source.url}>{singer.source.name}. Paraphrased.</Cite>
      </Card>

      {/* 2. Where you stand */}
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Where a typical Western donor stands</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card level="inset" as="div">
            <div className="text-sm font-medium text-muted">World population with less income than the US median, {w.year}</div>
            <div className="mt-1 text-3xl font-bold text-heading">About {Math.round(w.worldShareBelowUsMedian)}%</div>
            <div className="mt-1 text-sm text-muted">US median: {dollars(w.usMedianPerDay)} a day per person</div>
          </Card>
          <Card level="inset" as="div">
            <div className="text-sm font-medium text-muted">People living on less than $3 a day, {w.year}</div>
            <div className="mt-1 text-3xl font-bold text-heading">{w.worldShareBelow3PerDay}%</div>
            <div className="mt-1 text-sm text-muted">The World Bank&apos;s extreme poverty line</div>
          </Card>
        </div>
        <p>
          In {w.year}, a person at the middle of the US income distribution had about {dollars(w.usMedianPerDay)} a day to live
          on, after taxes and adjusted for prices. That is more than about {Math.round(w.worldShareBelowUsMedian)}% of the
          world&apos;s people had. Around one person in ten lived on less than $3 a day.
        </p>
        <p className="text-sm text-muted">
          How to read this: the figures are per person, in 2021 international dollars, which adjust for what money buys in each
          country. Many poorer countries measure what people consume rather than their income, so the comparison is approximate.
        </p>
        <SourceLine source={w.source} />
      </Card>

      {/* 3. Progress */}
      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Things have improved a lot, and there&apos;s far to go</h2>
          <p>
            Fewer children die young, and fewer people live in extreme poverty, than a generation ago. The numbers that remain
            are still very large.
          </p>
        </div>
        <ChartFigure
          title={child.title}
          summary={
            <>
              Deaths before age five fell from {formatValue(first(child).value, "rate")} per 1,000 births in {first(child).year} to{" "}
              {formatValue(last(child).value, "rate")} in {last(child).year}, a fall of about{" "}
              {Math.abs(percentChange(first(child).value, last(child).value))}%.
            </>
          }
          chart={<LineChart points={child.points} format="rate" label={`${child.title}, ${child.unit}`} />}
          source={child.source}
          note={child.notes}
          table={{ headers: ["Year", "Per 1,000 births"], rows: rows(child, "rate") }}
        />
        <ChartFigure
          title={poverty.title}
          summary={
            <>
              The share of people living on less than $3 a day fell from {formatValue(first(poverty).value, "percent")} in{" "}
              {first(poverty).year} to {formatValue(last(poverty).value, "percent")} in {last(poverty).year}.
            </>
          }
          chart={<LineChart points={poverty.points} format="percent" label={`${poverty.title}, ${poverty.unit}`} />}
          source={poverty.source}
          note={poverty.notes}
          table={{ headers: ["Year", "Share of people"], rows: rows(poverty, "percent") }}
        />
      </Card>

      {/* 4. Malaria */}
      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">A worked example: malaria</h2>
          <p>
            Malaria spreads to people mostly through the bites of some infected mosquitoes. The World Health Organization
            describes it as preventable and curable, yet it still kills hundreds of thousands of people every year.{" "}
            <Cite href={who.source.url}>WHO fact sheet, 4 December 2025</Cite>
          </p>
        </div>
        <ChartFigure
          title={malaria.title}
          summary={
            <>
              The World Health Organization estimates {wholeNumber(first(malaria).value)} malaria deaths in {first(malaria).year} and{" "}
              {wholeNumber(last(malaria).value)} in {last(malaria).year}. The lowest estimate was {wholeNumber(malariaLow.value)} in{" "}
              {malariaLow.year}.
            </>
          }
          chart={<LineChart points={malaria.points} format="count" label={`${malaria.title}, ${malaria.unit}`} />}
          source={malaria.source}
          note={malaria.notes}
          table={{ headers: ["Year", "Estimated deaths"], rows: rows(malaria, "count") }}
        />

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-heading">Two cheap tools with strong evidence</h3>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              <strong>Bed nets treated with insecticide.</strong> A review of randomized trials found they cut deaths among
              children from all causes by 17% compared with no nets: about 5.6 lives saved each year for every 1,000 children
              protected (likely between {cochrane.low} and {cochrane.high}). The trials ran from 1987 to 2001, before
              mosquitoes became widely resistant to the insecticide; the reviewers judged the benefit still holds.{" "}
              <Cite href={cochrane.source.url}>Cochrane review, 2018</Cite>
            </li>
            <li>
              GiveWell estimates each net costs roughly {dollars(netCost.low ?? 0)} to {dollars(netCost.high ?? 0)} to buy and
              deliver ({netCost.asOf}). <Cite href={netCost.source.url}>GiveWell</Cite>
            </li>
            <li>
              <strong>Preventive malaria medicine</strong> given to young children each month of the rainy season costs about{" "}
              {dollars(smcCost.low ?? 0)} to {dollars(smcCost.high ?? 0)} per monthly course, depending on the country (
              {smcCost.asOf}). <Cite href={smcCost.source.url}>GiveWell</Cite>
            </li>
          </ul>
        </div>

        <ChartFigure
          title="Estimated cost to save one life"
          summary={
            <>
              For the funding it directed in 2022&ndash;2024, GiveWell estimates an average of about {dollars(amfAvg.value ?? 0)}{" "}
              per life saved through the Against Malaria Foundation and {dollars(mcAvg.value ?? 0)} through Malaria Consortium
              (as of October 2026). Its earlier location-by-location estimates ranged from {dollars(amf.low ?? 0)} to{" "}
              {dollars(amf.high ?? 0)} and {dollars(mc.low ?? 0)} to {dollars(mc.high ?? 0)} (as of December 2023).
            </>
          }
          chart={
            <RangeChart
              label="GiveWell's estimated cost to save one life, by charity"
              rows={[
                { label: "Against Malaria Foundation (bed nets)", low: amf.low ?? 0, high: amf.high ?? 0, mark: amfAvg.value },
                { label: "Malaria Consortium (preventive medicine)", low: mc.low ?? 0, high: mc.high ?? 0, mark: mcAvg.value },
              ]}
            />
          }
          source={amfAvg.source}
          note={`Bars: GiveWell's range by location, as of December 2023 (${amf.source.url}; ${mc.source.url}). Open circles: its average for funding directed in 2022–2024, as of October 2026. These are GiveWell's estimates, with real uncertainty, and GiveWell expects costs to rise over time.`}
          table={{
            headers: ["Charity", "Estimated cost per life saved"],
            rows: [
              ["Against Malaria Foundation: average, 2022–2024 funding (Oct 2026)", dollars(amfAvg.value ?? 0)],
              ["Against Malaria Foundation: range by location (Dec 2023)", `${dollars(amf.low ?? 0)} to ${dollars(amf.high ?? 0)}`],
              ["Malaria Consortium: average, 2022–2024 funding (Oct 2026)", dollars(mcAvg.value ?? 0)],
              ["Malaria Consortium: range by location (Dec 2023)", `${dollars(mc.low ?? 0)} to ${dollars(mc.high ?? 0)}`],
            ],
          }}
        />
        <p>
          Why so much more than the cost of one net or one course of medicine? GiveWell walks through one grant: in Nigeria,
          $3,000 pays for about 2,189 monthly courses of preventive medicine, enough to protect 498 young children through the
          rainy season. Most of those children would have survived anyway, so GiveWell estimates the $3,000 prevents about 1.3
          deaths, or about one once it accounts for other funders shifting their money elsewhere.{" "}
          <Cite href={worked.source.url}>GiveWell, {worked.asOf}</Cite>
        </p>
        <p>
          Estimates like these are averages across large programs, and they carry real uncertainty. No single gift can be
          traced to one person, and we will never tell you that yours &ldquo;saved a life&rdquo;. What we can say is that GiveWell
          judges these among the most cost-effective programs it has found.
        </p>
      </Card>

      {/* 5. Why charities differ */}
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">Why it matters where you give</h2>
        <p>
          Charities that all do good can differ enormously in how much good they do per dollar. GiveWell estimates the Against
          Malaria Foundation&apos;s nets are 9 to 23 times as cost-effective as giving people cash directly, which is itself a
          strong benchmark. <Cite href={amf.source.url}>GiveWell, {amf.asOf}</Cite>
        </p>
        <p>
          The spread can be far wider than that. Looking at health programs studied by the Disease Control Priorities project,
          the philosopher Toby Ord found that, among HIV/AIDS programs, &ldquo;{ord.quote}&rdquo;{" "}
          <Cite href={ord.source.url}>Ord, 2013</Cite>
        </p>
        <p>
          Across GiveWell&apos;s four Top Charities, its estimated averages for the funding it directed in 2022&ndash;2024 range
          from {dollars(topAverages.low ?? 0)} to {dollars(topAverages.high ?? 0)} per life saved.{" "}
          <Cite href={topAverages.source.url}>GiveWell, Top Charities page, updated October 2026</Cite>
        </p>
        <p>
          That&apos;s why The Penny Effect has a <strong>Highest Impact</strong> category: GiveWell&apos;s Top Charities, plus
          GiveDirectly as GiveWell&apos;s cash-transfer benchmark. You can give to any verified charity here; this is for when
          you want each penny to go as far as possible.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/discover?category=${HIGHEST_IMPACT_SLUG}`} className={buttonPrimary}>
            See the Highest Impact charities
          </Link>
          <Link href="/discover" className={buttonSecondary}>
            Browse all causes
          </Link>
        </div>
      </Card>

      {/* 6. Small gifts */}
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">Small, regular gifts add up</h2>
        <p>
          One dollar a day is $365 a year. Given steadily, to where it does the most good, and pooled with other people&apos;s
          pennies, it becomes the kind of money these programs run on. Our aim is to make giving so easy that it simply becomes
          part of life.
        </p>
      </Card>

      {/* 7. Sources */}
      <Card id="sources" className="space-y-3">
        <h2 className="text-xl font-semibold">Sources and licences</h2>
        <p className="text-sm text-muted">
          We store a copy of every number on this page with its source, and check them once a year. Last checked: {FACTS_RETRIEVED}
          . Organizations&apos; own estimates change; follow the links for the latest.
        </p>
        <ul className="list-disc space-y-2 ps-5 text-sm">
          {Object.values(SERIES).map((s) => (
            <li key={s.id}>
              <strong>{s.title}:</strong> {s.source.citation}{" "}
              <a href={s.source.url} target="_blank" rel="noopener noreferrer" className={textLink}>
                Source
              </a>
            </li>
          ))}
          <li>
            <strong>Where a typical Western donor stands:</strong> {w.source.citation}{" "}
            <a href={w.source.url} target="_blank" rel="noopener noreferrer" className={textLink}>
              Source
            </a>
          </li>
          {allFacts().map((f) => (
            <li key={f.id}>
              <strong>{f.source.name}</strong> ({f.asOf}). {f.source.license}.{" "}
              <a href={f.source.url} target="_blank" rel="noopener noreferrer" className={textLink}>
                Source
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Charts and data from Our World in Data are used under CC BY 4.0, alongside the original providers&apos; licences shown
          above. GiveWell content is licensed CC BY-NC-SA 3.0 US; we quote its estimates with attribution. WHO data is used
          under WHO&apos;s terms for public-health purposes.
        </p>
      </Card>

      <p className="text-center">
        <Link href="/about" className={textLink}>
          How giving works on {BRAND_NAME}
        </Link>
      </p>
    </div>
  );
}
