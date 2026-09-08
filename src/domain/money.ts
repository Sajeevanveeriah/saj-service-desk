export type Cents = number & { readonly __brand: "cents" };

export function cents(value: number): Cents {
  if (!Number.isInteger(value) || value < 0) throw new Error("Money must be a non-negative integer number of cents");
  return value as Cents;
}

export function roundHalfUp(value: number): number {
  return value < 0 ? Math.ceil(value - 0.5) : Math.floor(value + 0.5);
}

export function percentageOf(amount: Cents, percentage: number): Cents {
  if (!Number.isFinite(percentage) || percentage < 0) throw new Error("Invalid percentage");
  return cents(roundHalfUp((amount * percentage) / 100));
}

export function lineTotal(quantity: number, unitCents: Cents, discountCents: Cents = cents(0)): Cents {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Invalid quantity");
  const total = roundHalfUp(quantity * unitCents) - discountCents;
  return cents(Math.max(0, total));
}

export function gstFromNet(net: Cents, rate = 10): Cents { return percentageOf(net, rate); }
export function grossFromNet(net: Cents, rate = 10): Cents { return cents(net + gstFromNet(net, rate)); }
export function balanceDue(gross: Cents, allocated: Cents): Cents { return cents(Math.max(0, gross - allocated)); }
