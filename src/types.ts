export interface Property {
  id: string;
  city: 'Mumbai' | 'Pune' | string;
  title: string;
  society: string;
  locality: string;
  bhk: number | null;
  area_sqft: number | null;
  bathrooms: number | null;
  furnishing: 'Unfurnished' | 'Semi-Furnished' | 'Furnished' | string;
  status: 'Ready to Move' | 'Under Construction' | string;
  age_years: number | null;
  price_inr: number | null;
  price_per_sqft: number | null;
  listing_url: string;
  is_duplicate_url?: boolean;
}

export interface EstimationParams {
  city: 'Mumbai' | 'Pune';
  locality?: string;
  bhk: number;
  area_sqft: number;
  bathrooms: number;
  furnishing: 'Unfurnished' | 'Semi-Furnished' | 'Furnished';
  status: 'Ready to Move' | 'Under Construction';
}

export interface EstimationResult {
  estimated_price_inr: number;
  estimated_rate_per_sqft: number;
  lower_bound_inr: number;
  upper_bound_inr: number;
  tolerance_band_percent: number;
  city: string;
  locality?: string;
  area_sqft: number;
  bhk: number;
  locality_multiplier?: number;
}

export interface OverpricingVerdict {
  seller_asking_price: number;
  estimated_price: number;
  difference_inr: number;
  difference_percent: number;
  tolerance_percent: number;
  verdict: string;
  risk_tier: 'low' | 'fair' | 'moderate' | 'high';
}

export interface AnalyticsSummary {
  total_raw: number;
  total_residential: number;
  total_excluded: number;
  total_ml_ready: number;
  pune_properties: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  mumbai_properties: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  pune_rate_per_sqft: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  mumbai_rate_per_sqft: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  bhk_distribution: Record<string, number>;
  city_distribution: Record<string, number>;
  furnishing_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  model_meta: {
    model_name: string;
    target: string;
    mae_inr: number;
    rmse_inr: number;
    dummy_mae_inr?: number;
    dummy_rmse_inr?: number;
    r2_score: number;
    log_r2_score?: number;
    median_ape_percent?: number;
    mean_ape_percent?: number;
    mape_percent: number;
    tolerance_band_percent: number;
    training_samples: number;
    test_samples: number;
    ridge_alpha?: number;
    shrinkage_m?: number;
    city_median_rates?: Record<string, number>;
    city_gmean_rates?: Record<string, number>;
  };
}
