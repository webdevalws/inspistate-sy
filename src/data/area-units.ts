// Land and floor area units, expressed in square feet. Regional units are listed under the regions
// where they are used. Traditional units vary by district — values are commonly used averages.
// See docs/functions/area-converter/desc.md.

export interface AreaUnit { id: string; name: string; sqft: number; regions: string[]; note?: string }

const ALL = ['India (General)'];
export const AREA_UNITS: AreaUnit[] = [
  { id: 'sqft', name: 'Square Feet', sqft: 1, regions: ALL },
  { id: 'sqm', name: 'Square Meter', sqft: 10.7639104, regions: ALL },
  { id: 'sqyd', name: 'Square Yard (Gaj)', sqft: 9, regions: ALL },
  { id: 'sqin', name: 'Square Inch', sqft: 1 / 144, regions: ALL },
  { id: 'sqcm', name: 'Square Centimeter', sqft: 0.00107639104, regions: ALL },
  { id: 'sqkm', name: 'Square Kilometer', sqft: 10763910.4, regions: ALL },
  { id: 'sqmi', name: 'Square Mile', sqft: 27878400, regions: ALL },
  { id: 'acre', name: 'Acre', sqft: 43560, regions: ALL },
  { id: 'hectare', name: 'Hectare', sqft: 107639.104, regions: ALL },
  { id: 'are', name: 'Are', sqft: 1076.39104, regions: ALL },
  { id: 'centiare', name: 'Centiare', sqft: 10.7639104, regions: ALL },
  { id: 'cent', name: 'Cent', sqft: 435.6, regions: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Odisha'] },
  { id: 'decimal', name: 'Decimal / Shatak', sqft: 435.6, regions: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam'] },
  { id: 'guntha', name: 'Guntha', sqft: 1089, regions: ['Maharashtra', 'Karnataka', 'Gujarat', 'Telangana', 'Andhra Pradesh'] },
  { id: 'ground', name: 'Ground', sqft: 2400, regions: ['Tamil Nadu'] },
  { id: 'ankanam', name: 'Ankanam', sqft: 72, regions: ['Andhra Pradesh', 'Telangana'] },
  { id: 'kuncham', name: 'Kuncham', sqft: 4356, regions: ['Andhra Pradesh', 'Telangana'] },
  { id: 'perch', name: 'Perch', sqft: 272.25, regions: ['Kerala', 'Tamil Nadu'] },
  { id: 'rood', name: 'Rood', sqft: 10890, regions: ['Kerala', 'Tamil Nadu'] },
  { id: 'marla', name: 'Marla', sqft: 272.25, regions: ['Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir'] },
  { id: 'kanal', name: 'Kanal', sqft: 5445, regions: ['Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir'] },
  { id: 'sarsahi', name: 'Sarsahi (Square Karam)', sqft: 30.25, regions: ['Punjab', 'Haryana'] },
  { id: 'ghumaon', name: 'Ghumaon', sqft: 43560, regions: ['Punjab', 'Haryana'] },
  { id: 'murabba', name: 'Murabba', sqft: 1089000, regions: ['Punjab', 'Haryana'], note: '25 acres' },
  { id: 'killa', name: 'Killa', sqft: 43560, regions: ['Punjab', 'Haryana'] },
  { id: 'bigha-up', name: 'Bigha (Uttar Pradesh)', sqft: 27000, regions: ['Uttar Pradesh', 'Uttarakhand'] },
  { id: 'bigha-raj', name: 'Bigha (Rajasthan, pucca)', sqft: 27225, regions: ['Rajasthan'] },
  { id: 'bigha-raj-k', name: 'Bigha (Rajasthan, kachha)', sqft: 17424, regions: ['Rajasthan'] },
  { id: 'bigha-guj', name: 'Bigha (Gujarat)', sqft: 17427, regions: ['Gujarat'] },
  { id: 'bigha-mp', name: 'Bigha (Madhya Pradesh)', sqft: 12000, regions: ['Madhya Pradesh'] },
  { id: 'bigha-bihar', name: 'Bigha (Bihar)', sqft: 27220, regions: ['Bihar', 'Jharkhand'] },
  { id: 'bigha-wb', name: 'Bigha (West Bengal)', sqft: 14400, regions: ['West Bengal'] },
  { id: 'bigha-assam', name: 'Bigha (Assam)', sqft: 14400, regions: ['Assam'] },
  { id: 'biswa-up', name: 'Biswa (Uttar Pradesh)', sqft: 1350, regions: ['Uttar Pradesh', 'Uttarakhand'] },
  { id: 'biswa-raj', name: 'Biswa (Rajasthan)', sqft: 1361.25, regions: ['Rajasthan'] },
  { id: 'kattha-wb', name: 'Kattha (West Bengal)', sqft: 720, regions: ['West Bengal'] },
  { id: 'kattha-bihar', name: 'Kattha (Bihar)', sqft: 1361, regions: ['Bihar', 'Jharkhand'] },
  { id: 'kattha-assam', name: 'Kattha (Assam)', sqft: 2880, regions: ['Assam'] },
  { id: 'lecha', name: 'Lecha', sqft: 144, regions: ['Assam'] },
  { id: 'chatak', name: 'Chatak', sqft: 45, regions: ['West Bengal'] },
  { id: 'dhur-bihar', name: 'Dhur (Bihar)', sqft: 68.06, regions: ['Bihar'] },
  { id: 'dhur-jh', name: 'Dhur (Jharkhand)', sqft: 75.6, regions: ['Jharkhand'] },
  { id: 'kachwansi', name: 'Kachwansi', sqft: 68.06, regions: ['Bihar'] },
];

export const REGIONS = ['India (General)', ...[...new Set(AREA_UNITS.flatMap((u) => u.regions))].filter((r) => r !== 'India (General)').sort()];

/** Units available for a region: the general units plus that region's traditional units. */
export const unitsFor = (region: string) => AREA_UNITS.filter((u) => u.regions.includes('India (General)') || u.regions.includes(region) || region === 'India (General)');

export function convertArea(value: number, from: AreaUnit, to: AreaUnit) {
  const v = (value * from.sqft) / to.sqft;
  return Number.isInteger(v) ? v : Number(v.toPrecision(10));
}

export const POPULAR_CONVERSIONS: [string, string][] = [['sqm', 'sqft'], ['sqyd', 'sqft'], ['acre', 'sqft'], ['hectare', 'acre'], ['cent', 'sqft'], ['guntha', 'sqft'], ['marla', 'sqft'], ['bigha-up', 'sqft']];
