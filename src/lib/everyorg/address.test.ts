import { describe, expect, it } from "vitest";
import { orgLocationFields, parseEveryOrgAddress, stateCode, stateName } from "@/lib/everyorg/address";

describe("parseEveryOrgAddress", () => {
  it("reads the common Every.org shape: city, state name, ZIP + country", () => {
    expect(parseEveryOrgAddress("New York, New York, 10008 United States")).toEqual({ city: "New York", state: "NY", zip: "10008" });
    expect(parseEveryOrgAddress("Atlanta, Georgia, 30303 United States")).toEqual({ city: "Atlanta", state: "GA", zip: "30303" });
  });

  it("fixes all-capital city names but keeps mixed case as written", () => {
    expect(parseEveryOrgAddress("AMERICUS, Georgia, 31709 United States")?.city).toBe("Americus");
    expect(parseEveryOrgAddress("WEST PALM BEACH, Florida, 33401 United States")?.city).toBe("West Palm Beach");
    expect(parseEveryOrgAddress("McAllen, Texas, 78501 United States")?.city).toBe("McAllen");
  });

  it("reads abbreviated states with no ZIP", () => {
    expect(parseEveryOrgAddress("San Francisco, CA, USA")).toEqual({ city: "San Francisco", state: "CA", zip: null });
  });

  it("keeps only the 5-digit ZIP of a ZIP+4, and accepts state + ZIP in one part", () => {
    expect(parseEveryOrgAddress("Boca Raton, Florida, 33431-1234 United States")?.zip).toBe("33431");
    expect(parseEveryOrgAddress("Miami, FL 33130")).toEqual({ city: "Miami", state: "FL", zip: "33130" });
  });

  it("returns null for anything it can't read confidently", () => {
    expect(parseEveryOrgAddress(null)).toBeNull();
    expect(parseEveryOrgAddress("")).toBeNull();
    expect(parseEveryOrgAddress("London, England, United Kingdom")).toBeNull();
    expect(parseEveryOrgAddress("Toronto, Ontario, M5V Canada")).toBeNull();
    expect(parseEveryOrgAddress("Just a name")).toBeNull();
    expect(parseEveryOrgAddress("123 Main St, Springfield")).toBeNull();
  });
});

describe("stateCode", () => {
  it("accepts names and codes, any case", () => {
    expect(stateCode("florida")).toBe("FL");
    expect(stateCode("District of Columbia")).toBe("DC");
    expect(stateCode("fl")).toBe("FL");
    expect(stateCode("ZZ")).toBeNull();
  });
});

describe("orgLocationFields", () => {
  it("maps onto Organization columns", () => {
    expect(orgLocationFields("Chicago, Illinois, 60601 United States")).toEqual({
      locationCity: "Chicago",
      locationState: "IL",
      locationZip: "60601",
      locationCountry: "US",
    });
  });

  it("is empty when unreadable, so a refresh never overwrites a good address with nothing", () => {
    expect(orgLocationFields("somewhere")).toEqual({});
    expect(orgLocationFields(null)).toEqual({});
  });
});

describe("stateName", () => {
  it.each([
    ["FL", "Florida"],
    ["NY", "New York"],
    ["DC", "District of Columbia"],
    ["PR", "Puerto Rico"],
    ["ZZ", "ZZ"],
  ])("%s is %s", (code, name) => {
    expect(stateName(code)).toBe(name);
  });
});
