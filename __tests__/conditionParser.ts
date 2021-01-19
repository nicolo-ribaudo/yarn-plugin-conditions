import { parse } from "../sources/ConditionProtocol/conditionParser";

describe("conditionParser", () => {
  it("basic functionality", () => {
    expect(parse("condition: foo ? 1.0.0 : 2.0.0")).toEqual({
      test: "foo",
      consequent: "1.0.0",
      alternate: "2.0.0",
      hash: null,
    });
  });

  it("no consequent", () => {
    expect(parse("condition: foo ? : 2.0.0")).toEqual({
      test: "foo",
      consequent: null,
      alternate: "2.0.0",
      hash: null,
    });
  });

  it("no alternate", () => {
    expect(parse("condition: foo ? 1.0.0 :")).toEqual({
      test: "foo",
      consequent: "1.0.0",
      alternate: null,
      hash: null,
    });
  });

  it("nested protocol in consequent", () => {
    expect(parse("condition: foo ? (workspace:*) : 1.0.0")).toEqual({
      test: "foo",
      consequent: "workspace:*",
      alternate: "1.0.0",
      hash: null,
    });
  });

  it("nested protocol in consequent with spaces", () => {
    expect(parse("condition: foo ? ( workspace:* ) : 1.0.0")).toEqual({
      test: "foo",
      consequent: "workspace:*",
      alternate: "1.0.0",
      hash: null,
    });
  });

  it("nested protocol in alternate", () => {
    expect(parse("condition: foo ? 1.0.0 : (workspace:*)")).toEqual({
      test: "foo",
      consequent: "1.0.0",
      alternate: "workspace:*",
      hash: null,
    });
  });

  it("nested condition in consequent", () => {
    expect(
      parse("condition: foo ? ( condition:bar ? 1.0.0 : 2.0.0 ) : 3.0.0")
    ).toEqual({
      test: "foo",
      // Yarn will then recursively expand this protocol
      consequent: "condition:bar ? 1.0.0 : 2.0.0",
      alternate: "3.0.0",
      hash: null,
    });
  });
});
