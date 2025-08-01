export function shortenAddress(address) {
  if (!address || typeof address !== "string") return "";

  const parts = address.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    const name = parts[0]; // e.g., "500 Somerset St"
    const city = parts[1]; // e.g., "New Brunswick"
    const stateZip = parts[2].split(" ")[0]; // Just "NJ"

    let result = `${name}, ${city}, ${stateZip}`;

    if (result.length <= 36) {
      return result;
    }

    // If it's too long, start shortening `name` and/or `city`
    const shortName = name.length > 20 ? name.slice(0, 20).trim() : name;
    const shortCity = city.length > 15 ? city.slice(0, 15).trim() : city;

    result = `${shortName}, ${shortCity}, ${stateZip}`;
    return result.length <= 36 ? result : result.slice(0, 36);
  } else if (parts.length === 2) {
    const name = parts[0];
    const cityState = parts[1].split(" ")[0]; // Drop ZIP if present
    const result = `${name}, ${cityState}`;
    return result.length <= 36 ? result : result.slice(0, 36);
  } else {
    return address.slice(0, 36);
  }
}
