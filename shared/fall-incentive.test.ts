import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandForDays,
  buildIncentiveReport,
  emptyFallIncentiveSetup,
  toastImportCsv,
  incentiveDates,
  incentiveSignature,
  majorHolidays,
  matchCalloutName,
  parseTiers,
  tierBands,
} from "./fall-incentive";

describe("fall incentive dates", () => {
  it("counts only Saturdays and Sundays until a holiday is included", () => {
    const dates = incentiveDates("2026-11-23", "2026-11-29", ["2026-11-26", "2026-11-27"]);
    assert.deepEqual(dates, ["2026-11-28", "2026-11-29"]);
  });

  it("adds Thanksgiving and the Friday after when those holidays stay included", () => {
    const dates = incentiveDates("2026-11-23", "2026-11-29", []);
    assert.deepEqual(dates, ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
  });

  it("removes a weekend holiday when that holiday is cleared", () => {
    const dates = incentiveDates("2026-07-03", "2026-07-05", ["2026-07-04"]);
    assert.deepEqual(dates, ["2026-07-03", "2026-07-05"]);
  });

  it("places the 2026 holidays on their calendar dates", () => {
    const holidays = new Map(majorHolidays("2026-01-01", "2026-12-31").map((holiday) => [holiday.name, holiday.date]));
    assert.equal(holidays.get("Martin Luther King Jr. Day"), "2026-01-19");
    assert.equal(holidays.get("Presidents' Day"), "2026-02-16");
    assert.equal(holidays.get("Easter Sunday"), "2026-04-05");
    assert.equal(holidays.get("Memorial Day"), "2026-05-25");
    assert.equal(holidays.get("Juneteenth"), "2026-06-19");
    assert.equal(holidays.get("Labor Day"), "2026-09-07");
    assert.equal(holidays.get("Columbus Day"), "2026-10-12");
    assert.equal(holidays.get("Veterans Day"), "2026-11-11");
    assert.equal(holidays.get("Thanksgiving"), "2026-11-26");
    assert.equal(holidays.get("Day After Thanksgiving"), "2026-11-27");
    assert.equal(holidays.get("Christmas Day"), "2026-12-25");
  });
  it("lists the observed weekday when Independence Day falls on Saturday", () => {
    const holidays = majorHolidays("2026-07-03", "2026-07-05");
    assert.deepEqual(holidays.map((holiday) => `${holiday.date} ${holiday.name}`), [
      "2026-07-03 Independence Day (observed)",
      "2026-07-04 Independence Day",
    ]);
  });
});

describe("fall incentive tiers", () => {
  const tiers = parseTiers([
    { minDays: "28", rate: "3" },
    { minDays: "26", rate: "2" },
    { minDays: "20", rate: "1" },
  ]);
  const bands = tierBands(tiers);

  it("pays the highest line the employee reaches", () => {
    assert.equal(bandForDays(30, bands)?.rate, 3);
    assert.equal(bandForDays(28, bands)?.rate, 3);
    assert.equal(bandForDays(27, bands)?.rate, 2);
    assert.equal(bandForDays(26, bands)?.rate, 2);
    assert.equal(bandForDays(25, bands)?.rate, 1);
    assert.equal(bandForDays(20, bands)?.rate, 1);
    assert.equal(bandForDays(19, bands), null);
  });

  it("describes the gaps between lines", () => {
    assert.deepEqual(bands.map((band) => band.label), [
      "28 or more days",
      "26 to 27 days",
      "20 to 25 days",
    ]);
  });

  it("keeps the higher amount when two lines use the same number of days", () => {
    const bands = tierBands(parseTiers([
      { minDays: "20", rate: "1" },
      { minDays: "20", rate: "2.5" },
    ]));
    assert.equal(bands.length, 1);
    assert.equal(bands[0].rate, 2.5);
  });
});

describe("fall incentive signature", () => {
  it("changes when a date, tier, job, or employee changes", () => {
    const setup = emptyFallIncentiveSetup();
    setup.startDate = "2026-09-01";
    setup.endDate = "2026-11-30";
    const original = incentiveSignature(setup);
    assert.equal(incentiveSignature({ ...setup, excludedHolidays: [] }), original);
    assert.notEqual(incentiveSignature({ ...setup, endDate: "2026-12-01" }), original);
    assert.notEqual(incentiveSignature({ ...setup, tiers: [{ minDays: "20", rate: "1" }] }), original);
    assert.notEqual(incentiveSignature({ ...setup, includedJobTitles: ["Server"] }), original);
    assert.notEqual(incentiveSignature({ ...setup, excludedEmployeeIds: ["a"] }), original);
    assert.equal(incentiveSignature({ ...setup, description: "Mailed to the staff." }), original);
    assert.notEqual(incentiveSignature({ ...setup, callouts: [{ date: "2026-09-13", name: "Amy C", employeeId: "" }] }), original);
  });
});

describe("fall incentive report", () => {
  const employees = [
    { id: "a", name: "Avery Cole", restaurantName: "Winery", jobTitles: ["Server"] },
    { id: "b", name: "Blair Diaz", restaurantName: "Winery", jobTitles: ["Server", "Host"] },
    { id: "c", name: "Casey Ng", restaurantName: "Winery", jobTitles: ["Cook"] },
  ];

  it("counts selected-job hours on incentive dates and applies one tier", () => {
    const report = buildIncentiveReport({
      startDate: "2026-11-07",
      endDate: "2026-11-09",
      excludedHolidays: [],
      tiers: [{ minDays: "2", rate: "3" }, { minDays: "1", rate: "1" }],
      includedJobTitles: ["Server"],
      excludedEmployeeIds: [],
      employees,
      punches: [
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T19:00:00.000Z", hours: 5, open: false },
        { employeeId: "a", businessDate: "2026-11-08", jobTitle: "Server", inAt: "2026-11-08T14:00:00.000Z", outAt: "2026-11-08T18:00:00.000Z", hours: 4, open: false },
        { employeeId: "a", businessDate: "2026-11-09", jobTitle: "Server", inAt: "2026-11-09T14:00:00.000Z", outAt: "2026-11-09T18:00:00.000Z", hours: 4, open: false },
        { employeeId: "b", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T16:00:00.000Z", outAt: "2026-11-07T20:00:00.000Z", hours: 4, open: false },
        { employeeId: "b", businessDate: "2026-11-07", jobTitle: "Host", inAt: "2026-11-07T20:00:00.000Z", outAt: "2026-11-07T23:00:00.000Z", hours: 3, open: false },
        { employeeId: "c", businessDate: "2026-11-07", jobTitle: "Cook", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T22:00:00.000Z", hours: 8, open: false },
      ],
    });

    assert.deepEqual(report.dates, ["2026-11-07", "2026-11-08"]);
    assert.equal(report.employeeCount, 2);
    const avery = report.groups[0].employees.find((person) => person.id === "a");
    const blair = report.groups[1].employees.find((person) => person.id === "b");
    assert.equal(avery?.daysWorked, 2);
    assert.equal(avery?.hours, 9);
    assert.equal(avery?.rate, 3);
    assert.equal(avery?.total, 27);
    assert.equal(blair?.daysWorked, 1);
    assert.equal(blair?.hours, 4);
    assert.equal(blair?.rate, 1);
    assert.equal(blair?.total, 4);
    assert.equal(report.total, 31);
  });

  it("limits days worked to the incentive dates", () => {
    const report = buildIncentiveReport({
      startDate: "2026-11-07",
      endDate: "2026-11-08",
      excludedHolidays: [],
      tiers: [{ minDays: "3", rate: "3" }],
      includedJobTitles: ["Server", "Bartender", "Cook"],
      excludedEmployeeIds: [],
      employees: [
        { id: "a", name: "Avery Cole", restaurantName: "Winery", jobTitles: ["Server", "Bartender", "Cook"] },
      ],
      punches: [
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T18:00:00.000Z", hours: 4, open: false },
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T18:00:00.000Z", outAt: "2026-11-07T19:00:00.000Z", hours: 1, open: false },
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Bartender", inAt: "2026-11-07T19:00:00.000Z", outAt: "2026-11-07T23:00:00.000Z", hours: 4, open: false },
        { employeeId: "a", businessDate: "2026-11-08", jobTitle: "Cook", inAt: "2026-11-08T14:00:00.000Z", outAt: "2026-11-08T22:00:00.000Z", hours: 8, open: false },
      ],
    });

    const avery = report.groups.flatMap((group) => group.employees).find((person) => person.id === "a");
    assert.equal(report.dateCount, 2);
    assert.equal(avery.daysWorked, 2);
    assert.equal(avery.hours, 17);
    assert.equal(avery.rate, 0);
    assert.equal(avery.total, 0);
  });

  it("writes a Retro Pay amount for people who qualify", () => {
    const report = buildIncentiveReport({
      startDate: "2026-11-07",
      endDate: "2026-11-08",
      excludedHolidays: [],
      tiers: [{ minDays: "2", rate: "3" }],
      includedJobTitles: ["Server", "Cook"],
      excludedEmployeeIds: [],
      employees: [
        { id: "a", name: "Cole, Avery", restaurantName: "Winery", jobTitles: ["Server", "Cook"], payrollNumber: "7756" },
        { id: "b", name: "Blair Host", restaurantName: "Winery", jobTitles: ["Server"], payrollNumber: "" },
      ],
      punches: [
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T18:00:00.000Z", hours: 4, open: false },
        { employeeId: "a", businessDate: "2026-11-08", jobTitle: "Cook", inAt: "2026-11-08T14:00:00.000Z", outAt: "2026-11-08T22:00:00.000Z", hours: 8, open: false },
        { employeeId: "b", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T18:00:00.000Z", hours: 4, open: false },
      ],
    });

    assert.equal(
      toastImportCsv(report),
      'EE Number,EE Name,Job,Retro Pay,Week\r\n7756,"Cole, Avery",Cook,36.00,1\r\n',
    );
  });

  it("counts an open shift as a day worked and leaves an unchecked employee out", () => {
    const report = buildIncentiveReport({
      startDate: "2026-11-07",
      endDate: "2026-11-08",
      excludedHolidays: [],
      tiers: [{ minDays: "1", rate: "2" }],
      includedJobTitles: ["Server"],
      excludedEmployeeIds: ["b"],
      employees,
      punches: [
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: null, hours: 0, open: true },
        { employeeId: "b", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T20:00:00.000Z", hours: 6, open: false },
      ],
    });
    assert.equal(report.employeeCount, 1);
    assert.equal(report.groups[0].employees[0].daysWorked, 1);
    assert.equal(report.groups[0].employees[0].hours, 0);
    assert.equal(report.groups[0].employees[0].total, 0);
    assert.equal(report.openShifts, 1);
  });

  it("counts a weather call-off as a day with zero hours and flags hours on that day", () => {
    const report = buildIncentiveReport({
      startDate: "2026-11-07",
      endDate: "2026-11-08",
      excludedHolidays: [],
      tiers: [{ minDays: "2", rate: "3" }],
      includedJobTitles: ["Server"],
      excludedEmployeeIds: [],
      callouts: [
        { date: "2026-11-07", name: "Avery", employeeId: "" },
        { date: "2026-11-08", name: "Blair", employeeId: "" },
      ],
      employees,
      punches: [
        { employeeId: "a", businessDate: "2026-11-07", jobTitle: "Server", inAt: "2026-11-07T14:00:00.000Z", outAt: "2026-11-07T19:00:00.000Z", hours: 5, open: false },
        { employeeId: "a", businessDate: "2026-11-08", jobTitle: "Server", inAt: "2026-11-08T14:00:00.000Z", outAt: "2026-11-08T18:00:00.000Z", hours: 4, open: false },
        { employeeId: "b", businessDate: "2026-11-08", jobTitle: "Server", inAt: null, outAt: null, hours: 0, open: false },
      ],
    });

    const people = report.groups.flatMap((group) => group.employees);
    const avery = people.find((person) => person.id === "a");
    const blair = people.find((person) => person.id === "b");
    assert.equal(avery?.daysWorked, 2);
    assert.equal(avery?.hours, 9);
    assert.equal(avery?.days.filter((day) => day.date === "2026-11-07").length, 1);
    assert.equal(avery?.days.find((day) => day.date === "2026-11-07")?.calloutConflict, true);
    assert.equal(blair?.daysWorked, 1);
    assert.equal(blair?.hours, 0);
    assert.equal(blair?.days.find((day) => day.date === "2026-11-08")?.callout, true);
    assert.equal(blair?.days.find((day) => day.date === "2026-11-08")?.calloutConflict, false);
    assert.ok(report.calloutNotes?.some((note) => note.name === "Avery Cole" && note.message.includes("Toast has hours")));
  });
});

describe("fall incentive callout names", () => {
  const employees = [
    { id: "amy-c", name: "Amy Courtemanche" },
    { id: "amy-g", name: "Amy Germain" },
    { id: "erin-f", name: "Erin Flynn" },
    { id: "erin-d", name: "Erin DeCoste" },
    { id: "jess", name: "Jess Shay" },
    { id: "jessica", name: "Jessica Shay" },
    { id: "yauri", name: "Jessica Yauri Cambi" },
    { id: "jackie", name: "Jaclyn Quigley" },
    { id: "ryan-1", name: "Ryan Schneider" },
    { id: "ryan-2", name: "Ryan Schneider" },
  ];

  it("matches initials, nicknames, and duplicate Toast records", () => {
    assert.deepEqual(matchCalloutName("Amy C", employees).employeeIds, ["amy-c"]);
    assert.deepEqual(matchCalloutName("Erin F", employees).employeeIds, ["erin-f"]);
    assert.deepEqual(matchCalloutName("Erin Flynn", employees).employeeIds, ["erin-f"]);
    assert.deepEqual(matchCalloutName("Jess Shay", employees).employeeIds, ["jess"]);
    assert.deepEqual(matchCalloutName("Jess Yauri", employees).employeeIds, ["yauri"]);
    assert.deepEqual(matchCalloutName("Jess Yaui", employees).employeeIds, ["yauri"]);
    assert.deepEqual(matchCalloutName("Jackie", employees).employeeIds, ["jackie"]);
    assert.deepEqual(matchCalloutName("Nacy", employees.concat({ id: "nancy", name: "Nancy Nadeau" })).employeeIds, ["nancy"]);
    const ryan = matchCalloutName("Ryan", employees);
    assert.equal(ryan.status, "duplicate");
    assert.deepEqual(ryan.employeeIds, ["ryan-1", "ryan-2"]);
  });
});
