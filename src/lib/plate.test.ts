import { describe, expect, it } from "vitest";
import { formatPlateDisplay, isValidPlate, normalizePlate } from "./plate";

describe("normalizePlate", () => {
  it("uppercases and strips non-alphanumeric characters", () => {
    expect(normalizePlate("zg 1234-ab")).toBe("ZG1234AB");
    expect(normalizePlate("zg-123-a")).toBe("ZG123A");
    expect(normalizePlate(" ri 999 z ")).toBe("RI999Z");
  });
});

describe("isValidPlate", () => {
  it("accepts 4-10 uppercase alphanumeric characters", () => {
    expect(isValidPlate("ZG1234AB")).toBe(true);
    expect(isValidPlate("AB12")).toBe(true);
    expect(isValidPlate("ABCDEFGHIJ")).toBe(true);
  });

  it("rejects too short, too long, or lowercase input", () => {
    expect(isValidPlate("AB1")).toBe(false);
    expect(isValidPlate("ABCDEFGHIJK")).toBe(false);
    expect(isValidPlate("zg1234ab")).toBe(false);
    expect(isValidPlate("ZG-1234-AB")).toBe(false);
  });
});

describe("formatPlateDisplay", () => {
  it("formats plates matching the standard HR pattern", () => {
    expect(formatPlateDisplay("ZG1234AB")).toBe("ZG 1234-AB");
    expect(formatPlateDisplay("RI999Z")).toBe("RI 999-Z");
    expect(formatPlateDisplay("ST123A")).toBe("ST 123-A");
  });

  it("returns the plate unchanged when it does not match the pattern", () => {
    expect(formatPlateDisplay("ST12A")).toBe("ST12A");
    expect(formatPlateDisplay("ABCDEFGHIJ")).toBe("ABCDEFGHIJ");
    expect(formatPlateDisplay("1234")).toBe("1234");
  });
});
