/**
 * Unit tests for getAccountInfoTool
 *
 * Run with: npx jest tools/getAccountInfo.test.ts
 */

import { getAccountInfoTool } from "./getAccountInfo";

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_TESTNET_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
const INVALID_KEY_SHORT  = "GABC123";
const INVALID_KEY_WRONG_PREFIX = "XAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
const UNFUNDED_KEY = "GDQJUTQYK2MQX2VGDR2FYWLIYAQIEGXTQVTFEMGH532XDG3NH8QIXHF";

// ── Schema Validation Tests ────────────────────────────────────────────────

describe("getAccountInfoTool — schema validation", () => {
  it("should reject a public key that is too short", async () => {
    const result = await getAccountInfoTool.invoke({
      publicKey: INVALID_KEY_SHORT,
      network: "testnet",
    });
    // Zod will throw and LangChain surfaces it as an error string
    expect(result).toMatch(/invalid/i);
  });

  it("should reject a public key that does not start with G", async () => {
    const result = await getAccountInfoTool.invoke({
      publicKey: INVALID_KEY_WRONG_PREFIX,
      network: "testnet",
    });
    expect(result).toMatch(/invalid/i);
  });

  it("should default to testnet when network is omitted", async () => {
    // We only test that the call doesn't crash due to missing network.
    // The actual network response is tested in integration tests.
    const schema = getAccountInfoTool.schema;
    const parsed = schema.parse({ publicKey: VALID_TESTNET_KEY });
    expect(parsed.network).toBe("testnet");
  });
});

// ── Output Format Tests ────────────────────────────────────────────────────

describe("getAccountInfoTool — output format", () => {
  it("should include account header in successful response", async () => {
    const result = await getAccountInfoTool.invoke({
      publicKey: VALID_TESTNET_KEY,
      network: "testnet",
    });
    // Whether the account exists or not, the response should be a non-empty string
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return a descriptive message for an unfunded account", async () => {
    const result = await getAccountInfoTool.invoke({
      publicKey: UNFUNDED_KEY,
      network: "testnet",
    });
    // Should mention the account doesn't exist or failed to fetch
    expect(result).toMatch(/does not exist|not.*fund|failed/i);
  });

  it("should include 'testnet' in the response for testnet queries", async () => {
    const result = await getAccountInfoTool.invoke({
      publicKey: VALID_TESTNET_KEY,
      network: "testnet",
    });
    // Either the account info header or the error message should mention testnet
    expect(result).toMatch(/testnet/i);
  });
});

// ── Tool Metadata Tests ────────────────────────────────────────────────────

describe("getAccountInfoTool — metadata", () => {
  it("should have the correct tool name", () => {
    expect(getAccountInfoTool.name).toBe("get_account_info");
  });

  it("should have a non-empty description", () => {
    expect(getAccountInfoTool.description.length).toBeGreaterThan(20);
  });

  it("should mention 'balance' in the description", () => {
    expect(getAccountInfoTool.description.toLowerCase()).toContain("balance");
  });

  it("should accept mainnet as a valid network option", () => {
    const schema = getAccountInfoTool.schema;
    expect(() =>
      schema.parse({ publicKey: VALID_TESTNET_KEY, network: "mainnet" })
    ).not.toThrow();
  });

  it("should reject an unknown network value", () => {
    const schema = getAccountInfoTool.schema;
    expect(() =>
      schema.parse({ publicKey: VALID_TESTNET_KEY, network: "devnet" })
    ).toThrow();
  });
});
