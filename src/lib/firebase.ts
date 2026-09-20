import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { readEnv, type AdminEnv } from "@/lib/env";

export type FirebaseServices = {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;
  readonly usingEmulators: boolean;
};

let services: FirebaseServices | null = null;

/**
 * Initialises Firebase once, wiring the emulator suite when
 * `VITE_USE_EMULATORS=true`.
 *
 * Reads (Auth, Firestore) go through the client SDK. Every privileged write
 * goes through `functions` as a callable — the dashboard never writes to
 * Firestore directly. See FIRESTORE_SCHEMA.md, Part 3.
 */
export function initFirebase(env: AdminEnv = readEnv()): FirebaseServices {
  if (services) return services;

  const app = initializeApp(env.firebase);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app);

  if (env.useEmulators) {
    const { emulator } = env;
    connectAuthEmulator(auth, `http://${emulator.authHost}:${emulator.authPort}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, emulator.firestoreHost, emulator.firestorePort);
    connectFunctionsEmulator(functions, emulator.functionsHost, emulator.functionsPort);
  }

  services = { app, auth, db, functions, usingEmulators: env.useEmulators };
  return services;
}

export function getServices(): FirebaseServices {
  if (!services) throw new Error("initFirebase() must be called before getServices()");
  return services;
}

/** Test seam. */
export function resetFirebaseForTests(): void {
  services = null;
}
