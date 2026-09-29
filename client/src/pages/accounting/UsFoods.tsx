import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const openBills = [
  ["1077120", "Invoice", "Sep 1, 2026", "Oct 1, 2026", "$5,417.41"],
  ["1167742", "Invoice", "Sep 3, 2026", "Oct 3, 2026", "$3,811.52"],
  ["1207153", "Will call", "Sep 3, 2026", "Oct 3, 2026", "$244.24"],
  ["1212815", "Vendor ship", "Sep 3, 2026", "Oct 3, 2026", "$46.60"],
  ["1342409", "Invoice", "Sep 8, 2026", "Oct 8, 2026", "$6,784.25"],
  ["1342414", "Invoice", "Sep 8, 2026", "Oct 8, 2026", "$54.71"],
  ["1426523", "Invoice", "Sep 10, 2026", "Oct 10, 2026", "$6,107.45"],
  ["1426526", "Invoice", "Sep 10, 2026", "Oct 10, 2026", "$54.71"],
  ["1597371", "Invoice", "Sep 15, 2026", "Oct 15, 2026", "$6,765.24"],
  ["1702629", "Invoice", "Sep 17, 2026", "Oct 17, 2026", "$3,034.16"],
  ["1803607", "Vendor ship", "Sep 18, 2026", "Oct 18, 2026", "$61.05"],
  ["1883831", "Invoice", "Sep 22, 2026", "Oct 22, 2026", "$4,514.17"],
  ["1979325", "Invoice", "Sep 24, 2026", "Oct 24, 2026", "$2,712.85"],
  ["2159094", "Invoice", "Sep 29, 2026", "Oct 29, 2026", "$3,493.54"],
];

const septemberDrafts = [
  ["Sep 28, 2026", "EFT0928", "$2,286.31", "901840"],
  ["Sep 24, 2026", "EFT0924", "$4,321.70", "813579"],
  ["Sep 21, 2026", "EFT0921", "$4,895.24", "640657"],
  ["Sep 17, 2026", "EFT0917", "$4,303.52", "543362"],
  ["Sep 14, 2026", "EFT0914", "$3,318.92", "385378"],
  ["Sep 10, 2026", "EFT0910", "$3,663.92", "276624 $3,364.69, credit 2959976 −$196.20, 276622 $495.43"],
  ["Sep 7, 2026", "EFT0907", "$2,139.23", "105180"],
  ["Sep 3, 2026", "EFT0903", "$5,620.39", "2547 $5,635.39, credit 2962592 −$15.00"],
];

export default function UsFoods() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">US Foods</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Customer 31592330. US Foods emails the invoices and drafts the bank net 30. The September 29, 2026 invoice and payment exports agree to the cent. QuickBooks accounts payable for this vendor should equal the open bills below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open on the US Foods account</CardDescription>
            <CardTitle className="text-2xl">$43,101.90</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">14 September documents, due in October.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Already drafted</CardDescription>
            <CardTitle className="text-2xl">$851,247.86</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Paid invoices $855,113.18 minus credits $3,865.32.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>September bank drafts</CardDescription>
            <CardTitle className="text-2xl">$30,549.23</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Eight withdrawals. Match the date and the reference. The reference repeats every year.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>September drafts</CardTitle>
          <CardDescription>Apply each bank amount to the document numbers. A credit on the same draft lowers the withdrawal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Draft date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Bank amount</TableHead>
                <TableHead>Apply to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {septemberDrafts.map((row) => (
                <TableRow key={row[1]}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell className="text-right">{row[2]}</TableCell>
                  <TableCell>{row[3]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bills that should stay open</CardTitle>
          <CardDescription>These are inside net 30. US Foods will draft them in October.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openBills.map((row) => (
                <TableRow key={row[0]}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell>{row[2]}</TableCell>
                  <TableCell>{row[3]}</TableCell>
                  <TableCell className="text-right">{row[4]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
