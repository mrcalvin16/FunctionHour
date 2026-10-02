export const stateCities = [
  ["Alabama", "AL", ["Birmingham", "Huntsville", "Mobile", "Montgomery"]],
  ["Alaska", "AK", ["Anchorage", "Fairbanks", "Juneau"]],
  ["Arizona", "AZ", ["Phoenix", "Tucson", "Scottsdale", "Tempe"]],
  ["Arkansas", "AR", ["Little Rock", "Fayetteville", "Bentonville"]],
  ["California", "CA", ["Los Angeles", "San Diego", "San Francisco", "San Jose", "Sacramento", "Oakland"]],
  ["Colorado", "CO", ["Denver", "Colorado Springs", "Boulder", "Fort Collins"]],
  ["Connecticut", "CT", ["Hartford", "New Haven", "Stamford"]],
  ["Delaware", "DE", ["Wilmington", "Dover", "Newark"]],
  ["Florida", "FL", ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "St. Petersburg"]],
  ["Georgia", "GA", ["Atlanta", "Savannah", "Augusta", "Athens"]],
  ["Hawaii", "HI", ["Honolulu", "Hilo", "Kailua"]],
  ["Idaho", "ID", ["Boise", "Idaho Falls", "Coeur d'Alene"]],
  ["Illinois", "IL", ["Chicago", "Springfield", "Aurora", "Naperville"]],
  ["Indiana", "IN", ["Indianapolis", "Fort Wayne", "South Bend", "Bloomington"]],
  ["Iowa", "IA", ["Des Moines", "Cedar Rapids", "Iowa City"]],
  ["Kansas", "KS", ["Wichita", "Kansas City", "Topeka", "Lawrence"]],
  ["Kentucky", "KY", ["Louisville", "Lexington", "Bowling Green"]],
  ["Louisiana", "LA", ["New Orleans", "Baton Rouge", "Lafayette", "Shreveport"]],
  ["Maine", "ME", ["Portland", "Bangor", "Augusta"]],
  ["Maryland", "MD", ["Baltimore", "Annapolis", "Frederick", "Bethesda"]],
  ["Massachusetts", "MA", ["Boston", "Worcester", "Cambridge", "Salem"]],
  ["Michigan", "MI", ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing"]],
  ["Minnesota", "MN", ["Minneapolis", "Saint Paul", "Duluth", "Rochester"]],
  ["Mississippi", "MS", ["Jackson", "Gulfport", "Oxford"]],
  ["Missouri", "MO", ["St. Louis", "Kansas City", "Springfield", "Columbia"]],
  ["Montana", "MT", ["Billings", "Missoula", "Bozeman", "Helena"]],
  ["Nebraska", "NE", ["Omaha", "Lincoln", "Grand Island"]],
  ["Nevada", "NV", ["Las Vegas", "Reno", "Henderson"]],
  ["New Hampshire", "NH", ["Manchester", "Portsmouth", "Concord"]],
  ["New Jersey", "NJ", ["Newark", "Jersey City", "Atlantic City", "Princeton"]],
  ["New Mexico", "NM", ["Albuquerque", "Santa Fe", "Las Cruces"]],
  ["New York", "NY", ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"]],
  ["North Carolina", "NC", ["Charlotte", "Raleigh", "Durham", "Asheville", "Greensboro"]],
  ["North Dakota", "ND", ["Fargo", "Bismarck", "Grand Forks"]],
  ["Ohio", "OH", ["Columbus", "Cleveland", "Cincinnati", "Dayton"]],
  ["Oklahoma", "OK", ["Oklahoma City", "Tulsa", "Norman"]],
  ["Oregon", "OR", ["Portland", "Eugene", "Bend", "Salem"]],
  ["Pennsylvania", "PA", ["Philadelphia", "Pittsburgh", "Allentown", "Harrisburg"]],
  ["Rhode Island", "RI", ["Providence", "Newport", "Warwick"]],
  ["South Carolina", "SC", ["Charleston", "Columbia", "Greenville", "Myrtle Beach"]],
  ["South Dakota", "SD", ["Sioux Falls", "Rapid City", "Brookings"]],
  ["Tennessee", "TN", ["Nashville", "Memphis", "Knoxville", "Chattanooga"]],
  ["Texas", "TX", ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth", "El Paso"]],
  ["Utah", "UT", ["Salt Lake City", "Provo", "Park City", "St. George"]],
  ["Vermont", "VT", ["Burlington", "Montpelier", "Stowe"]],
  ["Virginia", "VA", ["Richmond", "Virginia Beach", "Arlington", "Norfolk", "Charlottesville"]],
  ["Washington", "WA", ["Seattle", "Spokane", "Tacoma", "Bellevue"]],
  ["West Virginia", "WV", ["Charleston", "Morgantown", "Huntington"]],
  ["Wisconsin", "WI", ["Milwaukee", "Madison", "Green Bay", "Wisconsin Dells"]],
  ["Wyoming", "WY", ["Cheyenne", "Jackson", "Casper"]],
] as const;

export const featuredCities = [
    ["New York", "NY"], ["Los Angeles", "CA"], ["Chicago", "IL"],
  ["Houston", "TX"], ["Atlanta", "GA"], ["Miami", "FL"],
  ["Dallas", "TX"], ["Washington", "DC"], ["New Orleans", "LA"],
  ["San Francisco", "CA"], ["Nashville", "TN"], ["Seattle", "WA"],
] as const;

type CityEvent = { city?: string; state?: string; location?: string };
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeCity = (value: string) => normalize(value) === "new york" ? "new york city" : normalize(value);

export function getDiscoveryCity(event: CityEvent) {
  const city = event.city?.trim() || event.location?.split(",")[0]?.trim() || "";
  const rawState = event.state?.trim() || event.location?.split(",")[1]?.trim() || "";
  const knownState = stateCities.find(([name, abbreviation]) =>
    normalize(name) === normalize(rawState) || normalize(abbreviation) === normalize(rawState),
  );
  let state = knownState?.[1] || rawState.toUpperCase();
  if (!state) {
    const candidates = stateCities.filter(([, , cities]) => cities.some((name) => normalizeCity(name) === normalizeCity(city)));
    if (candidates.length === 1) state = candidates[0][1];
  }
  return { city, state };
}

export function getDiscoveryCityOptions(events: CityEvent[]) {
  const options = new Map<string, { city: string; state: string; stateName: string }>();
  const add = (city: string, state: string, stateName: string) => {
    if (!city) return;
    const key = `${normalize(city)}|${normalize(state)}`;
    if (!options.has(key)) options.set(key, { city, state, stateName });
  };
  for (const [stateName, state, cities] of stateCities) {
    for (const city of cities) add(city, state, stateName);
  }
  for (const [city, state] of featuredCities) {
    add(city, state, stateCities.find(([, code]) => code === state)?.[0] || (state === "DC" ? "District of Columbia" : state));
  }
  for (const event of events) {
    const { city, state } = getDiscoveryCity(event);
    add(city, state, stateCities.find(([, code]) => code === state)?.[0] || (state === "DC" ? "District of Columbia" : state || "Other locations"));
  }
  return [...options.values()].sort((a, b) => a.stateName.localeCompare(b.stateName) || a.city.localeCompare(b.city));
}

export function matchesDiscoveryCity(event: CityEvent, selectedCity: string) {
  if (selectedCity === "All Cities") return true;
  const requested = getDiscoveryCity({ location: selectedCity });
  const actual = getDiscoveryCity(event);
  return normalizeCity(actual.city) === normalizeCity(requested.city) &&
    (!requested.state || normalize(actual.state) === normalize(requested.state));
}
