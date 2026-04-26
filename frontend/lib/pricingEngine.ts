/**
 * firstmeal Pricing Engine
 * Formula: Customer_Total = (Base + Packaging) + ((Base + Packaging) * GST%) + Platform_Fee
 * Profit:  Your_Profit = (Base * Commission_Rate) + Platform_Fee
 */

export type GSTTier = 5 | 12;

export interface RestaurantFinance {
  restaurant_id: string;
  packaging_fee: number;      // Fixed amount per order, set by merchant
  gst_percent: GSTTier;       // 5 for standard, 12 for premium/AC restaurants
  commission_rate: number;    // 0–1 decimal (e.g. 0.18 = 18%)
  platform_fee: number;       // Global flat charge (centrally controlled)
  category: 'standard' | 'premium'; // Determines GST tier
}

export interface PricingBreakdown {
  base: number;
  packaging_fee: number;
  gst_amount: number;
  gst_percent: number;
  platform_fee: number;
  customer_total: number;
  your_profit: number;
  commission_deducted: number;
}

// ─── Global Platform Fee (centralised — admin adjustable at runtime) ──────────
let GLOBAL_PLATFORM_FEE = 5.00; // ₹5 default
export const setPlatformFee = (fee: number) => { GLOBAL_PLATFORM_FEE = fee; };
export const getPlatformFee = () => GLOBAL_PLATFORM_FEE;

// ─── Per-restaurant configs (mutated by Admin Settings panel) ─────────────────
const DEFAULT_CONFIGS: Record<string, RestaurantFinance> = {};

const restaurantConfigs: Record<string, RestaurantFinance> = { ...DEFAULT_CONFIGS };

export const setRestaurantConfig = (cfg: RestaurantFinance) => {
  restaurantConfigs[cfg.restaurant_id] = { ...cfg, platform_fee: GLOBAL_PLATFORM_FEE };
};

export const getRestaurantConfig = (restaurant_id: string): RestaurantFinance => {
  return restaurantConfigs[restaurant_id] ?? {
    restaurant_id,
    packaging_fee: 10,
    gst_percent: 5,
    commission_rate: 0.18,
    platform_fee: GLOBAL_PLATFORM_FEE,
    category: 'standard',
  };
};

export const getAllRestaurantConfigs = () => restaurantConfigs;

// ─── Pricing Calculator ───────────────────────────────────────────────────────
export function calculatePricing(
  restaurant_id: string,
  base_amount: number
): PricingBreakdown {
  const cfg = getRestaurantConfig(restaurant_id);
  const platform_fee = GLOBAL_PLATFORM_FEE;

  const base = base_amount;
  const packaging_fee = cfg.packaging_fee;
  const taxable = base + packaging_fee;
  const gst_amount = parseFloat((taxable * (cfg.gst_percent / 100)).toFixed(2));
  const customer_total = parseFloat((taxable + gst_amount + platform_fee).toFixed(2));

  const commission_deducted = parseFloat((base * cfg.commission_rate).toFixed(2));
  const your_profit = parseFloat((base - commission_deducted + platform_fee).toFixed(2));

  return {
    base,
    packaging_fee,
    gst_amount,
    gst_percent: cfg.gst_percent,
    platform_fee,
    customer_total,
    your_profit,
    commission_deducted,
  };
}
