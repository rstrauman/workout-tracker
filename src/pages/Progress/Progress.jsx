import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import {
    collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, Timestamp,
} from "firebase/firestore";
import styles from "./Progress.module.css";
import Navbar from "../../components/Navbar";
import { fetchExerciseLibrary } from "../../services/exerciseApi";
import { lbsToDisplayWeight, displayWeightToLbs } from "../../utils/units";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faFloppyDisk, faWeightScale, faDumbbell, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useModal } from "../../hooks/useModal";

const CHART_W = 300;
const CHART_H = 90;
const CHART_PAD = 8;

function buildTrendPaths(values) {
    if (values.length < 2) return { linePath: "", areaPath: "", coords: [] };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = (CHART_W - CHART_PAD * 2) / (values.length - 1);
    const coords = values.map((v, i) => {
        const x = CHART_PAD + i * stepX;
        const y = CHART_H - CHART_PAD - ((v - min) / range) * (CHART_H - CHART_PAD * 2);
        return [x, y];
    });
    const linePath = "M" + coords.map(([x, y]) => `${x},${y}`).join(" L");
    const baseY = CHART_H - CHART_PAD;
    const areaPath = `${linePath} L${coords[coords.length - 1][0]},${baseY} L${coords[0][0]},${baseY} Z`;
    return { linePath, areaPath, coords };
}

function formatTipDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSignedDelta(diff, unitLabel) {
    const rounded = Math.round(diff * 10) / 10;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded} ${unitLabel}`;
}

function TrendChart({ points, color = "var(--accent)", fillColor = "var(--accent-bg)", unitLabel = "" }) {
    const [hoverIndex, setHoverIndex] = useState(null);
    if (!points.length) return null;

    const toggleHover = (i) => setHoverIndex((cur) => (cur === i ? null : i));

    if (points.length === 1) {
        const [point] = points;
        return (
            <div className={styles.trendWrap}>
                <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.trendSvg} preserveAspectRatio="none">
                    <circle
                        cx={CHART_W / 2} cy={CHART_H / 2} r="4" fill={color}
                        className={styles.trendPointHit}
                        onMouseEnter={() => setHoverIndex(0)}
                        onMouseLeave={() => setHoverIndex(null)}
                        onClick={() => toggleHover(0)}
                    />
                </svg>
                {hoverIndex === 0 && (
                    <div className={styles.trendTooltip} style={{ left: "50%", top: "50%" }}>
                        <span className={styles.trendTooltipDate}>{formatTipDate(point.date)}</span>
                        <span className={styles.trendTooltipValue}>{point.value} {unitLabel}</span>
                        <span className={styles.trendTooltipDelta}>First log</span>
                    </div>
                )}
            </div>
        );
    }

    const { linePath, areaPath, coords } = buildTrendPaths(points.map((p) => p.value));

    return (
        <div className={styles.trendWrap}>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.trendSvg} preserveAspectRatio="none">
                <path d={areaPath} fill={fillColor} stroke="none" />
                <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {coords.map(([x, y], i) => (
                    <g key={i}>
                        <circle
                            cx={x} cy={y}
                            r={hoverIndex === i ? 5 : 3}
                            fill={hoverIndex === i ? color : "var(--bg-surface)"}
                            stroke={color}
                            strokeWidth="2"
                            className={styles.trendPoint}
                        />
                        <circle
                            cx={x} cy={y} r="10" fill="transparent"
                            className={styles.trendPointHit}
                            onMouseEnter={() => setHoverIndex(i)}
                            onMouseLeave={() => setHoverIndex(null)}
                            onClick={() => toggleHover(i)}
                        />
                    </g>
                ))}
            </svg>
            {hoverIndex != null && (
                <div
                    className={styles.trendTooltip}
                    style={{
                        left: `${(coords[hoverIndex][0] / CHART_W) * 100}%`,
                        top: `${(coords[hoverIndex][1] / CHART_H) * 100}%`,
                    }}
                >
                    <span className={styles.trendTooltipDate}>{formatTipDate(points[hoverIndex].date)}</span>
                    <span className={styles.trendTooltipValue}>{points[hoverIndex].value} {unitLabel}</span>
                    <span className={styles.trendTooltipDelta}>
                        {hoverIndex > 0
                            ? `${formatSignedDelta(points[hoverIndex].value - points[hoverIndex - 1].value, unitLabel)} vs previous`
                            : "First log"}
                    </span>
                </div>
            )}
        </div>
    );
}

function ProgressRing({ fraction, color = "var(--accent)" }) {
    const r = 26;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(fraction, 1));
    const offset = circumference * (1 - clamped);
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" className={styles.ring}>
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-surface-2)" strokeWidth="7" />
            <circle
                cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 32 32)"
            />
        </svg>
    );
}

function topSetWeight(exercise) {
    return exercise.sets.reduce((best, s) => {
        const w = Number(s.weight) || 0;
        return w > best ? w : best;
    }, 0);
}

function Progress() {
    const modal = useModal();
    const [loading, setLoading] = useState(true);
    const [workouts, setWorkouts] = useState([]);
    const [weightLogs, setWeightLogs] = useState([]);
    const [goals, setGoals] = useState([]);
    const [profile, setProfile] = useState({ weight: null, unitSystem: "imperial", targetWeight: null });
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState(null);

    const [showGoalBuilder, setShowGoalBuilder] = useState(false);
    const [goalExerciseQuery, setGoalExerciseQuery] = useState("");
    const [goalTargetWeight, setGoalTargetWeight] = useState("");
    const [goalTargetReps, setGoalTargetReps] = useState("");
    const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);

    useEffect(() => {
        fetchExerciseLibrary().then(setExerciseLibrary).catch(() => {});
    }, []);

    useEffect(() => {
        const load = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const [workoutsSnap, weightLogsSnap, goalsSnap, userSnap] = await Promise.all([
                    getDocs(query(collection(db, "users", user.uid, "workouts"), orderBy("date", "asc"))),
                    getDocs(query(collection(db, "users", user.uid, "weightLogs"), orderBy("loggedAt", "asc"))),
                    getDocs(collection(db, "users", user.uid, "strengthGoals")),
                    getDoc(doc(db, "users", user.uid)),
                ]);

                setWorkouts(workoutsSnap.docs.map((d) => {
                    const data = d.data();
                    return { id: d.id, ...data, date: data.date?.toDate ? data.date.toDate() : new Date(data.date) };
                }));
                setWeightLogs(weightLogsSnap.docs.map((d) => {
                    const data = d.data();
                    return { id: d.id, weightLbs: data.weightLbs, loggedAt: data.loggedAt?.toDate ? data.loggedAt.toDate() : new Date(data.loggedAt) };
                }));
                setGoals(goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

                const userData = userSnap.exists() ? userSnap.data() : {};
                setProfile({
                    weight: userData.weight ?? null,
                    unitSystem: userData.unitSystem === "metric" ? "metric" : "imperial",
                    targetWeight: userData.targetWeight ?? null,
                });
            } catch (error) {
                console.error("Failed to load progress data:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const unitSystem = profile.unitSystem;
    const unitLabel = unitSystem === "metric" ? "kg" : "lbs";

    const loggedExerciseNames = useMemo(() => {
        const names = new Set();
        workouts.forEach((w) => (w.exercises || []).forEach((ex) => names.add(ex.name)));
        return [...names].sort();
    }, [workouts]);

    const activeExercise = selectedExercise ?? loggedExerciseNames[0] ?? null;

    const latestWeightLbs = weightLogs.length ? weightLogs[weightLogs.length - 1].weightLbs : profile.weight;
    const previousWeightLbs = weightLogs.length >= 2 ? weightLogs[weightLogs.length - 2].weightLbs : null;
    const startingWeightLbs = weightLogs.length ? weightLogs[0].weightLbs : latestWeightLbs;

    const deltaDisplay = previousWeightLbs != null && latestWeightLbs != null
        ? Math.round((lbsToDisplayWeight(latestWeightLbs, unitSystem) - lbsToDisplayWeight(previousWeightLbs, unitSystem)) * 10) / 10
        : null;

    const weightGoalFraction = useMemo(() => {
        if (profile.targetWeight == null || latestWeightLbs == null) return 0;
        const totalGap = Math.abs(startingWeightLbs - profile.targetWeight);
        if (totalGap === 0) return 1;
        const remainingGap = Math.abs(latestWeightLbs - profile.targetWeight);
        return 1 - remainingGap / totalGap;
    }, [profile.targetWeight, latestWeightLbs, startingWeightLbs]);

    const weightChartPoints = useMemo(
        () => weightLogs.map((l) => ({ value: lbsToDisplayWeight(l.weightLbs, unitSystem), date: l.loggedAt })),
        [weightLogs, unitSystem]
    );

    const strengthPoints = useMemo(() => {
        if (!activeExercise) return [];
        return workouts
            .filter((w) => (w.exercises || []).some((ex) => ex.name === activeExercise))
            .map((w) => {
                const ex = w.exercises.find((e) => e.name === activeExercise);
                return { date: w.date, value: topSetWeight(ex) };
            })
            .filter((p) => p.value > 0);
    }, [workouts, activeExercise]);

    const currentTopSetWeight = strengthPoints.length ? strengthPoints[strengthPoints.length - 1].value : 0;

    const selectedGoal = useMemo(
        () => activeExercise
            ? goals.find((g) => g.exerciseName.toLowerCase() === activeExercise.toLowerCase())
            : null,
        [goals, activeExercise]
    );

    const goalSuggestions = goalExerciseQuery.trim()
        ? exerciseLibrary
            .filter((ex) => ex.name.toLowerCase().includes(goalExerciseQuery.trim().toLowerCase()))
            .slice(0, 8)
        : [];

    const handleLogWeight = async () => {
        const result = await modal.prompt(`New weight (${unitLabel})`, { placeholder: unitLabel === "kg" ? "e.g. 81.5" : "e.g. 180" });
        if (result === null) return;
        const n = Number(result);
        if (!Number.isFinite(n) || n <= 0) {
            await modal.alert("Enter a valid number");
            return;
        }
        const weightLbs = displayWeightToLbs(n, unitSystem);
        try {
            const user = auth.currentUser;
            const logRef = await addDoc(collection(db, "users", user.uid, "weightLogs"), {
                weightLbs,
                loggedAt: Timestamp.now(),
            });
            await updateDoc(doc(db, "users", user.uid), { weight: weightLbs });
            setWeightLogs((prev) => [...prev, { id: logRef.id, weightLbs, loggedAt: new Date() }]);
            setProfile((prev) => ({ ...prev, weight: weightLbs }));
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    const handleSetTargetWeight = async () => {
        const result = await modal.prompt(`Target weight (${unitLabel})`, { placeholder: unitLabel === "kg" ? "e.g. 75" : "e.g. 165" });
        if (result === null) return;
        const n = Number(result);
        if (!Number.isFinite(n) || n <= 0) {
            await modal.alert("Enter a valid number");
            return;
        }
        const targetWeightLbs = displayWeightToLbs(n, unitSystem);
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { targetWeight: targetWeightLbs });
            setProfile((prev) => ({ ...prev, targetWeight: targetWeightLbs }));
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    const openGoalBuilder = (exerciseName) => {
        const existing = exerciseName
            ? goals.find((g) => g.exerciseName.toLowerCase() === exerciseName.toLowerCase())
            : null;
        setGoalExerciseQuery(exerciseName || "");
        setGoalTargetWeight(existing ? String(existing.targetWeightLbs) : "");
        setGoalTargetReps(existing ? String(existing.targetReps) : "");
        setShowGoalBuilder(true);
    };

    const saveGoal = async () => {
        const name = goalExerciseQuery.trim();
        const targetWeight = Number(goalTargetWeight);
        const targetReps = Number(goalTargetReps);
        if (!name) {
            await modal.alert("Pick an exercise");
            return;
        }
        if (!Number.isFinite(targetWeight) || targetWeight <= 0 || !Number.isFinite(targetReps) || targetReps <= 0) {
            await modal.alert("Enter a valid target weight and reps");
            return;
        }

        const existing = goals.find((g) => g.exerciseName.toLowerCase() === name.toLowerCase());
        try {
            const user = auth.currentUser;
            if (existing) {
                await updateDoc(doc(db, "users", user.uid, "strengthGoals", existing.id), {
                    exerciseName: name, targetWeightLbs: targetWeight, targetReps,
                });
                setGoals((prev) => prev.map((g) => (g.id === existing.id ? { ...g, exerciseName: name, targetWeightLbs: targetWeight, targetReps } : g)));
            } else {
                const docRef = await addDoc(collection(db, "users", user.uid, "strengthGoals"), {
                    exerciseName: name, targetWeightLbs: targetWeight, targetReps, createdAt: new Date(),
                });
                setGoals((prev) => [...prev, { id: docRef.id, exerciseName: name, targetWeightLbs: targetWeight, targetReps }]);
            }
            setShowGoalBuilder(false);
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <h2>Progress</h2>
                        <p className={styles.subText}>Track your weight and lifts over time</p>
                    </div>
                </div>

                {loading ? (
                    <div className={`${styles.card} ${styles.emptyState}`}>
                        <p>Loading...</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionHeader}>
                                <h3>
                                    <span className={styles.headerIconBadge}><FontAwesomeIcon icon={faWeightScale} /></span>
                                    Body Weight
                                </h3>
                                <button className={styles.logBtn} onClick={handleLogWeight}>
                                    <FontAwesomeIcon icon={faPlus} /> Log Weight
                                </button>
                            </div>

                            {weightLogs.length === 0 ? (
                                <div className={styles.inlineEmptyState}>
                                    <p>No weight entries yet. Log your first weigh-in to see your trend.</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.weightRow}>
                                        <div className={styles.weightReadout}>
                                            <span className={styles.weightValue}>
                                                {lbsToDisplayWeight(latestWeightLbs, unitSystem)} {unitLabel}
                                            </span>
                                            {deltaDisplay != null && (
                                                <span className={styles.weightDelta}>
                                                    {deltaDisplay >= 0 ? "+" : ""}{deltaDisplay} {unitLabel} since last log
                                                </span>
                                            )}
                                        </div>
                                        {profile.targetWeight != null ? (
                                            <div className={styles.goalRingWrap}>
                                                <ProgressRing fraction={weightGoalFraction} />
                                                <div className={styles.goalRingLabel}>
                                                    <span>{lbsToDisplayWeight(profile.targetWeight, unitSystem)} {unitLabel}</span>
                                                    <span className={styles.goalRingSub}>goal</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button className={styles.setGoalBtn} onClick={handleSetTargetWeight}>
                                                Set a goal weight
                                            </button>
                                        )}
                                    </div>
                                    <TrendChart points={weightChartPoints} unitLabel={unitLabel} />
                                </>
                            )}
                        </div>

                        <div className={styles.card}>
                            <div className={styles.sectionHeader}>
                                <h3>
                                    <span className={styles.headerIconBadge}><FontAwesomeIcon icon={faDumbbell} /></span>
                                    Strength Progress
                                </h3>
                            </div>

                            {loggedExerciseNames.length === 0 ? (
                                <div className={styles.inlineEmptyState}>
                                    <FontAwesomeIcon icon={faChartLine} />
                                    <p>No workouts logged yet. Log a workout to start tracking strength trends.</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.exerciseChipRow}>
                                        {loggedExerciseNames.map((name) => (
                                            <button
                                                key={name}
                                                className={`${styles.exerciseChipBtn} ${activeExercise === name ? styles.exerciseChipBtnActive : ""}`}
                                                onClick={() => setSelectedExercise(name)}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>

                                    {strengthPoints.length === 0 ? (
                                        <p className={styles.mutedNote}>No numeric set data logged for this exercise yet.</p>
                                    ) : (
                                        <>
                                            <TrendChart points={strengthPoints} color="var(--accent-2)" fillColor="var(--accent-2-bg)" unitLabel="lbs" />
                                            <p className={styles.mutedNote}>Latest top set: {currentTopSetWeight} lbs</p>
                                        </>
                                    )}

                                    {activeExercise && (
                                        selectedGoal ? (
                                            <div className={styles.goalRow}>
                                                <ProgressRing
                                                    fraction={selectedGoal.targetWeightLbs ? currentTopSetWeight / selectedGoal.targetWeightLbs : 0}
                                                    color="var(--accent-2)"
                                                />
                                                <div className={styles.goalRowText}>
                                                    <p className={styles.goalRowTitle}>Goal: {selectedGoal.targetWeightLbs} lbs × {selectedGoal.targetReps}</p>
                                                    <p className={styles.goalRowSub}>{currentTopSetWeight} lbs current top set</p>
                                                </div>
                                                <button className={styles.iconBtn} onClick={() => openGoalBuilder(activeExercise)} aria-label="Edit goal">
                                                    <FontAwesomeIcon icon={faPen} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button className={styles.setGoalBtn} onClick={() => openGoalBuilder(activeExercise)}>
                                                Set a goal for {activeExercise}
                                            </button>
                                        )
                                    )}
                                </>
                            )}

                            {goals.length > 0 && (
                                <div className={styles.goalsList}>
                                    <p className={styles.goalsListTitle}>Your goals</p>
                                    {goals.map((g) => (
                                        <button key={g.id} className={styles.goalListItem} onClick={() => openGoalBuilder(g.exerciseName)}>
                                            <span>{g.exerciseName}</span>
                                            <span className={styles.goalListTarget}>{g.targetWeightLbs} lbs × {g.targetReps}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!showGoalBuilder ? (
                                <button className={styles.newGoalBtn} onClick={() => openGoalBuilder("")}>
                                    <FontAwesomeIcon icon={faPlus} /> Set a Goal for Another Exercise
                                </button>
                            ) : (
                                <div className={styles.goalBuilderCard}>
                                    <div className={styles.exerciseSearchWrap}>
                                        <input
                                            type="text"
                                            placeholder="Search exercises (e.g. Squat)"
                                            value={goalExerciseQuery}
                                            onChange={(e) => { setGoalExerciseQuery(e.target.value); setShowGoalSuggestions(true); }}
                                            onFocus={() => goalExerciseQuery && setShowGoalSuggestions(true)}
                                            onBlur={() => setShowGoalSuggestions(false)}
                                        />
                                        {showGoalSuggestions && goalSuggestions.length > 0 && (
                                            <div className={styles.suggestionList}>
                                                {goalSuggestions.map((ex) => (
                                                    <div
                                                        className={styles.suggestionItem}
                                                        key={ex.id}
                                                        onMouseDown={() => { setGoalExerciseQuery(ex.name); setShowGoalSuggestions(false); }}
                                                    >
                                                        <div className={styles.suggestionText}>
                                                            <span className={styles.suggestionName}>{ex.name}</span>
                                                            <span className={styles.suggestionMeta}>{ex.category}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.goalInputRow}>
                                        <input
                                            type="number"
                                            placeholder="Target weight (lbs)"
                                            value={goalTargetWeight}
                                            onChange={(e) => setGoalTargetWeight(e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Target reps"
                                            value={goalTargetReps}
                                            onChange={(e) => setGoalTargetReps(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.builderActions}>
                                        <button className={styles.cancelBtn} onClick={() => setShowGoalBuilder(false)}>Cancel</button>
                                        <button className={styles.saveBtn} onClick={saveGoal}>
                                            <FontAwesomeIcon icon={faFloppyDisk} /> Save Goal
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Navbar/>
        </div>
    );
}

export default Progress;
