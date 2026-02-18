import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff } from "lucide-react";
import { format, parseISO } from "date-fns";

type BlockedData = Record<string, { locationName: string; dates: string[] }>;

export default function EventCalendar() {
  const { data, isLoading } = useQuery<BlockedData>({
    queryKey: ["/api/resy/public/private-events/blocked-dates"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  const locations = data ? Object.values(data) : [];
  const maxDates = Math.max(...locations.map(l => l.dates.length), 0);

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "MMMM d, yyyy"); } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-[#2a2a2a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-4" data-testid="text-calendar-title">Blocked Event Dates</h1>
        {locations.length === 0 ? (
          <Card className="bg-[#333] border-[#555]">
            <CardContent className="py-12 text-center">
              <CalendarOff className="h-12 w-12 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">No blocked dates at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" data-testid="table-blocked-dates">
              <thead>
                <tr>
                  {locations.map(loc => (
                    <th key={loc.locationName} className="bg-[#333] text-white p-3 text-left border border-[#555] font-semibold text-sm">
                      {loc.locationName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maxDates === 0 ? (
                  <tr>
                    <td colSpan={locations.length} className="p-5 text-center text-gray-500 border border-[#555]">
                      No blocked dates
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: maxDates }).map((_, i) => (
                    <tr key={i}>
                      {locations.map(loc => (
                        <td key={loc.locationName} className="p-3 border border-[#555] text-gray-300 text-sm align-top">
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
