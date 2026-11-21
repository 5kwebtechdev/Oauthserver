/**
 * Countries and cities behind the header's two selectors. Edit here (or replace with an API) to add
 * cities. Only these 11 countries have their own background, in assets/counselor-header/bg/<code>/.
 *
 * TODO: list all our countries here, and use the India background for any country without its own.
 * See "Country backgrounds" in the README.
 */

export interface LocationCountry {
  code: string;
  name: string;
  /** Shown on the header chip, where space is tight. */
  shortName: string;
  flag: string;
  cities: string[];
}

export interface IndianCity {
  name: string;
  lat: number;
  lng: number;
}

export const DEFAULT_COUNTRY_CODE = 'IN';
export const DEFAULT_PLACE = 'Mumbai';

/** How far a user can be from a listed city and still default to it. */
const MAX_DETECT_DISTANCE_KM = 150;

const INDIAN_CITIES: IndianCity[] = [
  { name: 'Agartala', lat: 23.83, lng: 91.28 },
  { name: 'Agra', lat: 27.18, lng: 78.01 },
  { name: 'Ahmedabad', lat: 23.02, lng: 72.57 },
  { name: 'Aizawl', lat: 23.73, lng: 92.72 },
  { name: 'Ajmer', lat: 26.45, lng: 74.64 },
  { name: 'Aligarh', lat: 27.88, lng: 78.08 },
  { name: 'Allahabad (Prayagraj)', lat: 25.44, lng: 81.85 },
  { name: 'Ambala', lat: 30.38, lng: 76.78 },
  { name: 'Amravati', lat: 20.93, lng: 77.75 },
  { name: 'Amritsar', lat: 31.63, lng: 74.87 },
  { name: 'Asansol', lat: 23.68, lng: 86.98 },
  { name: 'Aurangabad', lat: 19.88, lng: 75.34 },
  { name: 'Bangalore', lat: 12.97, lng: 77.59 },
  { name: 'Bareilly', lat: 28.37, lng: 79.43 },
  { name: 'Belgaum', lat: 15.85, lng: 74.5 },
  { name: 'Bhavnagar', lat: 21.76, lng: 72.15 },
  { name: 'Bhilai', lat: 21.21, lng: 81.38 },
  { name: 'Bhopal', lat: 23.26, lng: 77.41 },
  { name: 'Bhubaneswar', lat: 20.3, lng: 85.82 },
  { name: 'Bikaner', lat: 28.02, lng: 73.31 },
  { name: 'Bilaspur', lat: 22.08, lng: 82.15 },
  { name: 'Chandigarh', lat: 30.73, lng: 76.78 },
  { name: 'Chennai', lat: 13.08, lng: 80.27 },
  { name: 'Coimbatore', lat: 11.02, lng: 76.96 },
  { name: 'Cuttack', lat: 20.46, lng: 85.88 },
  { name: 'Dehradun', lat: 30.32, lng: 78.03 },
  { name: 'Delhi', lat: 28.61, lng: 77.21 },
  { name: 'Dhanbad', lat: 23.8, lng: 86.43 },
  { name: 'Dharwad', lat: 15.46, lng: 75.01 },
  { name: 'Durgapur', lat: 23.52, lng: 87.31 },
  { name: 'Faridabad', lat: 28.41, lng: 77.32 },
  { name: 'Gandhinagar', lat: 23.22, lng: 72.65 },
  { name: 'Gangtok', lat: 27.33, lng: 88.61 },
  { name: 'Ghaziabad', lat: 28.67, lng: 77.45 },
  { name: 'Goa (Panaji)', lat: 15.49, lng: 73.83 },
  { name: 'Gorakhpur', lat: 26.76, lng: 83.37 },
  { name: 'Gulbarga', lat: 17.33, lng: 76.83 },
  { name: 'Guntur', lat: 16.31, lng: 80.44 },
  { name: 'Gurgaon', lat: 28.46, lng: 77.03 },
  { name: 'Guwahati', lat: 26.14, lng: 91.74 },
  { name: 'Gwalior', lat: 26.22, lng: 78.18 },
  { name: 'Howrah', lat: 22.59, lng: 88.26 },
  { name: 'Hubli', lat: 15.36, lng: 75.12 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49 },
  { name: 'Imphal', lat: 24.82, lng: 93.94 },
  { name: 'Indore', lat: 22.72, lng: 75.86 },
  { name: 'Itanagar', lat: 27.08, lng: 93.61 },
  { name: 'Jabalpur', lat: 23.18, lng: 79.99 },
  { name: 'Jaipur', lat: 26.91, lng: 75.79 },
  { name: 'Jalandhar', lat: 31.33, lng: 75.58 },
  { name: 'Jammu', lat: 32.73, lng: 74.86 },
  { name: 'Jamnagar', lat: 22.47, lng: 70.06 },
  { name: 'Jamshedpur', lat: 22.8, lng: 86.2 },
  { name: 'Jodhpur', lat: 26.24, lng: 73.02 },
  { name: 'Kanpur', lat: 26.45, lng: 80.33 },
  { name: 'Kochi', lat: 9.93, lng: 76.27 },
  { name: 'Kohima', lat: 25.67, lng: 94.11 },
  { name: 'Kolhapur', lat: 16.71, lng: 74.24 },
  { name: 'Kolkata', lat: 22.57, lng: 88.36 },
  { name: 'Kota', lat: 25.21, lng: 75.86 },
  { name: 'Kozhikode', lat: 11.26, lng: 75.78 },
  { name: 'Lucknow', lat: 26.85, lng: 80.95 },
  { name: 'Ludhiana', lat: 30.9, lng: 75.86 },
  { name: 'Madurai', lat: 9.93, lng: 78.12 },
  { name: 'Mangalore', lat: 12.91, lng: 74.86 },
  { name: 'Meerut', lat: 28.98, lng: 77.71 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Mysore', lat: 12.3, lng: 76.64 },
  { name: 'Nagpur', lat: 21.15, lng: 79.09 },
  { name: 'Nashik', lat: 20.0, lng: 73.79 },
  { name: 'Navi Mumbai', lat: 19.03, lng: 73.03 },
  { name: 'Nellore', lat: 14.44, lng: 79.99 },
  { name: 'Noida', lat: 28.54, lng: 77.39 },
  { name: 'Patna', lat: 25.59, lng: 85.14 },
  { name: 'Pondicherry', lat: 11.94, lng: 79.81 },
  { name: 'Pune', lat: 18.52, lng: 73.86 },
  { name: 'Raipur', lat: 21.25, lng: 81.63 },
  { name: 'Rajkot', lat: 22.3, lng: 70.8 },
  { name: 'Ranchi', lat: 23.34, lng: 85.31 },
  { name: 'Salem', lat: 11.66, lng: 78.15 },
  { name: 'Shillong', lat: 25.58, lng: 91.89 },
  { name: 'Shimla', lat: 31.1, lng: 77.17 },
  { name: 'Siliguri', lat: 26.73, lng: 88.4 },
  { name: 'Solapur', lat: 17.66, lng: 75.91 },
  { name: 'Srinagar', lat: 34.08, lng: 74.8 },
  { name: 'Surat', lat: 21.17, lng: 72.83 },
  { name: 'Thane', lat: 19.22, lng: 72.98 },
  { name: 'Thiruvananthapuram', lat: 8.52, lng: 76.94 },
  { name: 'Thrissur', lat: 10.53, lng: 76.21 },
  { name: 'Tiruchirappalli', lat: 10.79, lng: 78.7 },
  { name: 'Udaipur', lat: 24.59, lng: 73.71 },
  { name: 'Vadodara', lat: 22.31, lng: 73.18 },
  { name: 'Varanasi', lat: 25.32, lng: 82.97 },
  { name: 'Vijayawada', lat: 16.51, lng: 80.65 },
  { name: 'Visakhapatnam', lat: 17.69, lng: 83.22 },
  { name: 'Warangal', lat: 17.97, lng: 79.59 },
];

/**
 * Display order: India first, then by number of overseas Indians, highest first. Figures are total
 * overseas Indians (PIOs + NRIs) from India's Ministry of External Affairs, as of January 2026:
 * https://www.mea.gov.in/population-of-overseas-indians.htm
 */
export const LOCATION_COUNTRIES: LocationCountry[] = [
  {
    code: 'IN',
    name: 'India',
    shortName: 'India',
    flag: '🇮🇳',
    cities: INDIAN_CITIES.map((city) => city.name),
  },
  // 6,079,221
  {
    code: 'US',
    name: 'United States',
    shortName: 'USA',
    flag: '🇺🇸',
    cities: [
      'Atlanta',
      'Austin',
      'Boston',
      'Chicago',
      'Dallas',
      'Denver',
      'Houston',
      'Las Vegas',
      'Los Angeles',
      'Miami',
      'New York',
      'Philadelphia',
      'Phoenix',
      'San Diego',
      'San Francisco',
      'San Jose',
      'Seattle',
      'Washington DC',
    ],
  },
  // 4,344,008
  {
    code: 'AE',
    name: 'United Arab Emirates',
    shortName: 'UAE',
    flag: '🇦🇪',
    cities: [
      'Abu Dhabi',
      'Ajman',
      'Al Ain',
      'Dubai',
      'Fujairah',
      'Ras Al Khaimah',
      'Sharjah',
      'Umm Al Quwain',
    ],
  },
  // 3,247,980
  {
    code: 'CA',
    name: 'Canada',
    shortName: 'Canada',
    flag: '🇨🇦',
    cities: [
      'Calgary',
      'Edmonton',
      'Halifax',
      'Hamilton',
      'Kitchener',
      'London',
      'Mississauga',
      'Montreal',
      'Ottawa',
      'Quebec City',
      'Regina',
      'Saskatoon',
      'Toronto',
      'Vancouver',
      'Victoria',
      'Winnipeg',
    ],
  },
  // 2,902,370
  {
    code: 'MY',
    name: 'Malaysia',
    shortName: 'Malaysia',
    flag: '🇲🇾',
    cities: [
      'George Town',
      'Ipoh',
      'Johor Bahru',
      'Kota Kinabalu',
      'Kuala Lumpur',
      'Kuching',
      'Malacca',
      'Petaling Jaya',
      'Putrajaya',
      'Shah Alam',
    ],
  },
  // 1,800,000
  {
    code: 'ZA',
    name: 'South Africa',
    shortName: 'South Africa',
    flag: '🇿🇦',
    cities: [
      'Bloemfontein',
      'Cape Town',
      'Durban',
      'East London',
      'Gqeberha',
      'Johannesburg',
      'Kimberley',
      'Pietermaritzburg',
      'Polokwane',
      'Pretoria',
    ],
  },
  // 1,607,500
  {
    code: 'LK',
    name: 'Sri Lanka',
    shortName: 'Sri Lanka',
    flag: '🇱🇰',
    cities: [
      'Anuradhapura',
      'Batticaloa',
      'Colombo',
      'Galle',
      'Jaffna',
      'Kandy',
      'Kurunegala',
      'Matara',
      'Negombo',
      'Nuwara Eliya',
      'Trincomalee',
    ],
  },
  // 1,282,836
  {
    code: 'GB',
    name: 'United Kingdom',
    shortName: 'UK',
    flag: '🇬🇧',
    cities: [
      'Belfast',
      'Birmingham',
      'Bristol',
      'Cardiff',
      'Edinburgh',
      'Glasgow',
      'Leeds',
      'Leicester',
      'Liverpool',
      'London',
      'Manchester',
      'Newcastle',
      'Nottingham',
      'Sheffield',
    ],
  },
  // 845,800
  {
    code: 'AU',
    name: 'Australia',
    shortName: 'Australia',
    flag: '🇦🇺',
    cities: [
      'Adelaide',
      'Brisbane',
      'Canberra',
      'Darwin',
      'Geelong',
      'Gold Coast',
      'Hobart',
      'Melbourne',
      'Newcastle',
      'Perth',
      'Sunshine Coast',
      'Sydney',
      'Wollongong',
    ],
  },
  // 483,199
  {
    code: 'SG',
    name: 'Singapore',
    shortName: 'Singapore',
    flag: '🇸🇬',
    cities: [
      'Ang Mo Kio',
      'Bedok',
      'Bukit Timah',
      'Jurong East',
      'Marina Bay',
      'Orchard',
      'Punggol',
      'Queenstown',
      'Tampines',
      'Toa Payoh',
      'Woodlands',
    ],
  },
  // 7,251
  {
    code: 'ID',
    name: 'Indonesia',
    shortName: 'Indonesia',
    flag: '🇮🇩',
    cities: [
      'Bandung',
      'Bekasi',
      'Denpasar',
      'Jakarta',
      'Makassar',
      'Malang',
      'Medan',
      'Palembang',
      'Semarang',
      'Surabaya',
      'Tangerang',
      'Yogyakarta',
    ],
  },
];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Closest listed Indian city, or null if the user is too far from all of them. */
export function nearestIndianCity(lat: number, lng: number): string | null {
  let nearest: string | null = null;
  let nearestKm = MAX_DETECT_DISTANCE_KM;
  for (const city of INDIAN_CITIES) {
    const km = distanceKm(lat, lng, city.lat, city.lng);
    if (km < nearestKm) {
      nearest = city.name;
      nearestKm = km;
    }
  }
  return nearest;
}

/**
 * Asks the browser for the user's position and resolves to the closest Indian city. Resolves to
 * null if there's no permission, no fix, or the user is outside India; callers keep the default.
 */
export function detectIndianCity(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(nearestIndianCity(coords.latitude, coords.longitude)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });
}
