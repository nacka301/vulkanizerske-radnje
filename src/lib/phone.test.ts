import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("normalizes valid HR mobile numbers to E.164", () => {
    expect(normalizePhone("0912345678")).toBe("+385912345678");
    expect(normalizePhone("091 234 5678")).toBe("+385912345678");
    expect(normalizePhone("+385912345678")).toBe("+385912345678");
    expect(normalizePhone("385912345678")).toBe("+385912345678");
  });

  it("rejects invalid or non-mobile numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("rejects HR landline numbers", () => {
    // 01 = Zagreb fixed-line prefix
    expect(normalizePhone("014561234")).toBeNull();
  });
});
