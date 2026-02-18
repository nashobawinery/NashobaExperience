import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

type BlockedData = Record<string, { locationName: string; dates: string[] }>;

export default function EventCalendar() {
  const { data, isLoading } = useQuery<BlockedData>({
    queryKey: ["/api/resy/public/private-events/blocked-dates"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f0eb' }}>
        <Skeleton className="h-64 w-full max-w-5xl" />
      </div>
    );
  }

  const locations = data ? Object.values(data) : [];
  const maxDates = Math.max(...locations.map(l => l.dates.length), 0);

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "MMMM d, yyyy"); } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: '#f5f0eb', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-center text-2xl md:text-3xl mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#4a4540', fontWeight: 400, letterSpacing: '0.5px' }}
          data-testid="text-calendar-title"
        >
          Dates and Locations Already Reserved by Location
        </h1>

        <div className="max-w-3xl mx-auto mb-5" style={{ color: '#6b6560', fontSize: '13px', lineHeight: '1.6' }}>
          <p className="italic mb-1" style={{ fontSize: '13px' }}>Note:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>When the Restaurant Evening is booked, Private Dining is also booked.</li>
            <li>When the Patio is booked, the Distillery is also booked as this is reserved in case of inclement weather.</li>
          </ul>
        </div>

        {locations.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#999' }}>
            <p>No blocked dates at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', border: '1px solid #d5cfc8' }} data-testid="table-blocked-dates">
              <thead>
                <tr>
                  {locations.map(loc => (
                    <th
                      key={loc.locationName}
                      style={{
                        background: '#ede8e2',
                        color: '#4a4540',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: '1px solid #d5cfc8',
                        fontWeight: 600,
                        fontSize: '14px',
                        fontFamily: "'Georgia', serif",
                      }}
                    >
                      {loc.locationName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maxDates === 0 ? (
                  <tr>
                    <td colSpan={locations.length} style={{ padding: '20px', textAlign: 'center', color: '#999', border: '1px solid #d5cfc8' }}>
                      No blocked dates
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: maxDates }).map((_, i) => (
                    <tr key={i}>
                      {locations.map(loc => (
                        <td
                          key={loc.locationName}
                          style={{
                            padding: '10px 16px',
                            border: '1px solid #d5cfc8',
                            color: '#6b6560',
                            fontSize: '14px',
                            verticalAlign: 'top',
                          }}
                        >
                          {loc.dates[i] ? formatDate(loc.dates[i]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
