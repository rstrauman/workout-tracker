const WGER_BASE = "https://wger.de/api/v2";
const CACHE_KEY = "exerciseLibrary_v1";
const ENGLISH = 2;

let memoryCache = null;
let inFlightPromise = null;

function trimExercise(raw) {
    const translation = raw.translations.find((t) => t.language === ENGLISH) || raw.translations[0];
    if (!translation) return null;

    const mainImage = raw.images.find((img) => img.is_main) || raw.images[0];

    return {
        id: raw.id,
        name: translation.name,
        category: raw.category?.name || "",
        equipment: raw.equipment.map((e) => e.name),
        image: mainImage?.image || null,
    };
}

async function fetchFromApi() {
    const res = await fetch(`${WGER_BASE}/exerciseinfo/?limit=900&format=json`);
    if (!res.ok) throw new Error("Failed to load exercise library");
    const data = await res.json();

    return data.results
        .map(trimExercise)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchExerciseLibrary() {
    if (memoryCache) return memoryCache;
    if (inFlightPromise) return inFlightPromise;

    inFlightPromise = (async () => {
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                memoryCache = JSON.parse(cached);
                return memoryCache;
            }
        } catch {
            // sessionStorage unavailable or corrupt entry - fall through to a live fetch
        }

        const trimmed = await fetchFromApi();
        memoryCache = trimmed;

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        } catch {
            // storage full/unavailable - in-memory cache still works for this session
        }

        return trimmed;
    })();

    try {
        return await inFlightPromise;
    } finally {
        inFlightPromise = null;
    }
}
