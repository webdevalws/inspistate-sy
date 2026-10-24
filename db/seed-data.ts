// Deterministic demo data used to seed the database (see db/build-seed.ts). Real city/locality
// names are used as geography only; every builder, project, listing, price and person is fictional.
import type {
  Builder, City, Furnishing, Listing, Locality, NearbyPlace, PostedBy, Project,
  ProjectStatus, PropertyType, UnitConfig,
} from '../src/data/types.ts';

type SeedProject = Omit<Project, 'priceMin' | 'priceMax' | 'bhkLabel'> & { units: UnitConfig[] };
type SeedListing = Omit<Listing, 'postedAt' | 'projectName' | 'projectSlug' | 'status' | 'photos' | 'description' | 'managed' | 'depositMonths' | 'availableFrom' | 'pg'> & { postedDaysAgo: number };

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

// Navi Mumbai: hand-written like Lucknow. Real place names and coordinates; prices, people and descriptions are
// fictional. Stamp duty 7% matches Thane (same Maharashtra rate with the metro cess).
const naviMumbai: City = { slug: 'navi-mumbai', name: 'Navi Mumbai', state: 'Maharashtra', stampDutyPct: 7, lat: 19.0330, lng: 73.0297 };
const naviMumbaiLocalities: Locality[] = [
  { slug: 'vashi', name: 'Vashi', citySlug: 'navi-mumbai', ratePerSqft: 18000, rentPerSqft: 40, yoyGrowthPct: 7.4, lat: 19.0771, lng: 72.9986 },
  { slug: 'nerul', name: 'Nerul', citySlug: 'navi-mumbai', ratePerSqft: 16000, rentPerSqft: 36, yoyGrowthPct: 6.9, lat: 19.0330, lng: 73.0197 },
  { slug: 'cbd-belapur', name: 'CBD Belapur', citySlug: 'navi-mumbai', ratePerSqft: 14500, rentPerSqft: 32, yoyGrowthPct: 8.1, lat: 19.0186, lng: 73.0390 },
  { slug: 'kharghar', name: 'Kharghar', citySlug: 'navi-mumbai', ratePerSqft: 12500, rentPerSqft: 28, yoyGrowthPct: 10.2, lat: 19.0473, lng: 73.0699 },
  { slug: 'panvel', name: 'Panvel', citySlug: 'navi-mumbai', ratePerSqft: 8500, rentPerSqft: 20, yoyGrowthPct: 13.6, lat: 18.9894, lng: 73.1175 },
];

export const cities: City[] = [...generatedCities, lucknow, naviMumbai];

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
), ...lucknowLocalities, ...naviMumbaiLocalities];

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

/**
 * Hand-written sample projects (Lucknow), appended after the generated ones (ids 1031–1033) with existing
 * fictional builders. Unit prices use the same formula as generated projects; the RERA numbers are marked
 * DEMO. Map positions come from the locality, as for every project.
 */
const lucknowUnits = (rate: number, units: [number, number][]): UnitConfig[] =>
  units.map(([bhk, carpet]) => ({ bhk, label: `${bhk} BHK Apartment`, carpetSqft: carpet, price: priceFor(carpet * 1.3, rate) }));
const lucknowTrend = (rate: number, startPct: number) =>
  Array.from({ length: 8 }, (_, i) => ({ label: `${['Q1', 'Q2', 'Q3', 'Q4'][i % 4]} ${2025 + Math.floor(i / 4)}`, rate: roundTo(rate * (startPct + ((1 - startPct) * i) / 7), 10) }));
const lucknowNearby = (locality: string, km: [number, number, number, number, number, number, number]): NearbyPlace[] => [
  { kind: 'School', name: 'Greenfield Public School', km: km[0] }, { kind: 'Hospital', name: 'Lifeline Multispeciality', km: km[1] },
  { kind: 'Metro', name: `${locality} Metro Station`, km: km[2] }, { kind: 'Mall', name: 'Central Square Mall', km: km[3] },
  { kind: 'Office Hub', name: 'Business District', km: km[4] }, { kind: 'Airport', name: 'Lucknow International Airport', km: km[5] },
  { kind: 'Railway', name: `${locality} Railway Station`, km: km[6] },
];
export const extraProjects: SeedProject[] = [
  {
    id: 1031, slug: 'ganga-gomti-heights-gomti-nagar', name: 'Ganga Gomti Heights', citySlug: 'lucknow', localitySlug: 'gomti-nagar',
    builderSlug: 'ganga-infra', status: 'Under Construction', possession: 'Dec 2027', rera: 'UPRERA-DEMO-LKO-1031',
    landAcres: 6.5, totalUnits: 420, towers: 4, floors: 22, ratePerSqft: 9300,
    units: lucknowUnits(9300, [[2, 720], [2, 810], [3, 1050], [3, 1180]]),
    amenities: ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Power Backup', '24x7 Security', 'CCTV Surveillance', 'Lift', 'Covered Parking', 'Landscaped Gardens', 'EV Charging'],
    highlights: ['Gomti Nagar address close to the Business District', '70% open space with landscaped central greens', '2, 3 BHK homes designed for cross-ventilation', 'Construction-linked payment plan available'],
    priceTrend: lucknowTrend(9300, 0.82), nearby: lucknowNearby('Gomti Nagar', [0.8, 1.6, 1.2, 2.1, 3.4, 18.5, 4.2]), hue: 200, launchedYear: 2024,
  },
  {
    id: 1032, slug: 'meridian-golf-vista-sushant-golf-city', name: 'Meridian Golf Vista', citySlug: 'lucknow', localitySlug: 'sushant-golf-city',
    builderSlug: 'meridian-spaces', status: 'New Launch', possession: 'Mar 2030', rera: 'UPRERA-DEMO-LKO-1032',
    landAcres: 11.2, totalUnits: 640, towers: 6, floors: 28, ratePerSqft: 6800,
    units: lucknowUnits(6800, [[2, 690], [2, 760], [3, 1020], [3, 1140]]),
    amenities: ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Yoga Deck', 'Badminton Court', 'Tennis Court', 'Power Backup', '24x7 Security', 'Lift', 'Covered Parking', 'Senior Citizen Zone', 'Pet Park'],
    highlights: ['Sushant Golf City address with quick access to the Business District', '75% open space with landscaped central greens', '2, 3 BHK homes designed for cross-ventilation', 'Construction-linked payment plan available'],
    priceTrend: lucknowTrend(6800, 0.85), nearby: lucknowNearby('Sushant Golf City', [1.1, 2.4, 2.8, 3.0, 5.6, 9.5, 6.1]), hue: 207, launchedYear: 2026,
  },
  {
    id: 1033, slug: 'vistaar-awadh-residency-indira-nagar', name: 'Vistaar Awadh Residency', citySlug: 'lucknow', localitySlug: 'indira-nagar',
    builderSlug: 'vistaar-homes', status: 'Ready to Move', possession: 'Oct 2023', rera: 'UPRERA-DEMO-LKO-1033',
    landAcres: 3.8, totalUnits: 260, towers: 3, floors: 14, ratePerSqft: 7600,
    units: lucknowUnits(7600, [[2, 700], [2, 780], [3, 1010], [3, 1120]]),
    amenities: ['Gymnasium', 'Clubhouse', 'Kids Play Area', 'Multipurpose Hall', 'Landscaped Gardens', 'Power Backup', '24x7 Security', 'CCTV Surveillance', 'Lift', 'Covered Parking', 'Rainwater Harvesting'],
    highlights: ['Indira Nagar address close to the metro', '65% open space with landscaped central greens', '2, 3 BHK homes designed for cross-ventilation', 'Occupancy certificate received — move in now'],
    priceTrend: lucknowTrend(7600, 0.78), nearby: lucknowNearby('Indira Nagar', [0.6, 1.4, 0.9, 1.8, 4.0, 14.2, 5.0]), hue: 214, launchedYear: 2019,
  },
];

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
/**
 * Hand-written PG / co-living listings (migration 0012), appended after the Lucknow ones in their own insert so
 * every earlier row stays the same. Existing localities; prices are monthly rent per bed; people are fictional.
 */
export const pgListings: (SeedListing & { description: string; pg: NonNullable<Listing['pg']> })[] = [
  {
    id: 50805, purpose: 'rent', segment: 'residential', type: 'PG', bhk: 0, bathrooms: 1, areaSqft: 160, price: 14000,
    citySlug: 'bengaluru', localitySlug: 'koramangala', projectId: null, furnishing: 'Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 2, totalFloors: 4, facing: 'East', ageYears: 6,
    amenities: ['Wi-Fi', 'Housekeeping', 'Laundry', 'Power Backup', '24x7 Security', 'CCTV Surveillance'], postedDaysAgo: 2,
    contactName: 'Lakshmi Rao', verified: true, hue: 330,
    pg: { sharing: 'double', for: 'women', food: true },
    description: 'Women-only PG in a quiet Koramangala street with double-sharing rooms, attached bathrooms, three home-style meals a day and weekly housekeeping.',
  },
  {
    id: 50806, purpose: 'rent', segment: 'residential', type: 'PG', bhk: 0, bathrooms: 1, areaSqft: 220, price: 8500,
    citySlug: 'pune', localitySlug: 'hinjewadi', projectId: null, furnishing: 'Furnished', postedBy: 'Agent',
    possession: 'Ready to Move', floor: 1, totalFloors: 3, facing: 'North', ageYears: 4,
    amenities: ['Wi-Fi', 'Housekeeping', 'Power Backup', 'Covered Parking'], postedDaysAgo: 6,
    contactName: 'Rohan Kulkarni', verified: true, hue: 40,
    pg: { sharing: 'triple', for: 'men', food: true },
    description: 'Triple-sharing PG for men a short ride from the Hinjewadi IT parks. Breakfast and dinner included, two-wheeler parking and daily cleaning.',
  },
  {
    id: 50807, purpose: 'rent', segment: 'residential', type: 'PG', bhk: 0, bathrooms: 1, areaSqft: 140, price: 22000,
    citySlug: 'mumbai', localitySlug: 'powai', projectId: null, furnishing: 'Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 5, totalFloors: 12, facing: 'West', ageYears: 3,
    amenities: ['Wi-Fi', 'Housekeeping', 'Laundry', 'Lift', 'Gymnasium', '24x7 Security'], postedDaysAgo: 4,
    contactName: 'Kabir Shah', verified: false, hue: 260,
    pg: { sharing: 'single', for: 'any', food: false },
    description: 'Private single rooms in a co-living flat near Powai lake: shared kitchen and lounge, fast Wi-Fi, a gym in the building and weekly cleaning. Open to everyone.',
  },
];

/**
 * Hand-written Navi Mumbai projects (ids 1034–1036) and listings (ids 50808–50811), kept in their own arrays and
 * inserts, after Lucknow and the PGs, so every earlier row (and the random stream for Lucknow's transactions and
 * reviews) stays the same. Existing fictional builders; RERA numbers are marked DEMO.
 */
const naviMumbaiNearby = (locality: string, km: [number, number, number, number, number, number, number]): NearbyPlace[] => [
  { kind: 'School', name: 'Greenfield Public School', km: km[0] }, { kind: 'Hospital', name: 'Lifeline Multispeciality', km: km[1] },
  { kind: 'Metro', name: `${locality} Metro Station`, km: km[2] }, { kind: 'Mall', name: 'Central Square Mall', km: km[3] },
  { kind: 'Office Hub', name: 'Business District', km: km[4] }, { kind: 'Airport', name: 'Navi Mumbai International Airport', km: km[5] },
  { kind: 'Railway', name: `${locality} Railway Station`, km: km[6] },
];
export const naviMumbaiProjects: SeedProject[] = [
  {
    id: 1034, slug: 'sahyadri-skyline-kharghar', name: 'Sahyadri Skyline', citySlug: 'navi-mumbai', localitySlug: 'kharghar',
    builderSlug: 'sahyadri-constructions', status: 'Under Construction', possession: 'Jun 2028', rera: 'MAHARERA-DEMO-NM-1034',
    landAcres: 5.2, totalUnits: 380, towers: 3, floors: 26, ratePerSqft: 13200,
    units: lucknowUnits(13200, [[1, 450], [2, 640], [2, 700], [3, 980]]),
    amenities: ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Power Backup', '24x7 Security', 'CCTV Surveillance', 'Lift', 'Covered Parking', 'Landscaped Gardens'],
    highlights: ['Kharghar address close to the Central Park and golf course', '60% open space with landscaped podium greens', '1, 2, 3 BHK homes designed for cross-ventilation', 'Construction-linked payment plan available'],
    priceTrend: lucknowTrend(13200, 0.84), nearby: naviMumbaiNearby('Kharghar', [0.7, 1.8, 1.1, 2.4, 4.5, 9.0, 1.6]), hue: 190, launchedYear: 2025,
  },
  {
    id: 1035, slug: 'meridian-bayview-vashi', name: 'Meridian Bayview', citySlug: 'navi-mumbai', localitySlug: 'vashi',
    builderSlug: 'meridian-spaces', status: 'Ready to Move', possession: 'Mar 2024', rera: 'MAHARERA-DEMO-NM-1035',
    landAcres: 3.4, totalUnits: 240, towers: 2, floors: 20, ratePerSqft: 18800,
    units: lucknowUnits(18800, [[2, 680], [2, 750], [3, 1050], [3, 1200]]),
    amenities: ['Gymnasium', 'Clubhouse', 'Kids Play Area', 'Multipurpose Hall', 'Landscaped Gardens', 'Power Backup', '24x7 Security', 'CCTV Surveillance', 'Lift', 'Covered Parking', 'Rainwater Harvesting'],
    highlights: ['Vashi address a short walk from the station and malls', 'Bay-facing upper floors', '2, 3 BHK homes designed for cross-ventilation', 'Occupancy certificate received — move in now'],
    priceTrend: lucknowTrend(18800, 0.8), nearby: naviMumbaiNearby('Vashi', [0.5, 1.2, 2.0, 0.8, 1.9, 21.0, 0.9]), hue: 222, launchedYear: 2020,
  },
  {
    id: 1036, slug: 'aravalli-greens-panvel', name: 'Aravalli Greens', citySlug: 'navi-mumbai', localitySlug: 'panvel',
    builderSlug: 'aravalli-habitat', status: 'New Launch', possession: 'Dec 2030', rera: 'MAHARERA-DEMO-NM-1036',
    landAcres: 9.8, totalUnits: 560, towers: 5, floors: 24, ratePerSqft: 8900,
    units: lucknowUnits(8900, [[1, 420], [2, 610], [2, 690], [3, 920]]),
    amenities: ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Yoga Deck', 'Badminton Court', 'Power Backup', '24x7 Security', 'Lift', 'Covered Parking', 'Pet Park'],
    highlights: ['Panvel address near the upcoming airport', '72% open space with landscaped central greens', '1, 2, 3 BHK homes designed for cross-ventilation', 'Construction-linked payment plan available'],
    priceTrend: lucknowTrend(8900, 0.86), nearby: naviMumbaiNearby('Panvel', [1.0, 2.2, 3.5, 2.8, 6.0, 7.5, 1.4]), hue: 168, launchedYear: 2026,
  },
];
export const naviMumbaiListings: (SeedListing & { description: string })[] = [
  {
    id: 50808, purpose: 'buy', segment: 'residential', type: 'Apartment', bhk: 2, bathrooms: 2, areaSqft: 1050, price: 18500000,
    citySlug: 'navi-mumbai', localitySlug: 'vashi', projectId: null, furnishing: 'Semi-Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 8, totalFloors: 15, facing: 'West', ageYears: 6,
    amenities: ['Lift', 'Power Backup', 'Covered Parking', '24x7 Security', 'Gymnasium'], postedDaysAgo: 3,
    contactName: 'Neha Patil', verified: true, hue: 210,
    description: 'Well-kept 2 BHK in Sector 17, Vashi, a few minutes from the station and malls. Two balconies, modular kitchen and one covered parking.',
  },
  {
    id: 50809, purpose: 'buy', segment: 'residential', type: 'Apartment', bhk: 3, bathrooms: 3, areaSqft: 1400, price: 17000000,
    citySlug: 'navi-mumbai', localitySlug: 'kharghar', projectId: null, furnishing: 'Unfurnished', postedBy: 'Agent',
    possession: 'Ready to Move', floor: 11, totalFloors: 22, facing: 'North-East', ageYears: 3,
    amenities: ['Lift', 'Power Backup', 'Swimming Pool', 'Clubhouse', 'Covered Parking', 'Kids Play Area'], postedDaysAgo: 7,
    contactName: 'Sameer Joshi', verified: true, hue: 185,
    description: 'Spacious 3 BHK with hill views in a gated Kharghar complex, close to Central Park, schools and the metro.',
  },
  {
    id: 50810, purpose: 'rent', segment: 'residential', type: 'Apartment', bhk: 2, bathrooms: 2, areaSqft: 950, price: 34000,
    citySlug: 'navi-mumbai', localitySlug: 'nerul', projectId: null, furnishing: 'Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 4, totalFloors: 7, facing: 'East', ageYears: 9,
    amenities: ['Lift', 'Power Backup', '24x7 Security'], postedDaysAgo: 2,
    contactName: 'Farhan Shaikh', verified: false, hue: 240,
    description: 'Furnished 2 BHK in Nerul West, walking distance from the station and the lake. Suits a family or two working professionals.',
  },
  {
    id: 50811, purpose: 'rent', segment: 'residential', type: 'Apartment', bhk: 1, bathrooms: 1, areaSqft: 600, price: 19000,
    citySlug: 'navi-mumbai', localitySlug: 'cbd-belapur', projectId: null, furnishing: 'Semi-Furnished', postedBy: 'Owner',
    possession: 'Ready to Move', floor: 2, totalFloors: 5, facing: 'South', ageYears: 11,
    amenities: ['Power Backup', 'Covered Parking'], postedDaysAgo: 10,
    contactName: 'Priya Naik', verified: true, hue: 150,
    description: 'Compact 1 BHK near the CBD Belapur offices and station, in a quiet society with two-wheeler parking.',
  },
];
