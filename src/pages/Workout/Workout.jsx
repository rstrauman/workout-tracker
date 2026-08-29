import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import styles from "./Workout.module.css";
import Navbar from "../../components/Navbar";
import { fetchExerciseLibrary } from "../../services/exerciseApi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faCheck, faDumbbell, faClock, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

let idCounter = 0;
const nextId = () => `id-${Date.now()}-${idCounter++}`;

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

function formatElapsed(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function Workout() {
    const navigate = useNavigate();
    const [exercises, setExercises] = useState([]);
    const [newExerciseName, setNewExerciseName] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [libraryError, setLibraryError] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchExerciseLibrary()
            .then(setExerciseLibrary)
            .catch(() => setLibraryError(true))
            .finally(() => setLibraryLoading(false));
    }, []);

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

    const saveWorkout = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("No user logged in");
            return;
        }
        if (!exercises.length) {
            alert("Add at least one exercise before saving");
            return;
        }

        try {
            await addDoc(collection(db, "users", user.uid, "workouts"), {
                date: new Date(),
                durationSeconds: elapsed,
                exercises: exercises.map((ex) => ({
                    name: ex.name,
                    notes: ex.notes,
                    category: ex.category,
                    equipment: ex.equipment,
                    sets: ex.sets.map(({ weight, reps, rir, completed }) => ({ weight, reps, rir, completed })),
                })),
            });

            alert("Workout saved!");
            navigate("/dashboard");
        } catch (error) {
            alert(error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <h2>Push Day</h2>
                        <p className={styles.subText}>{completedSets}/{totalSets} sets completed</p>
                    </div>
                    <div className={styles.timer}>
                        <FontAwesomeIcon icon={faClock} />
                        {formatElapsed(elapsed)}
                    </div>
                </div>

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

                <button className={styles.saveBtn} onClick={saveWorkout}>
                    <FontAwesomeIcon icon={faFloppyDisk} /> Save Workout
                </button>

                <p className={styles.logoutLink} onClick={handleLogout}>Log Out</p>
            </div>
            <Navbar/>
        </div>
    );
}

export default Workout;
