/**
 * formatting.util.js - Price formatting and display utilities
 */

export function formatPrice(price, options = {}) {
  const {
    currency = '$',
    decimals = 2,
    showZero = true,
    nullText = 'N/A'
  } = options;

  if (price === null || price === undefined) {
    return nullText;
  }

  if (isNaN(price)) {
    return nullText;
  }

  if (price === 0 && !showZero) {
    return nullText;
  }

  const formattedNumber = Number(price).toFixed(decimals);
  return `${currency}${formattedNumber}`;
}

export function formatPriceRange(minPrice, maxPrice, options = {}) {
  const {
    currency = '$',
    decimals = 2,
    separator = ' - ',
    sameText = null
  } = options;

  if (minPrice === null || maxPrice === null || isNaN(minPrice) || isNaN(maxPrice)) {
    return 'N/A';
  }

  const formattedMin = formatPrice(minPrice, { currency, decimals });
  const formattedMax = formatPrice(maxPrice, { currency, decimals });

  if (minPrice === maxPrice && sameText) {
    return formattedMin;
  }

  return `${formattedMin}${separator}${formattedMax}`;
}

export function formatPercentage(percentage, options = {}) {
  const {
    decimals = 1,
    showSign = true,
    nullText = 'N/A'
  } = options;

  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return nullText;
  }

  if (percentage === Infinity) {
    return '∞%';
  }

  const sign = showSign && percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

export function formatCompactPrice(price, options = {}) {
  const {
    currency = '$',
    decimals = 1
  } = options;

  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  if (price < 1000) {
    return formatPrice(price, { currency, decimals: 0 });
  }

  if (price < 1000000) {
    return `${currency}${(price / 1000).toFixed(decimals)}K`;
  }

  return `${currency}${(price / 1000000).toFixed(decimals)}M`;
}
