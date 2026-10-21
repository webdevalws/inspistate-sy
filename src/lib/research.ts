// Research reports computed from InspiState's own locality and listing data. See docs/functions/research-reports/desc.md.
import { getRefs } from './repo';
import { emi } from '../components/islands/EmiCalculator';

export interface Bar { label: string; value: number; display: string; href?: string }
export interface ReportSection { heading: string; text: string; bars?: Bar[]; table?: { head: string[]; rows: (string | number)[][] } }
export interface Report { slug: string; title: string; category: 'National' | 'City'; summary: string; keyStat: string; sections: ReportSection[]; citySlug?: string }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const lakh = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : `₹${(n / 1e5).toFixed(1)} L`);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export async function buildReports(): Promise<Report[]> {
  const refs = await getRefs();
  const cities = refs.cities.map((c) => {
    const locs = refs.localitiesOf(c.slug);
    const rate = avg(locs.map((l) => l.ratePerSqft));
    const rent = avg(locs.map((l) => l.rentPerSqft));
    return { ...c, locs, rate, rent, yoy: avg(locs.map((l) => l.yoyGrowthPct)), yld: rate ? (rent * 12 * 100) / rate : 0 };
  }).filter((c) => c.locs.length);
  const allLocs = cities.flatMap((c) => c.locs.map((l) => ({ ...l, city: c.name, yld: (l.rentPerSqft * 12 * 100) / l.ratePerSqft })));
  const byRate = [...cities].sort((a, b) => b.rate - a.rate);
  const twoBhk = (c: (typeof cities)[number]) => c.rate * 1000;
  const reports: Report[] = [
    {
      slug: 'india-price-index', title: 'India Residential Price Index', category: 'National',
      summary: `Average asking prices across ${cities.length} cities, from ${inr(byRate[byRate.length - 1].rate)}/sq ft in ${byRate[byRate.length - 1].name} to ${inr(byRate[0].rate)}/sq ft in ${byRate[0].name}.`,
      keyStat: `${pct(avg(cities.map((c) => c.yoy)))} average YoY growth`,
      sections: [
        { heading: 'Average price per sq ft by city', text: 'Simple average of locality asking rates on InspiState.', bars: byRate.map((c) => ({ label: c.name, value: c.rate, display: inr(c.rate), href: `/research/city-${c.slug}` })) },
        { heading: 'Year-on-year price growth', text: 'Average of locality growth rates over the last 12 months.', bars: [...cities].sort((a, b) => b.yoy - a.yoy).map((c) => ({ label: c.name, value: c.yoy, display: pct(c.yoy) })) },
      ],
    },
    {
      slug: 'rental-yield-report', title: 'Rental Yield Report', category: 'National',
      summary: 'Where renting out a home earns the most: annual rent as a percentage of purchase price, by city and locality.',
      keyStat: `Top locality yield ${pct(Math.max(...allLocs.map((l) => l.yld)))}`,
      sections: [
        { heading: 'Gross rental yield by city', text: 'Annual rent ÷ purchase price, using locality averages. Yields below 3% usually favour renting over buying.', bars: [...cities].sort((a, b) => b.yld - a.yld).map((c) => ({ label: c.name, value: c.yld, display: pct(c.yld) })) },
        { heading: 'Ten highest-yield localities', text: 'Best places in our data to buy a home to rent out.', table: { head: ['Locality', 'City', 'Price / sq ft', 'Rent / sq ft', 'Yield'], rows: [...allLocs].sort((a, b) => b.yld - a.yld).slice(0, 10).map((l) => [l.name, l.city, inr(l.ratePerSqft), `₹${l.rentPerSqft}`, pct(l.yld)]) } },
      ],
    },
    {
      slug: 'fastest-growing-localities', title: 'Fastest-Growing Localities', category: 'National',
      summary: 'The micro-markets where prices rose most in the last year — and what a 1,000 sq ft home costs there now.',
      keyStat: `Up to ${pct(Math.max(...allLocs.map((l) => l.yoyGrowthPct)))} YoY`,
      sections: [{ heading: 'Top 12 by year-on-year growth', text: 'Growth in average asking price per sq ft over 12 months.', bars: [...allLocs].sort((a, b) => b.yoyGrowthPct - a.yoyGrowthPct).slice(0, 12).map((l) => ({ label: `${l.name}, ${l.city}`, value: l.yoyGrowthPct, display: pct(l.yoyGrowthPct) })) }],
    },
    {
      slug: 'cost-of-a-2bhk', title: 'What a 2BHK Costs Across India', category: 'National',
      summary: 'Price, EMI and the income needed to afford a typical 1,000 sq ft 2BHK in each city.',
      keyStat: `${lakh(Math.min(...cities.map(twoBhk)))} – ${lakh(Math.max(...cities.map(twoBhk)))}`,
      sections: [{
        heading: 'Price, EMI and income needed', text: 'Assumes 20% down payment, 8.5% interest for 20 years and an EMI of no more than 40% of net income.',
        table: { head: ['City', 'Price (1,000 sq ft)', 'Monthly EMI', 'Income needed / month'], rows: [...cities].sort((a, b) => twoBhk(b) - twoBhk(a)).map((c) => { const e = emi(twoBhk(c) * 0.8, 8.5, 20); return [c.name, lakh(twoBhk(c)), inr(e), inr(e / 0.4)]; }) },
      }],
    },
    ...cities.map((c): Report => {
      const sorted = [...c.locs].sort((a, b) => b.ratePerSqft - a.ratePerSqft);
      return {
        slug: `city-${c.slug}`, title: `${c.name} Property Market Report`, category: 'City', citySlug: c.slug,
        summary: `${c.name} averages ${inr(c.rate)}/sq ft with ${pct(c.yoy)} growth over the year and a ${pct(c.yld)} rental yield across ${c.locs.length} localities.`,
        keyStat: `${inr(c.rate)}/sq ft`,
        sections: [
          { heading: 'Locality prices', text: `Average asking price per sq ft in ${c.name}.`, bars: sorted.map((l) => ({ label: l.name, value: l.ratePerSqft, display: inr(l.ratePerSqft), href: `/locality/${c.slug}/${l.slug}` })) },
          { heading: 'Growth and yield', text: 'Year-on-year price growth and gross rental yield by locality.', table: { head: ['Locality', 'Price / sq ft', 'YoY growth', 'Rent / sq ft', 'Yield', '2BHK (1,000 sq ft)'], rows: sorted.map((l) => [l.name, inr(l.ratePerSqft), pct(l.yoyGrowthPct), `₹${l.rentPerSqft}`, pct((l.rentPerSqft * 12 * 100) / l.ratePerSqft), lakh(l.ratePerSqft * 1000)]) } },
        ],
      };
    }),
  ];
  return reports;
}
