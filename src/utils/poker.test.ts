import { describe, expect, it } from "vitest";
import { parseCards, validateNoDuplicates } from "./poker";

describe("parseCards", () => {
  it("parses common formats", () => {
    expect(parseCards("As Kd")).toEqual(["As", "Kd"]);
    expect(parseCards("10h,2c")).toEqual(["Th", "2c"]);
    expect(parseCards("ah ks")).toEqual(["Ah", "Ks"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCards("  ")).toEqual([]);
  });

  it("throws on invalid cards", () => {
    expect(() => parseCards("1x")).toThrow(/Invalid card/);
  });
});

describe("validateNoDuplicates", () => {
  it("throws on duplicates", () => {
    expect(() => validateNoDuplicates(["As", "As"]))
      .toThrow(/Duplicate card detected/);
  });
});
