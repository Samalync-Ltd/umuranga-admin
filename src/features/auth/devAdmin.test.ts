import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD } from "@/features/auth/devAdmin";

/**
 * The dev sign-in shortcut is gated on `import.meta.env.DEV`, which Vite
 * replaces with `false` in a production build so the branch and its constants
 * are dead-code eliminated.
 *
 * "Should be eliminated" is not good enough for a credential on the login
 * screen of a console that can ban people, so this builds the app for real and
 * greps the output. If a bundler change ever stops eliminating it, this fails.
 */
describe("dev admin shortcut is absent from production builds", () => {
  it("leaves no trace of the credentials in the emitted bundle", () => {
    // NODE_ENV must be pinned. Vitest sets NODE_ENV=test, and Vite derives
    // `import.meta.env.DEV` from it — so a build launched from inside the test
    // runner would keep DEV true, retain the branch, and make this test fail
    // against a bundle no one will ever ship. Both flags are set so the build
    // matches `npm run build` exactly.
    execFileSync("npx", ["vite", "build", "--mode", "production", "--logLevel", "error"], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
    });

    const assets = readdirSync("dist/assets");
    const bundle = assets
      .filter((name) => name.endsWith(".js") || name.endsWith(".css"))
      .map((name) => readFileSync(`dist/assets/${name}`, "utf8"))
      .join("\n");

    expect(bundle.length).toBeGreaterThan(1000);
    expect(bundle).not.toContain(DEV_ADMIN_PASSWORD);
    expect(bundle).not.toContain(DEV_ADMIN_EMAIL);
    expect(bundle).not.toContain("Sign in as seeded admin");
  }, 120_000);
});
