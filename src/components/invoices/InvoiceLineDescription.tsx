const MARKER = ' — Work done: ';

export function splitWorkDone(text: string | null | undefined): { main: string; note: string | null } {
  const value = text ?? '';
  const i = value.lastIndexOf(MARKER);
  if (i < 0) return { main: value, note: null };
  return { main: value.slice(0, i), note: value.slice(i + MARKER.length) };
}

export function InvoiceLineDescription({ text }: { text: string | null | undefined }) {
  const { main, note } = splitWorkDone(text);
  if (note === null) return <>{main}</>;
  return (
    <>
      <span className="font-semibold">{main}</span>{' '}
      <mark className="rounded bg-primary/15 px-1 text-foreground">Work done: {note}</mark>
    </>
  );
}
