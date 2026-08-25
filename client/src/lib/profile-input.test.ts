import { describe, expect, it } from "vitest";
import { extractHandle, isValidGitHubHandle, safeUrl } from "./profile-input";

describe("GitHub profile input", () => {
  it("accepts a handle with an @ prefix", () => {
    expect(extractHandle(" @mohamed-khairy-5i ")).toBe("mohamed-khairy-5i");
  });

  it("extracts a handle from a complete public GitHub URL", () => {
    expect(extractHandle("https://github.com/vercel?tab=repositories")).toBe("vercel");
  });

  it("rejects a repository URL instead of silently loading its owner profile", () => {
    expect(extractHandle("https://github.com/vercel/next.js")).toBe("");
  });

  it("accepts valid GitHub handles and rejects malformed input", () => {
    expect(isValidGitHubHandle("vercel")).toBe(true);
    expect(isValidGitHubHandle("mohamed-khairy-5i")).toBe(true);
    expect(isValidGitHubHandle("github.com/vercel/path")).toBe(false);
    expect(isValidGitHubHandle("-invalid")).toBe(false);
  });
});

describe("public links", () => {
  it("adds HTTPS to a public domain", () => {
    expect(safeUrl("github.com/vercel/next.js")).toBe("https://github.com/vercel/next.js");
  });

  it("allows HTTP and HTTPS but rejects unsafe protocols", () => {
    expect(safeUrl("http://localhost:3000")).toBe("http://localhost:3000/");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("not a valid link")).toBe("");
  });
});
