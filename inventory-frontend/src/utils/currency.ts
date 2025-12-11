// Currency configuration
export const CURRENCY = {
  symbol: '$',  // USD symbol
  code: 'USD',
  locale: 'en-US'
};

// Format currency with symbol (for compact display like $1.5M, $2.3K)
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `${CURRENCY.symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${CURRENCY.symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    return `${CURRENCY.symbol}${amount.toLocaleString()}`;
  }
};

// Format currency with locale (for proper USD formatting)
export const formatCurrencyLocale = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
  }).format(amount);
};

// Get just the currency symbol
export const getCurrencySymbol = (): string => {
  return CURRENCY.symbol;
};

