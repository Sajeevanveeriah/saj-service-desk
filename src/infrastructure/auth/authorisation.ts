export type Role = "owner" | "admin" | "customer";
export interface Principal { userId: number; role: Role; customerId?: number; }
export function requireRole(principal: Principal | null, roles: readonly Role[]): Principal { if (!principal || !roles.includes(principal.role)) throw new Error("Forbidden"); return principal; }
export function ownsCustomer(principal: Principal, customerId: number): boolean { return principal.role !== "customer" || principal.customerId === customerId; }
export function requireCustomerAccess(principal: Principal, customerId: number): void { if (!ownsCustomer(principal, customerId)) throw new Error("Forbidden"); }
