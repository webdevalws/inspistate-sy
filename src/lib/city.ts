// The visitor's current city: the city in the URL, else the one picked in the header's city picker
// (remembered in the `is_city` cookie), else the first city. Used by the header menus, the footer's
// city links and the home search box so they all follow the picker.
import type { AstroCookies } from 'astro';

export const CITY_COOKIE = 'is_city';

export function currentCity<C extends { slug: string }>(url: URL, cookies: AstroCookies, cities: C[]): C {
  const inUrl = cities.find((c) => url.pathname.split('/').includes(c.slug));
  const picked = cookies.get(CITY_COOKIE)?.value;
  return inUrl ?? cities.find((c) => c.slug === picked) ?? cities[0];
}
