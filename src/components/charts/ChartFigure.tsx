// A chart with its title, a one-sentence summary (the text alternative), the
// source and licence, and a table of every value (no value is hover-only).
import type { ReactNode } from "react";
import type { Source } from "@/lib/impact";

export function SourceLine({ source, note }: { source: Source; note?: string }) {
  return (
    <p className="text-sm text-muted">
      Source:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
        {source.name}
      </a>
      {source.version && <> ({source.version})</>}
      {source.retrieved && <>, retrieved {source.retrieved}</>}. Licence:{" "}
      <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
        {source.license}
      </a>
      .{note && <> {note}</>}
    </p>
  );
}

export function ChartFigure({
  title,
  summary,
  chart,
  source,
  note,
  table,
}: {
  title: string;
  /** One sentence saying what the chart shows: read first, and the text alternative. */
  summary: ReactNode;
  chart: ReactNode;
  source: Source;
  note?: string;
  table: { headers: [string, string]; rows: [string, string][] };
}) {
  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1">
        <h3 className="text-base font-semibold text-heading">{title}</h3>
        <p className="text-fg">{summary}</p>
      </figcaption>
      {chart}
      <SourceLine source={source} note={note} />
      <details className="rounded-control border bg-inset px-4 py-2">
        <summary className="cursor-pointer text-sm font-medium text-fg">Show the numbers as a table</summary>
        <div className="mt-2 max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="py-1 pr-4 font-medium">{table.headers[0]}</th>
                <th scope="col" className="py-1 text-right font-medium">{table.headers[1]}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {table.rows.map(([a, b]) => (
                <tr key={a} className="border-t">
                  <td className="py-1 pr-4">{a}</td>
                  <td className="py-1 text-right">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
