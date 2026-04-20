/**
 * Renders schedule/event description text with the same rules as the public food truck calendar:
 * blank lines become spacing; lines starting with - * or numbered lists render as bullets.
 */
export function FormattedCalendarEventDescription({
  text,
  testId,
}: {
  text: string;
  testId?: string;
}) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-muted-foreground" data-testid={testId}>
      {lines.map((line, index) => {
        if (line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/)) {
          const bulletContent = line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
          return (
            <div key={index} className="flex items-start gap-2 mb-1">
              <span className="text-primary mt-1">{"\u2022"}</span>
              <span>{bulletContent}</span>
            </div>
          );
        }
        if (line.trim()) {
          return (
            <p key={index} className="mb-1">
              {line}
            </p>
          );
        }
        return <br key={index} />;
      })}
    </div>
  );
}
