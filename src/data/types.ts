export type Purpose = 'buy' | 'rent';
export type Segment = 'residential' | 'commercial';
export type PropertyType = 'Apartment' | 'Builder Floor' | 'Villa' | 'Plot' | 'Office' | 'Shop';
export type Furnishing = 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
export type PostedBy = 'Owner' | 'Agent' | 'Builder';
export type Possession = 'Ready to Move' | 'Under Construction';
export type ProjectStatus = 'New Launch' | 'Under Construction' | 'Ready to Move';
export type ListingStatus = 'active' | 'pending' | 'rejected';

export interface City {
  slug: string;
  name: string;
  state: string;
  stampDutyPct: number;
  lat: number;
  lng: number;
}

export interface Locality {
  slug: string;
  name: string;
  citySlug: string;
  ratePerSqft: number;
  rentPerSqft: number;
  yoyGrowthPct: number;
  lat: number;
  lng: number;
}

export interface Builder {
  slug: string;
  name: string;
  founded: number;
  hq: string;
  delivered: number;
  ongoing: number;
  about: string;
  hue: number;
}

export interface UnitConfig {
  bhk: number;
  label: string;
  carpetSqft: number;
  price: number;
}

export interface NearbyPlace {
  name: string;
  kind: 'School' | 'Hospital' | 'Metro' | 'Mall' | 'Office Hub' | 'Airport' | 'Railway';
  km: number;
}

export interface Project {
  id: number;
  slug: string;
  name: string;
  citySlug: string;
  localitySlug: string;
  builderSlug: string;
  status: ProjectStatus;
  possession: string;
  rera: string;
  landAcres: number;
  totalUnits: number;
  towers: number;
  floors: number;
  ratePerSqft: number;
  priceMin: number;
  priceMax: number;
  bhkLabel: string;
  amenities: string[];
  highlights: string[];
  priceTrend: { label: string; rate: number }[];
  nearby: NearbyPlace[];
  hue: number;
  launchedYear: number;
}

export interface ProjectDetail extends Project {
  units: UnitConfig[];
}

export interface Listing {
  id: number;
  purpose: Purpose;
  segment: Segment;
  type: PropertyType;
  bhk: number;
  bathrooms: number;
  areaSqft: number;
  price: number;
  citySlug: string;
  localitySlug: string;
  projectId: number | null;
  projectName: string | null;
  projectSlug: string | null;
  furnishing: Furnishing;
  postedBy: PostedBy;
  possession: Possession;
  floor: number;
  totalFloors: number;
  facing: string;
  ageYears: number;
  amenities: string[];
  description: string | null;
  postedAt: string;
  contactName: string;
  verified: boolean;
  status: ListingStatus;
  photos: string[];
  hue: number;
  /** Owner-managed rental: low deposit, no brokerage (migration 0008). */
  managed: boolean;
  depositMonths: number;
  availableFrom: string | null;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  page: string | null;
  listingId: number | null;
  projectId: number | null;
  createdAt: string;
}
