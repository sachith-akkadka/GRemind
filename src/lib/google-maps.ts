
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Define the libraries to be loaded by the Google Maps script.
// "places" is required for location autocomplete and search functionality.
export const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];
