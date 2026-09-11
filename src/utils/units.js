export const LBS_PER_KG = 2.20462;

export function lbsToDisplayWeight(lbs, unit) {
    if (!Number.isFinite(lbs)) return "";
    return unit === "metric" ? Math.round((lbs / LBS_PER_KG) * 10) / 10 : Math.round(lbs);
}

export function displayWeightToLbs(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return unit === "metric" ? n * LBS_PER_KG : n;
}
