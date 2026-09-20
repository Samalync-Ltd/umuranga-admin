/**
 * The dashboard's navigation, mapped 1:1 onto blueprint §11's AD01–AD07 so the
 * contracted scope and the routing skeleton can't drift apart.
 *
 * AD01 (admin login) has no nav entry — it is `RequireAdmin`'s signed-out
 * branch, not a destination.
 */
export type NavItem = {
  readonly to: string;
  readonly label: string;
  /** Blueprint §11 reference. */
  readonly ad: string;
  /** The phase that delivers this surface. */
  readonly phase: "A" | "B" | "C" | "D" | "E";
};

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Overview", ad: "AD02", phase: "E" },
  { to: "/users", label: "Users", ad: "AD03", phase: "B" },
  { to: "/reports", label: "Reports", ad: "AD04", phase: "C" },
  { to: "/subscriptions", label: "Subscriptions", ad: "AD05", phase: "D" },
  { to: "/statistics", label: "Statistics", ad: "AD06", phase: "E" },
  { to: "/account", label: "Admin account", ad: "AD07", phase: "A" },
];
