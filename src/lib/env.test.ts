import { describe, expect, it } from "vitest";
import { MissingEnvError, readEnv } from "@/lib/env";

const COMPLETE = {
  VITE_FIREBASE_API_KEY: "key",
  VITE_FIREBASE_AUTH_DOMAIN: "domain",
  VITE_FIREBASE_PROJECT_ID: "project",
  VITE_FIREBASE_STORAGE_BUCKET: "bucket",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "sender",
  VITE_FIREBASE_APP_ID: "app",
};

describe("readEnv", () => {
  it("throws MissingEnvError naming every absent key", () => {
    try {
      readEnv({ VITE_FIREBASE_API_KEY: "key" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as MissingEnvError).missing).toEqual([
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_STORAGE_BUCKET",
        "VITE_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_APP_ID",
      ]);
    }
  });

  it("treats a whitespace-only value as missing", () => {
    expect(() => readEnv({ ...COMPLETE, VITE_FIREBASE_APP_ID: "   " })).toThrow(MissingEnvError);
  });

  it("defaults useEmulators to false for anything but the exact string 'true'", () => {
    expect(readEnv(COMPLETE).useEmulators).toBe(false);
    expect(readEnv({ ...COMPLETE, VITE_USE_EMULATORS: "1" }).useEmulators).toBe(false);
    expect(readEnv({ ...COMPLETE, VITE_USE_EMULATORS: "true" }).useEmulators).toBe(true);
  });

  it("falls back to the default port when the override is not a valid port", () => {
    expect(readEnv({ ...COMPLETE, VITE_EMULATOR_AUTH_PORT: "nonsense" }).emulator.authPort).toBe(9099);
    expect(readEnv({ ...COMPLETE, VITE_EMULATOR_AUTH_PORT: "70000" }).emulator.authPort).toBe(9099);
    expect(readEnv({ ...COMPLETE, VITE_EMULATOR_AUTH_PORT: "9100" }).emulator.authPort).toBe(9100);
  });
});
