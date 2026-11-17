// The body of each Why give card: one idea, one or two short paragraphs, and
// a chart where it helps. Shorter than the one-page version (/why-give/all),
// which keeps the full text. Same rules: every number comes from
// src/data/impact via src/lib/impact.ts, ranges stay ranges, and we never say
// a particular gift "saved a life". Order and titles: src/lib/why-give-cards.ts.
import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { ChartFigure, SourceLine } from "@/components/charts/ChartFigure";
import { LineChart } from "@/components/charts/LineChart";
import { RangeChart } from "@/components/charts/RangeChart";
import { HIGHEST_IMPACT_SLUG } from "@/lib/highest-impact";
import { dollars, fact, first, formatValue, last, percentChange, SERIES, WHERE_YOU_STAND, wholeNumber } from "@/lib/impact";
import { ONE_PAGE_PATH, type CardSlug } from "@/lib/why-give-cards";
import { Cite, rows } from "./parts";

function DrowningChild() {
  const singer = fact("singer-1972");
  const britannica = fact("britannica-ea");
  return (
    <>
      <p>
        In 1972 the philosopher Peter Singer asked: if you saw a small child drowning in a shallow pond, would you wade in,
        even though it would ruin your clothes? Almost everyone says yes.
      </p>
      <p>
        His point: if we can prevent something very bad without giving up anything as important, we should, whether the
        person is in front of us or on the other side of the world. Britannica credits Singer with laying &ldquo;much of the
        philosophical groundwork&rdquo; of <em>effective altruism</em>.
      </p>
      <p className="flex flex-wrap gap-x-3">
        <Cite href={singer.source.url}>{singer.source.name}. Paraphrased.</Cite>
        <Cite href={britannica.source.url}>Britannica</Cite>
      </p>
    </>
  );
}

function WhereYouStand() {
  const w = WHERE_YOU_STAND;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card level="inset" as="div">
          <div className="text-sm font-medium text-muted">World population with less income than the US median</div>
          <div className="mt-1 text-3xl font-bold text-heading">About {Math.round(w.worldShareBelowUsMedian)}%</div>
        </Card>
        <Card level="inset" as="div">
          <div className="text-sm font-medium text-muted">People living on less than $3 a day</div>
          <div className="mt-1 text-3xl font-bold text-heading">{w.worldShareBelow3PerDay}%</div>
        </Card>
      </div>
      <p>
        In {w.year}, someone in the middle of the US income distribution had about {dollars(w.usMedianPerDay)} a day to live
        on, after taxes and adjusted for prices. That&apos;s more than about {Math.round(w.worldShareBelowUsMedian)}% of the
        world&apos;s people had.
      </p>
      <SourceLine
        source={w.source}
        note="Per person, in 2021 international dollars. Many poorer countries measure consumption rather than income, so the comparison is approximate."
      />
    </>
  );
}

function FewerChildrenDie() {
  const child = SERIES.childMortality;
  return (
    <>
      <p>The world has made real progress. The numbers that remain are still very large.</p>
      <ChartFigure
        title={child.title}
        summary={
          <>
            Down from {formatValue(first(child).value, "rate")} per 1,000 births in {first(child).year} to{" "}
            {formatValue(last(child).value, "rate")} in {last(child).year}: about{" "}
            {Math.abs(percentChange(first(child).value, last(child).value))}% fewer.
          </>
        }
        chart={<LineChart points={child.points} format="rate" label={`${child.title}, ${child.unit}`} />}
        source={child.source}
        note={child.notes}
        table={{ headers: ["Year", "Per 1,000 births"], rows: rows(child, "rate") }}
      />
    </>
  );
}

function ExtremePoverty() {
  const poverty = SERIES.extremePoverty;
  return (
    <>
      <p>The share of people living on less than $3 a day has fallen a long way. It&apos;s still around one person in ten.</p>
      <ChartFigure
        title={poverty.title}
        summary={
          <>
            From {formatValue(first(poverty).value, "percent")} in {first(poverty).year} to{" "}
            {formatValue(last(poverty).value, "percent")} in {last(poverty).year}.
          </>
        }
        chart={<LineChart points={poverty.points} format="percent" label={`${poverty.title}, ${poverty.unit}`} />}
        source={poverty.source}
        note={poverty.notes}
        table={{ headers: ["Year", "Share of people"], rows: rows(poverty, "percent") }}
      />
    </>
  );
}

function Malaria() {
  const malaria = SERIES.malariaDeaths;
  const who = fact("who-malaria-factsheet");
  return (
    <>
      <p>
        Malaria spreads mostly through the bites of infected mosquitoes. The World Health Organization calls it preventable
        and curable, yet it still kills hundreds of thousands of people a year.{" "}
        <Cite href={who.source.url}>WHO, 4 December 2025</Cite>
      </p>
      <ChartFigure
        title={malaria.title}
        summary={
          <>
            WHO estimates {wholeNumber(first(malaria).value)} deaths in {first(malaria).year} and{" "}
            {wholeNumber(last(malaria).value)} in {last(malaria).year}.
          </>
        }
        chart={<LineChart points={malaria.points} format="count" label={`${malaria.title}, ${malaria.unit}`} />}
        source={malaria.source}
        note={malaria.notes}
        table={{ headers: ["Year", "Estimated deaths"], rows: rows(malaria, "count") }}
      />
    </>
  );
}

function TwoCheapTools() {
  const cochrane = fact("cochrane-itn");
  const netCost = fact("givewell-amf-net-cost");
  const smcCost = fact("givewell-mc-cycle-cost");
  return (
    <>
      <p>
        <strong>Bed nets treated with insecticide</strong> cut deaths among children from all causes by 17% compared
        with no nets, in a review of randomized trials: about 5.6 lives saved a year for every 1,000 children protected. Each net costs roughly{" "}
        {dollars(netCost.low ?? 0)} to {dollars(netCost.high ?? 0)} to buy and deliver.{" "}
        <Cite href={cochrane.source.url}>Cochrane, 2018</Cite> <Cite href={netCost.source.url}>GiveWell, {netCost.asOf}</Cite>
      </p>
      <p>
        <strong>Preventive malaria medicine</strong>, given to young children each month of the rainy season, costs about{" "}
        {dollars(smcCost.low ?? 0)} to {dollars(smcCost.high ?? 0)} a course, depending on the country.{" "}
        <Cite href={smcCost.source.url}>GiveWell, {smcCost.asOf}</Cite>
      </p>
    </>
  );
}

function CostToSaveALife() {
  const amf = fact("givewell-amf");
  const mc = fact("givewell-mc");
  const amfAvg = fact("givewell-amf-average");
  const mcAvg = fact("givewell-mc-average");
  return (
    <>
      <p>
        GiveWell, a charity evaluator, estimates what these programs cost, on average, for each life they save. These are
        estimates with real uncertainty, and GiveWell expects costs to rise.
      </p>
      <ChartFigure
        title="Estimated cost to save one life"
        summary={
          <>
            About {dollars(amfAvg.value ?? 0)} through the Against Malaria Foundation and {dollars(mcAvg.value ?? 0)} through
            Malaria Consortium, on average, for funding GiveWell directed in 2022&ndash;2024.
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
        note="Bars: GiveWell's range by location, as of December 2023. Open circles: its average for funding directed in 2022–2024, as of October 2026."
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
    </>
  );
}

function WhyItCostsMore() {
  const worked = fact("givewell-worked-example");
  return (
    <>
      <p>
        Why so much more than one net or one course of medicine? Because most children protected would have survived
        anyway. In one Nigerian grant GiveWell walks through, $3,000 protects 498
        young children through the rainy season and prevents an estimated 1.3 deaths, or about one once other funders shift
        their money elsewhere. <Cite href={worked.source.url}>GiveWell, {worked.asOf}</Cite>
      </p>
      <p>
        No single gift can be traced to one person, so we will never tell you that yours &ldquo;saved a life&rdquo;. What we can
        say is that GiveWell judges these among the most cost-effective programs it has found.
      </p>
    </>
  );
}

function WhereYouGiveMatters() {
  const amf = fact("givewell-amf");
  const ord = fact("ord-dcp2");
  return (
    <>
      <p>
        Charities that all do good can differ enormously in how much good they do per dollar. GiveWell estimates the Against
        Malaria Foundation&apos;s nets are 9 to 23 times as cost-effective as giving people cash directly, itself a strong
        benchmark. <Cite href={amf.source.url}>GiveWell, {amf.asOf}</Cite>
      </p>
      <p>
        The spread can be far wider. Among HIV/AIDS programs, the philosopher Toby Ord found that &ldquo;{ord.quote}&rdquo;{" "}
        <Cite href={ord.source.url}>Ord, 2013</Cite>
      </p>
    </>
  );
}

function HighestImpact() {
  const topAverages = fact("givewell-top-charities-averages");
  return (
    <>
      <p>
        So The Penny Effect has a <strong>Highest Impact</strong> category: GiveWell&apos;s Top Charities, whose estimated
        averages run from {dollars(topAverages.low ?? 0)} to {dollars(topAverages.high ?? 0)} per life saved, plus
        GiveDirectly as GiveWell&apos;s cash-transfer benchmark. <Cite href={topAverages.source.url}>GiveWell, October 2026</Cite>
      </p>
      <p>You can give to any verified charity here. This is for when you want each penny to go as far as possible.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/discover?category=${HIGHEST_IMPACT_SLUG}`} className={buttonPrimary}>
          See the Highest Impact charities
        </Link>
      </div>
    </>
  );
}

function SmallGiftsAddUp() {
  return (
    <>
      <p>
        One dollar a day is $365 a year. Given steadily, to where it does the most good, and pooled with other people&apos;s
        pennies, it becomes the kind of money these programs run on.
      </p>
      <p>Our aim is to make giving so easy that it simply becomes part of life.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/discover?category=${HIGHEST_IMPACT_SLUG}`} className={buttonPrimary}>
          See the Highest Impact charities
        </Link>
        <Link href="/discover" className={buttonSecondary}>
          Browse all causes
        </Link>
      </div>
      <p className="text-sm text-muted">
        Every number in these cards, with its source and licence:{" "}
        <Link href={`${ONE_PAGE_PATH}#sources`} className={textLink}>
          Sources
        </Link>
      </p>
    </>
  );
}

export const CARD_BODIES: Record<CardSlug, () => ReactNode> = {
  "drowning-child": DrowningChild,
  "where-you-stand": WhereYouStand,
  "fewer-children-die": FewerChildrenDie,
  "extreme-poverty": ExtremePoverty,
  malaria: Malaria,
  "two-cheap-tools": TwoCheapTools,
  "cost-to-save-a-life": CostToSaveALife,
  "why-it-costs-more": WhyItCostsMore,
  "where-you-give-matters": WhereYouGiveMatters,
  "highest-impact": HighestImpact,
  "small-gifts-add-up": SmallGiftsAddUp,
};
