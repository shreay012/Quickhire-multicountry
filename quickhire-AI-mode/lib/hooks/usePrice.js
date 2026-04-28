"use client";

import { useSelector } from "react-redux";
import { useCallback, useMemo } from "react";
import { selectCurrency } from "@/lib/redux/slices/regionSlice/regionSlice";
import { formatPrice as fmt, convertFromINR } from "@/lib/i18n/currency";

/**
 * Returns a price formatter bound to the active currency.
 *
 *   const { format, convert, currency } = usePrice();
 *   format(1250)       // "₹1,250" / "$15" / "د.إ55" depending on user
 *   convert(1250)      // numeric amount in active currency
 */
export function usePrice() {
  const currency = useSelector(selectCurrency);

  const format = useCallback(
    (amountInr, opts) => fmt(amountInr, currency, opts),
    [currency],
  );
  const convert = useCallback(
    (amountInr) => convertFromINR(amountInr, currency),
    [currency],
  );

  return useMemo(
    () => ({ currency, format, convert }),
    [currency, format, convert],
  );
}
