import { getBaseModel, normalizeModelForCompare, isSameModel } from "../lib/model-utils";

describe("getBaseModel", () => {
  it("strips York full config to base", () => {
    expect(getBaseModel("ZE060H12A2A1ABA1A2")).toBe("ZE060");
  });
  it("strips Carrier config to base", () => {
    expect(getBaseModel("24ACC636A003")).toBe("24ACC636");
  });
  it("strips Trane config to base", () => {
    expect(getBaseModel("4TTR3036E1000AA")).toBe("4TTR3036");
  });
  it("returns short model unchanged", () => {
    expect(getBaseModel("ZE060")).toBe("ZE060");
  });
  it("handles empty string", () => {
    expect(getBaseModel("")).toBe("");
  });
});

describe("isSameModel", () => {
  it("recognizes base vs full config as same unit", () => {
    expect(isSameModel("ZE060", "ZE060H12A2A1ABA1A2")).toBe(true);
  });
  it("recognizes identical models", () => {
    expect(isSameModel("ZE060", "ZE060")).toBe(true);
  });
  it("does NOT merge different variants", () => {
    expect(isSameModel("ZE060A", "ZE060B")).toBe(false);
  });
  it("is case insensitive", () => {
    expect(isSameModel("ze060", "ZE060")).toBe(true);
  });
  it("returns false for different models", () => {
    expect(isSameModel("ZE060", "4TTR3036")).toBe(false);
  });
});

describe("normalizeModelForCompare", () => {
  it("strips special chars and lowercases", () => {
    expect(normalizeModelForCompare("ZE-060 H12")).toBe("ze060");
  });
});
