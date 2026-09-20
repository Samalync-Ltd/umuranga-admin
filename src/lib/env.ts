/**
 * Environment configuration.
 *
 * There is deliberately no fallback and no mock mode. If the Firebase config
 * is absent the app refuses to start and says so — the same posture the mobile
 * app takes with `not-implemented` repositories: nothing silently
 * half-succeeds against a backend that isn't there.
 */

export type AdminEnv = {
  readonly firebase: {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
    readonly storageBucket: string;
    readonly messagingSenderId: string;
    readonly appId: string;
  };
  readonly useEmulators: boolean;
  readonly emulator: {
    readonly authHost: string;
    readonly authPort: number;
    readonly firestoreHost: string;
    readonly firestorePort: number;
    readonly functionsHost: string;
    readonly functionsPort: number;
  };
};

export class MissingEnvError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

/** Reads and validates env. Throws {@link MissingEnvError} rather than returning a partial config. */
export function readEnv(source: Record<string, string | undefined> = import.meta.env): AdminEnv {
  const missing = REQUIRED.filter((key) => !source[key]?.trim());
  if (missing.length > 0) throw new MissingEnvError(missing);

  const port = (key: string, fallback: number): number => {
    const raw = source[key]?.trim();
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
  };

  return {
    firebase: {
      apiKey: source.VITE_FIREBASE_API_KEY!,
      authDomain: source.VITE_FIREBASE_AUTH_DOMAIN!,
      projectId: source.VITE_FIREBASE_PROJECT_ID!,
      storageBucket: source.VITE_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: source.VITE_FIREBASE_MESSAGING_SENDER_ID!,
      appId: source.VITE_FIREBASE_APP_ID!,
    },
    useEmulators: source.VITE_USE_EMULATORS === "true",
    emulator: {
      authHost: source.VITE_EMULATOR_AUTH_HOST ?? "127.0.0.1",
      authPort: port("VITE_EMULATOR_AUTH_PORT", 9099),
      firestoreHost: source.VITE_EMULATOR_FIRESTORE_HOST ?? "127.0.0.1",
      firestorePort: port("VITE_EMULATOR_FIRESTORE_PORT", 8085),
      functionsHost: source.VITE_EMULATOR_FUNCTIONS_HOST ?? "127.0.0.1",
      functionsPort: port("VITE_EMULATOR_FUNCTIONS_PORT", 5001),
    },
  };
}
