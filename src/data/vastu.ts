// Vastu rules, direction maths and remedies. Shared by the analyzer UI and the detection API.
// Method mirrors the reference flow (see docs/functions/vastu/desc.md); the rating table is our own,
// written from commonly followed Vastu Shastra guidance.

export const DIRECTIONS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Rating = 'Best' | 'Good' | 'Poor' | 'Danger';
export const RATING_POINTS: Record<Rating, number> = { Best: 3, Good: 2, Poor: 1, Danger: 0 };

type Row = [Rating, Rating, Rating, Rating, Rating, Rating, Rating, Rating]; // N, NE, E, SE, S, SW, W, NW

export const ROOMS: Record<string, { label: string; ratings: Row; remedy: string }> = {
  main_entrance: { label: 'Main Entrance', ratings: ['Best', 'Best', 'Best', 'Poor', 'Poor', 'Danger', 'Good', 'Good'], remedy: 'Keep the entrance well lit and clutter-free; a brass or copper Vastu strip across the threshold and an auspicious nameplate are commonly used corrections.' },
  living_room: { label: 'Living Room', ratings: ['Best', 'Good', 'Best', 'Poor', 'Poor', 'Poor', 'Good', 'Good'], remedy: 'Place heavy furniture along the south or west walls and keep the north-east corner open and bright.' },
  kitchen: { label: 'Kitchen', ratings: ['Poor', 'Danger', 'Good', 'Best', 'Good', 'Poor', 'Poor', 'Best'], remedy: 'Position the stove so the cook faces east, keep the sink and stove apart, and use warm colours such as orange or red in the kitchen.' },
  master_bedroom: { label: 'Master Bedroom', ratings: ['Good', 'Poor', 'Poor', 'Poor', 'Good', 'Best', 'Good', 'Good'], remedy: 'Place the bed so you sleep with your head towards south or east; avoid mirrors facing the bed and keep earthy tones.' },
  bedroom: { label: 'Bedroom', ratings: ['Good', 'Poor', 'Good', 'Poor', 'Good', 'Best', 'Good', 'Good'], remedy: 'Sleep with your head towards south or east and keep the room uncluttered with soft, light colours.' },
  kids_room: { label: 'Kids Room', ratings: ['Good', 'Good', 'Best', 'Poor', 'Poor', 'Poor', 'Best', 'Good'], remedy: 'Place the study desk facing east or north and use cheerful light colours; avoid heavy storage in the north-east.' },
  guest_room: { label: 'Guest Room', ratings: ['Good', 'Poor', 'Good', 'Poor', 'Good', 'Poor', 'Good', 'Best'], remedy: 'Keep the room light and airy; a north-west guest room is ideal, otherwise keep it simply furnished.' },
  pooja_room: { label: 'Pooja Room', ratings: ['Good', 'Best', 'Good', 'Poor', 'Poor', 'Poor', 'Good', 'Poor'], remedy: 'Face east or north while praying, keep idols off the floor, and avoid placing the pooja area against a toilet wall.' },
  dining_room: { label: 'Dining Room', ratings: ['Good', 'Poor', 'Good', 'Good', 'Poor', 'Poor', 'Best', 'Good'], remedy: 'Use a square or rectangular table and seat the head of the family facing east.' },
  toilet: { label: 'Toilet / Bathroom', ratings: ['Poor', 'Danger', 'Poor', 'Poor', 'Good', 'Danger', 'Good', 'Best'], remedy: 'Keep the door closed and the space dry; good ventilation, an exhaust fan and sea salt in a bowl are common corrections.' },
  staircase: { label: 'Staircase', ratings: ['Poor', 'Danger', 'Poor', 'Good', 'Best', 'Best', 'Best', 'Good'], remedy: 'Stairs should turn clockwise while going up; avoid storage of valuables under the staircase.' },
  study: { label: 'Study', ratings: ['Good', 'Best', 'Best', 'Poor', 'Poor', 'Poor', 'Good', 'Poor'], remedy: 'Sit facing east or north while studying and keep the desk free of clutter.' },
  home_office: { label: 'Home Office', ratings: ['Best', 'Good', 'Good', 'Poor', 'Poor', 'Poor', 'Good', 'Poor'], remedy: 'Face north or east while working and keep the back supported by a solid wall.' },
  balcony: { label: 'Balcony', ratings: ['Best', 'Best', 'Best', 'Poor', 'Poor', 'Poor', 'Poor', 'Good'], remedy: 'Keep balconies in the south or west lightly used; place potted plants in the north or east instead of heavy items.' },
  store_room: { label: 'Store Room', ratings: ['Poor', 'Danger', 'Poor', 'Poor', 'Good', 'Best', 'Good', 'Good'], remedy: 'Store heavy items along the south and west walls and keep the store well organised.' },
  utility: { label: 'Utility / Wash Area', ratings: ['Poor', 'Danger', 'Poor', 'Good', 'Poor', 'Poor', 'Good', 'Best'], remedy: 'Keep drains flowing towards north or east and the area dry and ventilated.' },
  servant_room: { label: 'Servant Room', ratings: ['Poor', 'Danger', 'Poor', 'Good', 'Good', 'Poor', 'Good', 'Best'], remedy: 'A north-west or south-east servant room is preferred; keep it ventilated and well lit.' },
  garage: { label: 'Parking / Garage', ratings: ['Good', 'Poor', 'Good', 'Good', 'Poor', 'Poor', 'Poor', 'Best'], remedy: 'Park vehicles facing north or east and keep the garage clean and well lit.' },
  overhead_tank: { label: 'Overhead Water Tank', ratings: ['Poor', 'Danger', 'Poor', 'Poor', 'Good', 'Best', 'Good', 'Poor'], remedy: 'If the tank cannot move, keep it raised on a platform and avoid leaks.' },
  underground_tank: { label: 'Underground Tank / Sump', ratings: ['Good', 'Best', 'Good', 'Danger', 'Poor', 'Danger', 'Poor', 'Poor'], remedy: 'Ensure there are no leaks and keep the cover closed; the north-east is the preferred location.' },
};
export type RoomType = keyof typeof ROOMS;
export const ROOM_TYPES = Object.keys(ROOMS) as RoomType[];

/**
 * Compass direction of a point relative to the home's centre.
 * Points are normalised (0–1) image coordinates; `northRotation` is the clockwise angle (degrees)
 * from the image's "up" to true North. 8 sectors of 45°, each centred on its direction.
 */
export function directionOf(point: { x: number; y: number }, center: { x: number; y: number }, northRotation: number, aspect = 1): Direction | 'Centre' {
  const dx = (point.x - center.x) * aspect;
  const dy = point.y - center.y;
  if (Math.hypot(dx, dy) < 0.01) return 'Centre';
  const angleFromUp = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const bearing = (((angleFromUp - northRotation) % 360) + 360) % 360;
  return DIRECTIONS[Math.floor(((bearing + 22.5) % 360) / 45)];
}

export function ratingFor(type: RoomType, dir: Direction | 'Centre'): Rating | null {
  if (dir === 'Centre') return null;
  return ROOMS[type].ratings[DIRECTIONS.indexOf(dir)];
}

export function bestDirections(type: RoomType): Direction[] {
  return DIRECTIONS.filter((_, i) => ROOMS[type].ratings[i] === 'Best');
}

export interface RoomPoint { id: string; type: RoomType; x: number; y: number }

export function vastuReport(points: RoomPoint[], center: { x: number; y: number }, northRotation: number, aspect = 1) {
  const rows = points.map((p) => {
    const direction = directionOf(p, center, northRotation, aspect);
    const rating = ratingFor(p.type, direction);
    return { ...p, label: ROOMS[p.type].label, direction, rating, best: bestDirections(p.type) };
  });
  const scored = rows.filter((r) => r.rating);
  const score = scored.length ? Math.round((scored.reduce((s, r) => s + RATING_POINTS[r.rating!], 0) / (3 * scored.length)) * 100) : 0;
  const verdict = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Needs attention' : 'Major corrections advised';
  return { rows, score, verdict, issues: rows.filter((r) => r.rating === 'Poor' || r.rating === 'Danger') };
}
