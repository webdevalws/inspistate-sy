export const amenityGroups: Record<string, string[]> = {
  'Sports & Fitness': ['Swimming Pool', 'Gymnasium', 'Jogging Track', 'Yoga Deck', 'Badminton Court', 'Tennis Court', 'Indoor Games'],
  'Leisure & Community': ['Clubhouse', 'Kids Play Area', 'Multipurpose Hall', 'Landscaped Gardens', 'Amphitheatre', 'Cafeteria', 'Co-working Lounge', 'Pet Park', 'Senior Citizen Zone'],
  'Safety & Convenience': ['24x7 Security', 'CCTV Surveillance', 'Lift', 'Power Backup', 'Covered Parking', 'EV Charging'],
  Environment: ['Rainwater Harvesting', 'Sewage Treatment Plant'],
};

export const ALL_AMENITIES = Object.values(amenityGroups).flat();
