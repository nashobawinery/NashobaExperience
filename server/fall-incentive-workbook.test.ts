import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { fallIncentiveWorkbook } from "./fall-incentive";
import type { IncentiveReport } from "@shared/fall-incentive";

const report: IncentiveReport = {
  dates: ["2026-11-07", "2026-11-08"],
  dateCount: 2,
  bands: [{ minDays: 2, maxDays: null, rate: 3, label: "2 or more days" }],
  missedLabel: "No incentive · fewer than 2 days",
  employeeCount: 1,
  qualifiedCount: 1,
  total: 27,
  openShifts: 0,
  groups: [
    {
      key: "2-3",
      label: "2 or more days",
      rate: 3,
      hours: 9,
      total: 27,
      employees: [
        {
          id: "a",
          name: "Avery Cole",
          restaurantName: "Winery",
          jobTitles: ["Server"],
          daysWorked: 2,
          hours: 9,
          rate: 3,
          total: 27,
          openShift: false,
          days: [
            {
              date: "2026-11-07",
              worked: true,
              hours: 5,
              open: false,
              punches: [
                { jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T19:00:00.000Z", hours: 5, open: false },
              ],
            },
            {
              date: "2026-11-08",
              worked: true,
              hours: 4,
              open: false,
              punches: [
                { jobTitle: "Server", inAt: "2026-11-08T14:00:00.000Z", outAt: "2026-11-08T18:00:00.000Z", hours: 4, open: false },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("fall incentive workbook", () => {
  it("writes a summary sheet and one sheet per employee with the incentive formula", () => {
    const book = XLSX.read(fallIncentiveWorkbook(report), { type: "buffer" });
    assert.deepEqual(book.SheetNames, ["Summary", "Avery Cole"]);
    const summary = XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets.Summary, { header: 1 });
    const employeeRow = summary.find((row) => row[0] === "Avery Cole");
    assert.equal(employeeRow?.[4], 9);
    assert.equal(employeeRow?.[7], 27);
    const detail = book.Sheets["Avery Cole"];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(detail, { header: 1 });
    const saturday = rows.find((row) => row[0] === "2026-11-07");
    assert.equal(saturday?.[3], "Server");
    assert.equal(saturday?.[6], 5);
    assert.match(String(saturday?.[4]), /AM|PM/);
    assert.match(String(saturday?.[5]), /AM|PM/);
    const incentive = Object.values(detail).find((cell) => cell && typeof cell === "object" && "f" in cell && String(cell.f).startsWith("ROUND("));
    assert.ok(incentive);
  });
});
