import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandForDays,
  buildIncentiveReport,
  emptyFallIncentiveSetup,
  incentiveDates,
  incentiveSignature,
  majorHolidays,
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
});
