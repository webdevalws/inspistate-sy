// Deterministic demo data used to seed the database (see db/build-seed.ts). Real city/locality
// names are used as geography only; every builder, project, listing, price and person is fictional.
import type {
  Builder, City, Furnishing, Listing, Locality, NearbyPlace, PostedBy, Project,
  ProjectStatus, PropertyType, UnitConfig,
} from '../src/data/types.ts';

type SeedProject = Omit<Project, 'priceMin' | 'priceMax' | 'bhkLabel'> & { units: UnitConfig[] };
type SeedListing = Omit<Listing, 'postedAt' | 'projectName' | 'projectSlug' | 'status' | 'photos' | 'description' | 'managed' | 'depositMonths' | 'availableFrom'> & { postedDaysAgo: number };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261018);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

// The ten original demo cities. Generated localities, projects and listings loop over these only, so the
// random stream (and every generated row) stays the same when a hand-written city like Lucknow is added.
const generatedCities: City[] = [
  { slug: 'mumbai', name: 'Mumbai', state: 'Maharashtra', stampDutyPct: 6, lat: 19.076, lng: 72.8777 },
  { slug: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', stampDutyPct: 5.6, lat: 12.9716, lng: 77.5946 },
  { slug: 'delhi', name: 'Delhi', state: 'Delhi', stampDutyPct: 6, lat: 28.6139, lng: 77.209 },
  { slug: 'gurugram', name: 'Gurugram', state: 'Haryana', stampDutyPct: 7, lat: 28.4595, lng: 77.0266 },
  { slug: 'noida', name: 'Noida', state: 'Uttar Pradesh', stampDutyPct: 7, lat: 28.5355, lng: 77.391 },
  { slug: 'pune', name: 'Pune', state: 'Maharashtra', stampDutyPct: 6, lat: 18.5204, lng: 73.8567 },
  { slug: 'hyderabad', name: 'Hyderabad', state: 'Telangana', stampDutyPct: 6, lat: 17.385, lng: 78.4867 },
  { slug: 'chennai', name: 'Chennai', state: 'Tamil Nadu', stampDutyPct: 7, lat: 13.0827, lng: 80.2707 },
  { slug: 'thane', name: 'Thane', state: 'Maharashtra', stampDutyPct: 7, lat: 19.2183, lng: 72.9781 },
  { slug: 'kolkata', name: 'Kolkata', state: 'West Bengal', stampDutyPct: 6, lat: 22.5726, lng: 88.3639 },
];

// Lucknow: hand-written sample data (no projects). Real place names and coordinates; prices, people and
// descriptions are fictional, like the rest of the demo data. Stamp duty 7% matches Noida (Uttar Pradesh).
const lucknow: City = { slug: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', stampDutyPct: 7, lat: 26.8467, lng: 80.9462 };
const lucknowLocalities: Locality[] = [
  { slug: 'gomti-nagar', name: 'Gomti Nagar', citySlug: 'lucknow', ratePerSqft: 8500, rentPerSqft: 23, yoyGrowthPct: 9.5, lat: 26.8521, lng: 81.0012 },
  { slug: 'hazratganj', name: 'Hazratganj', citySlug: 'lucknow', ratePerSqft: 11000, rentPerSqft: 28, yoyGrowthPct: 6.2, lat: 26.8505, lng: 80.9470 },
  { slug: 'indira-nagar', name: 'Indira Nagar', citySlug: 'lucknow', ratePerSqft: 7000, rentPerSqft: 18.5, yoyGrowthPct: 7.8, lat: 26.8785, lng: 80.9989 },
  { slug: 'aliganj', name: 'Aliganj', citySlug: 'lucknow', ratePerSqft: 6500, rentPerSqft: 17, yoyGrowthPct: 6.8, lat: 26.8957, lng: 80.9413 },
  { slug: 'sushant-golf-city', name: 'Sushant Golf City', citySlug: 'lucknow', ratePerSqft: 6000, rentPerSqft: 15, yoyGrowthPct: 11.4, lat: 26.7745, lng: 80.9886 },
];

export const cities: City[] = [...generatedCities, lucknow];

const localitySeeds: Record<string, [string, number][]> = {
  mumbai: [['Andheri West', 32000], ['Powai', 28000], ['Bandra West', 58000], ['Malad West', 24000], ['Chembur', 26000], ['Borivali West', 22000]],
  bengaluru: [['Whitefield', 9500], ['Sarjapur Road', 8500], ['Hebbal', 11000], ['Electronic City', 6500], ['Koramangala', 16000], ['Yelahanka', 7500]],
  delhi: [['Dwarka', 12000], ['Saket', 22000], ['Rohini', 10000], ['Vasant Kunj', 18000], ['Mayur Vihar', 11000]],
  gurugram: [['Golf Course Road', 22000], ['Sector 65', 14000], ['Dwarka Expressway', 11000], ['Sohna Road', 9000], ['DLF Phase 2', 18000]],
  noida: [['Sector 150', 9000], ['Sector 137', 7500], ['Noida Extension', 5500], ['Sector 62', 8000]],
  pune: [['Hinjewadi', 8000], ['Baner', 11000], ['Kharadi', 10000], ['Wakad', 8500], ['Hadapsar', 7500]],
  hyderabad: [['Gachibowli', 10000], ['Kondapur', 9500], ['Kokapet', 11500], ['Kukatpally', 7500], ['Miyapur', 6500]],
  chennai: [['OMR', 7000], ['Velachery', 9000], ['Anna Nagar', 14000], ['Porur', 7000]],
  thane: [['Ghodbunder Road', 15000], ['Majiwada', 17000], ['Kolshet', 14500]],
  kolkata: [['New Town', 6000], ['Rajarhat', 5500], ['Salt Lake', 9000], ['EM Bypass', 7500]],
};

export const localities: Locality[] = [...generatedCities.flatMap((c) =>
  localitySeeds[c.slug].map(([name, rate]) => ({
    slug: slugify(name),
    name,
    citySlug: c.slug,
    ratePerSqft: rate,
    rentPerSqft: roundTo(rate * between(0.0022, 0.0032), 0.5),
    yoyGrowthPct: Math.round(between(2, 14) * 10) / 10,
    lat: c.lat + between(-0.08, 0.08),
    lng: c.lng + between(-0.08, 0.08),
  })),
), ...lucknowLocalities];

const builderSeeds: [string, string][] = [
  ['Aravalli Habitat', 'Gurugram'],
  ['Sahyadri Constructions', 'Pune'],
  ['Meridian Spaces', 'Mumbai'],
  ['Kaveri Realty', 'Bengaluru'],
  ['Nilgiri Developers', 'Chennai'],
  ['Ganga Infra', 'Noida'],
  ['Skyreach Estates', 'Hyderabad'],
  ['Vistaar Homes', 'Kolkata'],
];

export const builders: Builder[] = builderSeeds.map(([name, hq], i) => ({
  slug: slugify(name),
  name,
  hq,
  founded: int(1988, 2014),
  delivered: int(6, 48),
  ongoing: int(2, 12),
  hue: (i * 47 + 160) % 360,
  about: `${name} is a ${hq}-based developer focused on well-planned residential communities, with an emphasis on on-time delivery, transparent pricing and RERA compliance.`,
}));

const projectWords = ['Aurelia', 'Greenwood', 'Skyview', 'Riverstone', 'Elara', 'Cascade', 'Serene Heights', 'Horizon', 'Orchid Park', 'Zenith', 'Altura', 'Maple Grove', 'Lumina', 'Tranquil Bay', 'Crestview', 'Amara', 'Solace', 'Evergreen', 'Palmyra', 'Verdant'];
const allAmenities = ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Yoga Deck', 'Indoor Games', 'Multipurpose Hall', 'Landscaped Gardens', 'Power Backup', '24x7 Security', 'CCTV Surveillance', 'Lift', 'Covered Parking', 'EV Charging', 'Rainwater Harvesting', 'Sewage Treatment Plant', 'Badminton Court', 'Tennis Court', 'Co-working Lounge', 'Pet Park', 'Senior Citizen Zone', 'Amphitheatre', 'Cafeteria'];
const nearbyNames: Record<NearbyPlace['kind'], string[]> = {
  School: ['Greenfield Public School', 'Vidya Niketan School', 'St. Mary’s Convent', 'Harmony International School'],
  Hospital: ['City Care Hospital', 'Lifeline Multispeciality', 'Sanjeevani Hospital'],
  Metro: ['Metro Station'],
  Mall: ['Central Square Mall', 'Galleria Mall', 'Infinity Mall'],
  'Office Hub': ['Tech Park', 'Business District', 'IT SEZ'],
  Airport: ['International Airport'],
  Railway: ['Railway Station'],
};
const statuses: ProjectStatus[] = ['New Launch', 'Under Construction', 'Ready to Move'];
const months = ['Mar', 'Jun', 'Sep', 'Dec'];

function priceFor(sqft: number, rate: number) {
  return roundTo(sqft * rate, 50000);
}

let projectId = 1001;
const usedNames = new Set<string>();
export const projects: SeedProject[] = generatedCities.flatMap((c) => {
  const locs = localities.filter((l) => l.citySlug === c.slug);
  return sample(locs, 3).map((loc) => {
    const builder = pick(builders);
    let name: string;
    do name = `${builder.name.split(' ')[0]} ${pick(projectWords)}`;
    while (usedNames.has(name));
    usedNames.add(name);
    const status = pick(statuses);
    const rate = roundTo(loc.ratePerSqft * between(0.95, 1.3), 50);
    const bhks = sample([1, 2, 3, 4], int(2, 3)).sort();
    const units: UnitConfig[] = bhks.flatMap((bhk) => {
      const base = { 1: 450, 2: 680, 3: 1000, 4: 1450 }[bhk] ?? 700;
      return [0, 1].map((v) => {
        const carpet = roundTo(base * between(0.92, 1.18) + v * base * 0.12, 5);
        return { bhk, label: `${bhk} BHK Apartment`, carpetSqft: carpet, price: priceFor(carpet * 1.3, rate) };
      });
    });
    const launchedYear = status === 'Ready to Move' ? int(2016, 2021) : status === 'Under Construction' ? int(2022, 2024) : int(2025, 2026);
    const possessionYear = status === 'Ready to Move' ? launchedYear + 4 : launchedYear + int(3, 5);
    const nearby: NearbyPlace[] = (Object.keys(nearbyNames) as NearbyPlace['kind'][]).map((kind) => ({
      kind,
      name: kind === 'Metro' || kind === 'Railway' ? `${loc.name} ${nearbyNames[kind][0]}` : kind === 'Airport' ? `${c.name} ${nearbyNames.Airport[0]}` : pick(nearbyNames[kind]),
      km: Math.round(between(kind === 'Airport' ? 9 : 0.4, kind === 'Airport' ? 28 : 4.5) * 10) / 10,
    }));
    const trendStart = rate * between(0.72, 0.85);
    const priceTrend = Array.from({ length: 8 }, (_, i) => ({
      label: `${['Q1', 'Q2', 'Q3', 'Q4'][i % 4]} ${2025 + Math.floor(i / 4)}`,
      rate: roundTo(trendStart + ((rate - trendStart) * i) / 7 + between(-0.02, 0.02) * rate, 10),
    }));
    priceTrend[7].rate = rate;
    const id = projectId++;
    return {
      id,
      slug: slugify(`${name} ${loc.name}`),
      name,
      citySlug: c.slug,
      localitySlug: loc.slug,
      builderSlug: builder.slug,
      status,
      possession: `${pick(months)} ${possessionYear}`,
      rera: `${c.state.slice(0, 2).toUpperCase()}RERA/P${int(10000000, 99999999)}`,
      landAcres: Math.round(between(1.2, 18) * 10) / 10,
      totalUnits: int(120, 1400),
      towers: int(2, 12),
      floors: int(14, 45),
      ratePerSqft: rate,
      units,
      amenities: sample(allAmenities, int(10, 18)),
      highlights: [
        `${loc.name} address with quick access to ${nearby.find((n) => n.kind === 'Office Hub')?.name}`,
        `${Math.round(between(60, 80))}% open space with landscaped central greens`,
        `${bhks.join(', ')} BHK homes designed for cross-ventilation`,
        status === 'Ready to Move' ? 'Occupancy certificate received — move in now' : 'Construction-linked payment plan available',
      ],
      priceTrend,
      nearby,
      hue: int(150, 260),
      launchedYear,
    } satisfies SeedProject;
  });
});

const firstNames = ['Rohan', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Neha', 'Karan', 'Isha', 'Sameer', 'Kavya', 'Aditya', 'Meera', 'Rahul', 'Sneha', 'Farhan', 'Divya'];
const lastNames = ['Mehta', 'Iyer', 'Reddy', 'Sharma', 'Kapoor', 'Nair', 'Joshi', 'Banerjee', 'Gupta', 'Kulkarni', 'Khan', 'Rao'];
const facings = ['East', 'North', 'North-East', 'West', 'South', 'North-West'];
const furnishings: Furnishing[] = ['Furnished', 'Semi-Furnished', 'Unfurnished'];

let listingId = 50001;
function makeListing(citySlug: string, purpose: 'buy' | 'rent', commercial: boolean): SeedListing {
  const loc = pick(localities.filter((l) => l.citySlug === citySlug));
  const cityProjects = projects.filter((p) => p.localitySlug === loc.slug && p.citySlug === citySlug);
  const type: PropertyType = commercial
    ? pick(['Office', 'Office', 'Shop'] as const)
    : pick(['Apartment', 'Apartment', 'Apartment', 'Apartment', 'Builder Floor', 'Villa', 'Plot'] as const);
  const bhk = type === 'Plot' || commercial ? 0 : type === 'Villa' ? pick([3, 4, 4, 5]) : pick([1, 2, 2, 2, 3, 3, 3, 4, 5]);
  const areaSqft =
    type === 'Plot' ? roundTo(between(900, 4000), 50)
    : commercial ? roundTo(between(250, 3500), 25)
    : roundTo(({ 1: 520, 2: 900, 3: 1350, 4: 2000, 5: 2900 }[bhk] ?? 900) * between(0.85, 1.25) * (type === 'Villa' ? 1.4 : 1), 5);
  const rateMul = commercial ? 1.35 : type === 'Plot' ? 0.75 : type === 'Villa' ? 1.15 : 1;
  const price = purpose === 'buy'
    ? roundTo(areaSqft * loc.ratePerSqft * rateMul * between(0.88, 1.12), 50000)
    : roundTo(areaSqft * loc.rentPerSqft * rateMul * between(0.85, 1.15), 500);
  const project = type === 'Apartment' && cityProjects.length && rand() < 0.45 ? pick(cityProjects) : null;
  const postedBy: PostedBy = pick(['Owner', 'Owner', 'Agent', 'Agent', 'Agent', 'Builder']);
  const totalFloors = type === 'Villa' ? int(2, 3) : type === 'Builder Floor' ? 4 : type === 'Plot' ? 0 : int(7, 40);
  return {
    id: listingId++,
    purpose,
    segment: commercial ? 'commercial' : 'residential',
    type,
    bhk,
    bathrooms: bhk ? Math.max(1, bhk - (rand() < 0.4 ? 1 : 0)) : commercial ? int(1, 2) : 0,
    areaSqft,
    price,
    citySlug,
    localitySlug: loc.slug,
    projectId: project?.id ?? null,
    furnishing: type === 'Plot' ? 'Unfurnished' : pick(furnishings),
    postedBy,
    possession: project?.status === 'Under Construction' || rand() < 0.18 ? 'Under Construction' : 'Ready to Move',
    floor: totalFloors ? int(type === 'Villa' ? 0 : 1, Math.max(1, totalFloors - 1)) : 0,
    totalFloors,
    facing: pick(facings),
    ageYears: int(0, 15),
    amenities: sample(allAmenities, int(4, 10)),
    postedDaysAgo: int(0, 60),
    contactName: postedBy === 'Builder' ? (project ? builders.find((b) => b.slug === project.builderSlug)!.name : pick(builders).name) : `${pick(firstNames)} ${pick(lastNames)}`,
    verified: rand() < 0.6,
    hue: int(150, 260),
  };
}

export const listings: SeedListing[] = generatedCities.flatMap((c) => [
  ...Array.from({ length: 40 }, () => makeListing(c.slug, 'buy', false)),
  ...Array.from({ length: 26 }, () => makeListing(c.slug, 'rent', false)),
  ...Array.from({ length: 8 }, () => makeListing(c.slug, 'buy', true)),
  ...Array.from({ length: 6 }, () => makeListing(c.slug, 'rent', true)),
]);

/** Hand-written sample listings (Lucknow), appended after the generated ones; unlike those they carry a description. */
export const extraListings: (SeedListing & { description: string })[] = [
  {
    id: 50801, purpose: 'buy', segment: 'residential', type: 'Apartment', bhk: 2, bathrooms: 2, areaSqft: 1150, price: 9800000,
    citySlug: 'lucknow', localitySlug: 'gomti-nagar', projectId: null, furnishing: 'Semi-Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 6, totalFloors: 14, facing: 'East', ageYears: 4,
    amenities: ['Lift', 'Power Backup', 'Covered Parking', '24x7 Security', 'Kids Play Area'], postedDaysAgo: 3,
    contactName: 'Ritika Srivastava', verified: true, hue: 205,
    description: 'Bright east-facing 2 BHK on the 6th floor, a short walk from Gomti Nagar’s markets. Modular kitchen, two balconies and covered parking.',
  },
  {
    id: 50802, purpose: 'buy', segment: 'residential', type: 'Apartment', bhk: 3, bathrooms: 3, areaSqft: 1600, price: 11200000,
    citySlug: 'lucknow', localitySlug: 'indira-nagar', projectId: null, furnishing: 'Semi-Furnished', postedBy: 'Agent',
    possession: 'Ready to Move', floor: 3, totalFloors: 10, facing: 'North-East', ageYears: 7,
    amenities: ['Lift', 'Power Backup', 'Gymnasium', 'Clubhouse', 'Covered Parking', 'CCTV Surveillance'], postedDaysAgo: 9,
    contactName: 'Amit Verma', verified: true, hue: 180,
    description: 'Spacious 3 BHK with a large living room and a study corner, in a gated society close to schools and the Indira Nagar metro station.',
  },
  {
    id: 50803, purpose: 'rent', segment: 'residential', type: 'Apartment', bhk: 2, bathrooms: 2, areaSqft: 1000, price: 28000,
    citySlug: 'lucknow', localitySlug: 'hazratganj', projectId: null, furnishing: 'Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 2, totalFloors: 5, facing: 'North', ageYears: 10,
    amenities: ['Power Backup', '24x7 Security', 'Lift'], postedDaysAgo: 5,
    contactName: 'Saba Rizvi', verified: false, hue: 230,
    description: 'Fully furnished 2 BHK in the heart of Hazratganj — walk to cafés, offices and the metro. Suits a small family or working professionals.',
  },
  {
    id: 50804, purpose: 'rent', segment: 'residential', type: 'Apartment', bhk: 1, bathrooms: 1, areaSqft: 560, price: 9500,
    citySlug: 'lucknow', localitySlug: 'aliganj', projectId: null, furnishing: 'Unfurnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 1, totalFloors: 4, facing: 'West', ageYears: 12,
    amenities: ['Power Backup', 'Covered Parking'], postedDaysAgo: 12,
    contactName: 'Pankaj Tiwari', verified: true, hue: 160,
    description: 'Compact 1 BHK in a quiet lane of Aliganj with a separate entrance and two-wheeler parking. Close to Kapoorthala market.',
  },
];
