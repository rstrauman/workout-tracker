import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import styles from "./Workout.module.css";
import Navbar from "../../components/Navbar";
import { fetchExerciseLibrary } from "../../services/exerciseApi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faCheck, faDumbbell, faClock, faFloppyDisk, faClipboardList, faBookmark, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useModal } from "../../hooks/useModal";

let idCounter = 0;
const nextId = () => `id-${Date.now()}-${idCounter++}`;

function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseDateInputValue(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function createSet() {
    return { id: nextId(), weight: "", reps: "", rir: "", completed: false };
}

function createExercise(name, meta = {}) {
    return {
        id: nextId(),
        name,
        sets: [createSet()],
        notes: "",
        category: meta.category || "",
        equipment: meta.equipment || [],
    };
}

function hydrateExercise(ex) {
    return {
        id: nextId(),
        name: ex.name,
        notes: ex.notes || "",
        category: ex.category || "",
        equipment: ex.equipment || [],
        sets: (ex.sets?.length ? ex.sets : [{}]).map((s) => ({
            id: nextId(),
            weight: s.weight ?? "",
            reps: s.reps ?? "",
            rir: s.rir ?? "",
            completed: !!s.completed,
        })),
    };
}

function formatElapsed(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

const TODAY_STR = toDateInputValue(new Date());
const DATE_STR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function Workout() {
    const navigate = useNavigate();
    const modal = useModal();
    const { workoutId } = useParams();
    const [searchParams] = useSearchParams();
    const isEditing = !!workoutId;
    const [loadingWorkout, setLoadingWorkout] = useState(isEditing);
    const [originalDuration, setOriginalDuration] = useState(0);
    const [exercises, setExercises] = useState([]);
    const [newExerciseName, setNewExerciseName] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [libraryError, setLibraryError] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [workoutDateStr, setWorkoutDateStr] = useState(() => {
        const dateParam = searchParams.get("date");
        return dateParam && DATE_STR_PATTERN.test(dateParam) && dateParam <= TODAY_STR ? dateParam : TODAY_STR;
    });
    const [workoutTitle, setWorkoutTitle] = useState("Workout");
    // The Firestore collection is still named "templates" — renaming it would mean
    // migrating already-live user data for a purely cosmetic change, so only the
    // user-facing wording became "Routine".
    const [routines, setRoutines] = useState([]);
    const [showRoutines, setShowRoutines] = useState(false);
    const [started, setStarted] = useState(false);

    const isToday = workoutDateStr === TODAY_STR;

    useEffect(() => {
        if (!isToday || !started) return;
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(timer);
    }, [isToday, started]);

    useEffect(() => {
        fetchExerciseLibrary()
            .then(setExerciseLibrary)
            .catch(() => setLibraryError(true))
            .finally(() => setLibraryLoading(false));
    }, []);

    useEffect(() => {
        const fetchRoutines = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const snapshot = await getDocs(collection(db, "users", user.uid, "templates"));
                setRoutines(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
            } catch (error) {
                console.error("Failed to load routines:", error);
            }
        };
        fetchRoutines();
    }, []);

    useEffect(() => {
        if (!isEditing) return;
        const loadWorkout = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, "users", user.uid, "workouts", workoutId));
                if (!snap.exists()) {
                    await modal.alert("Workout not found");
                    navigate("/dashboard");
                    return;
                }
                const data = snap.data();
                const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
                setWorkoutDateStr(toDateInputValue(date));
                setOriginalDuration(data.durationSeconds || 0);
                setExercises((data.exercises || []).map(hydrateExercise));
            } catch (error) {
                await modal.alert(error.message);
                navigate("/dashboard");
            } finally {
                setLoadingWorkout(false);
            }
        };
        loadWorkout();
    }, [workoutId, isEditing, navigate, modal]);

    const suggestions = newExerciseName.trim()
        ? exerciseLibrary
            .filter((ex) => ex.name.toLowerCase().includes(newExerciseName.trim().toLowerCase()))
            .slice(0, 8)
        : [];

    const addExercise = () => {
        if (!newExerciseName.trim()) return;
        setExercises([...exercises, createExercise(newExerciseName.trim())]);
        setNewExerciseName("");
        setShowSuggestions(false);
    };

    const selectSuggestion = (ex) => {
        setExercises([...exercises, createExercise(ex.name, { category: ex.category, equipment: ex.equipment })]);
        setNewExerciseName("");
        setShowSuggestions(false);
    };

    const removeExercise = (exerciseId) => {
        setExercises(exercises.filter((ex) => ex.id !== exerciseId));
    };

    const loadRoutine = (routine) => {
        setExercises([
            ...exercises,
            ...routine.exercises.map((ex) => createExercise(ex.name, { category: ex.category, equipment: ex.equipment })),
        ]);
        setWorkoutTitle(routine.name);
        setShowRoutines(false);
    };

    const saveAsRoutine = async () => {
        const user = auth.currentUser;
        if (!user || !exercises.length) return;

        const name = await modal.prompt("Name this routine", { placeholder: "e.g. Push Day" });
        if (!name || !name.trim()) return;

        try {
            const routineData = {
                name: name.trim(),
                exercises: exercises.map((ex) => ({ name: ex.name, category: ex.category, equipment: ex.equipment })),
                createdAt: new Date(),
            };
            const docRef = await addDoc(collection(db, "users", user.uid, "templates"), routineData);
            setRoutines([...routines, { id: docRef.id, ...routineData }]);
            await modal.alert("Routine saved!");
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    const addSet = (exerciseId) => {
        setExercises(exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, sets: [...ex.sets, createSet()] } : ex
        ));
    };

    const removeSet = (exerciseId, setId) => {
        setExercises(exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
        ));
    };

    const updateSet = (exerciseId, setId, field, value) => {
        setExercises(exercises.map((ex) =>
            ex.id === exerciseId
                ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
                : ex
        ));
    };

    const toggleSetComplete = (exerciseId, setId) => {
        setExercises(exercises.map((ex) =>
            ex.id === exerciseId
                ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed: !s.completed } : s)) }
                : ex
        ));
    };

    const updateNotes = (exerciseId, value) => {
        setExercises(exercises.map((ex) => (ex.id === exerciseId ? { ...ex, notes: value } : ex)));
    };

    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completedSets = exercises.reduce(
        (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
        0
    );

    const startWorkout = async () => {
        if (!exercises.length) {
            await modal.alert("Add at least one exercise before starting your workout");
            return;
        }
        setStarted(true);
    };

    const saveWorkout = async () => {
        const user = auth.currentUser;
        if (!user) {
            await modal.alert("No user logged in");
            return;
        }
        if (!exercises.length) {
            await modal.alert("Add at least one exercise before saving");
            return;
        }
        if (!isEditing && isToday && started && completedSets === 0) {
            await modal.alert("Check off at least one set before ending your workout");
            return;
        }

        const payload = {
            date: parseDateInputValue(workoutDateStr),
            durationSeconds: isEditing ? originalDuration : (isToday ? elapsed : 0),
            exercises: exercises.map((ex) => ({
                name: ex.name,
                notes: ex.notes,
                category: ex.category,
                equipment: ex.equipment,
                sets: ex.sets.map(({ weight, reps, rir, completed }) => ({ weight, reps, rir, completed })),
            })),
        };

        try {
            if (isEditing) {
                await updateDoc(doc(db, "users", user.uid, "workouts", workoutId), payload);
            } else {
                await addDoc(collection(db, "users", user.uid, "workouts"), payload);
            }

            await modal.alert(isEditing ? "Workout updated!" : "Workout saved!");
            navigate("/dashboard");
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            await modal.alert(error.message);
        }
    };

    if (loadingWorkout) {
        return (
            <div className={styles.main}>
                <div className={styles.scrollArea}>
                    <div className={`${styles.card} ${styles.emptyState}`}>
                        <p>Loading workout...</p>
                    </div>
                </div>
                <Navbar/>
            </div>
        );
    }

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <h2>{isEditing ? "Edit Workout" : workoutTitle}</h2>
                        <p className={styles.subText}>{completedSets}/{totalSets} sets completed</p>
                    </div>
                    <div className={styles.headerRight}>
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={workoutDateStr}
                            max={TODAY_STR}
                            disabled={started}
                            onChange={(e) => setWorkoutDateStr(e.target.value)}
                        />
                        {isToday && started && (
                            <div className={styles.timer}>
                                <FontAwesomeIcon icon={faClock} />
                                {formatElapsed(elapsed)}
                            </div>
                        )}
                    </div>
                </div>

                {routines.length > 0 && (
                    <div className={styles.routineWrap}>
                        <button
                            className={styles.routineBtn}
                            onClick={() => setShowRoutines((s) => !s)}
                            onBlur={() => setShowRoutines(false)}
                        >
                            <FontAwesomeIcon icon={faClipboardList} /> Use Routine
                        </button>
                        {showRoutines && (
                            <div className={styles.suggestionList}>
                                {routines.map((r) => (
                                    <div
                                        className={styles.suggestionItem}
                                        key={r.id}
                                        onMouseDown={() => loadRoutine(r)}
                                    >
                                        <div className={styles.suggestionText}>
                                            <span className={styles.suggestionName}>{r.name}</span>
                                            <span className={styles.suggestionMeta}>
                                                {r.exercises.length} exercise{r.exercises.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.exerciseList}>
                    {exercises.map((ex) => (
                        <div className={styles.card} key={ex.id}>
                            <div className={styles.exerciseHeader}>
                                <h3>
                                    <span className={styles.headerIconBadge}><FontAwesomeIcon icon={faDumbbell} /></span>
                                    {ex.name}
                                </h3>
                                <button className={styles.iconBtn} onClick={() => removeExercise(ex.id)}>
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                            {ex.category && (
                                <p className={styles.exerciseMeta}>
                                    {ex.category}{ex.equipment?.length ? ` • ${ex.equipment.join(", ")}` : ""}
                                </p>
                            )}

                            <div className={styles.setTableHeader}>
                                <span>Set</span>
                                <span>Weight</span>
                                <span>Reps</span>
                                <span>RIR</span>
                                <span></span>
                            </div>

                            {ex.sets.map((set, i) => (
                                <div className={`${styles.setRow} ${set.completed ? styles.setRowDone : ""}`} key={set.id}>
                                    <span className={styles.setNumber}>{i + 1}</span>
                                    <input
                                        type="number"
                                        placeholder="lb"
                                        value={set.weight}
                                        onChange={(e) => updateSet(ex.id, set.id, "weight", e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="reps"
                                        value={set.reps}
                                        onChange={(e) => updateSet(ex.id, set.id, "reps", e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="RIR"
                                        value={set.rir}
                                        onChange={(e) => updateSet(ex.id, set.id, "rir", e.target.value)}
                                    />
                                    <div className={styles.setActions}>
                                        <button
                                            className={`${styles.checkBtn} ${set.completed ? styles.checkBtnDone : ""}`}
                                            onClick={() => toggleSetComplete(ex.id, set.id)}
                                        >
                                            <FontAwesomeIcon icon={faCheck} />
                                        </button>
                                        <button className={styles.removeSetBtn} onClick={() => removeSet(ex.id, set.id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button className={styles.addSetBtn} onClick={() => addSet(ex.id)}>
                                <FontAwesomeIcon icon={faPlus} /> Add Set
                            </button>

                            <textarea
                                className={styles.notesInput}
                                placeholder="Notes (optional)"
                                value={ex.notes}
                                onChange={(e) => updateNotes(ex.id, e.target.value)}
                            />
                        </div>
                    ))}

                    {!exercises.length && (
                        <div className={`${styles.card} ${styles.emptyState}`}>
                            <div className={styles.emptyStateIcon}>
                                <FontAwesomeIcon icon={faDumbbell} />
                            </div>
                            <p>No exercises yet. Add your first one below to get started.</p>
                        </div>
                    )}
                </div>

                <div className={`${styles.card} ${styles.addExerciseCard}`}>
                    <div className={styles.exerciseSearchWrap}>
                        <input
                            type="text"
                            placeholder={libraryLoading ? "Loading exercise library..." : "Search exercises (e.g. Squat)"}
                            value={newExerciseName}
                            onChange={(e) => { setNewExerciseName(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => newExerciseName && setShowSuggestions(true)}
                            onBlur={() => setShowSuggestions(false)}
                            onKeyDown={(e) => e.key === "Enter" && addExercise()}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <div className={styles.suggestionList}>
                                {suggestions.map((ex) => (
                                    <div
                                        className={styles.suggestionItem}
                                        key={ex.id}
                                        onMouseDown={() => selectSuggestion(ex)}
                                    >
                                        {ex.image && <img src={ex.image} alt="" className={styles.suggestionImage} />}
                                        <div className={styles.suggestionText}>
                                            <span className={styles.suggestionName}>{ex.name}</span>
                                            <span className={styles.suggestionMeta}>{ex.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {libraryError && (
                            <span className={styles.librarySmallNote}>
                                Couldn't load the exercise library — you can still type any exercise name.
                            </span>
                        )}
                    </div>
                    <button className={styles.addExerciseBtn} onClick={addExercise}>
                        <FontAwesomeIcon icon={faPlus} /> Add Exercise
                    </button>
                </div>

                {exercises.length > 0 && (
                    <button className={styles.saveRoutineBtn} onClick={saveAsRoutine}>
                        <FontAwesomeIcon icon={faBookmark} /> Save as Routine
                    </button>
                )}

                {isEditing ? (
                    <button className={styles.saveBtn} onClick={saveWorkout}>
                        <FontAwesomeIcon icon={faFloppyDisk} /> Save Changes
                    </button>
                ) : isToday && !started ? (
                    <>
                        <button
                            className={styles.saveBtn}
                            onClick={startWorkout}
                            disabled={!exercises.length}
                        >
                            <FontAwesomeIcon icon={faPlay} /> Start Workout
                        </button>
                        {!exercises.length && (
                            <p className={styles.saveHint}>Add at least one exercise to start your workout.</p>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            className={styles.saveBtn}
                            onClick={saveWorkout}
                            disabled={isToday && completedSets === 0}
                        >
                            <FontAwesomeIcon icon={faFloppyDisk} /> {isToday ? "End Workout" : "Save Workout"}
                        </button>
                        {isToday && completedSets === 0 && (
                            <p className={styles.saveHint}>Check off at least one set to end your workout.</p>
                        )}
                    </>
                )}

                <p className={styles.logoutLink} onClick={handleLogout}>Log Out</p>
            </div>
            <Navbar/>
        </div>
    );
}

export default Workout;
