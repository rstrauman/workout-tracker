import { useState, useEffect } from "react";
import { auth, db } from "../../firebase/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import styles from "./Routines.module.css";
import Navbar from "../../components/Navbar";
import { fetchExerciseLibrary } from "../../services/exerciseApi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPen, faClipboardList, faXmark, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

let idCounter = 0;
const nextId = () => `id-${Date.now()}-${idCounter++}`;

// Stored in the same Firestore collection ("templates") that predates the
// "Routines" rebrand — renaming the collection would mean migrating already-live
// user data for a purely cosmetic change, so only the user-facing wording changed.
const ROUTINES_COLLECTION = "templates";

function Routines() {
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showBuilder, setShowBuilder] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [routineName, setRoutineName] = useState("");
    const [builderExercises, setBuilderExercises] = useState([]);

    const [newExerciseName, setNewExerciseName] = useState("");
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [libraryError, setLibraryError] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        fetchExerciseLibrary()
            .then(setExerciseLibrary)
            .catch(() => setLibraryError(true))
            .finally(() => setLibraryLoading(false));
    }, []);

    useEffect(() => {
        const fetchRoutines = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const snapshot = await getDocs(collection(db, "users", user.uid, ROUTINES_COLLECTION));
                setRoutines(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
            } catch (error) {
                console.error("Failed to load routines:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRoutines();
    }, []);

    const suggestions = newExerciseName.trim()
        ? exerciseLibrary
            .filter((ex) => ex.name.toLowerCase().includes(newExerciseName.trim().toLowerCase()))
            .slice(0, 8)
        : [];

    const addExerciseToBuilder = (exerciseName, meta = {}) => {
        setBuilderExercises((prev) => [
            ...prev,
            { id: nextId(), name: exerciseName, category: meta.category || "", equipment: meta.equipment || [] },
        ]);
        setNewExerciseName("");
        setShowSuggestions(false);
    };

    const addExercise = () => {
        if (!newExerciseName.trim()) return;
        addExerciseToBuilder(newExerciseName.trim());
    };

    const selectSuggestion = (ex) => {
        addExerciseToBuilder(ex.name, { category: ex.category, equipment: ex.equipment });
    };

    const removeBuilderExercise = (id) => {
        setBuilderExercises((prev) => prev.filter((ex) => ex.id !== id));
    };

    const openNewBuilder = () => {
        setEditingId(null);
        setRoutineName("");
        setBuilderExercises([]);
        setShowBuilder(true);
    };

    const openEditBuilder = (routine) => {
        setEditingId(routine.id);
        setRoutineName(routine.name);
        setBuilderExercises(
            routine.exercises.map((ex) => ({
                id: nextId(),
                name: ex.name,
                category: ex.category || "",
                equipment: ex.equipment || [],
            }))
        );
        setShowBuilder(true);
    };

    const cancelBuilder = () => {
        setShowBuilder(false);
        setEditingId(null);
    };

    const saveRoutine = async () => {
        const user = auth.currentUser;
        if (!user) return;
        if (!routineName.trim()) {
            alert("Give this routine a name");
            return;
        }
        if (!builderExercises.length) {
            alert("Add at least one exercise before saving");
            return;
        }

        const routineData = {
            name: routineName.trim(),
            exercises: builderExercises.map(({ name, category, equipment }) => ({ name, category, equipment })),
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "users", user.uid, ROUTINES_COLLECTION, editingId), routineData);
                setRoutines((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...routineData } : r)));
            } else {
                const createdAt = new Date();
                const docRef = await addDoc(collection(db, "users", user.uid, ROUTINES_COLLECTION), { ...routineData, createdAt });
                setRoutines((prev) => [...prev, { id: docRef.id, ...routineData, createdAt }]);
            }
            setShowBuilder(false);
            setEditingId(null);
        } catch (error) {
            alert(error.message);
        }
    };

    const deleteRoutine = async (id) => {
        if (!window.confirm("Delete this routine? This can't be undone.")) return;
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, ROUTINES_COLLECTION, id));
            setRoutines((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <h2>Routines</h2>
                        <p className={styles.subText}>{loading ? "Loading..." : `${routines.length} saved`}</p>
                    </div>
                </div>

                {!showBuilder && (
                    <button className={styles.newRoutineBtn} onClick={openNewBuilder}>
                        <FontAwesomeIcon icon={faPlus} /> New Routine
                    </button>
                )}

                {showBuilder && (
                    <div className={`${styles.card} ${styles.builderCard}`}>
                        <input
                            type="text"
                            className={styles.nameInput}
                            placeholder="Routine name (e.g. Push Day)"
                            value={routineName}
                            onChange={(e) => setRoutineName(e.target.value)}
                        />

                        {builderExercises.length > 0 && (
                            <div className={styles.chipList}>
                                {builderExercises.map((ex) => (
                                    <div className={styles.chip} key={ex.id}>
                                        <span>{ex.name}</span>
                                        <button className={styles.chipRemoveBtn} onClick={() => removeBuilderExercise(ex.id)}>
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

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

                        <div className={styles.builderActions}>
                            <button className={styles.cancelBtn} onClick={cancelBuilder}>
                                Cancel
                            </button>
                            <button className={styles.saveBtn} onClick={saveRoutine}>
                                <FontAwesomeIcon icon={faFloppyDisk} /> {editingId ? "Save Changes" : "Save Routine"}
                            </button>
                        </div>
                    </div>
                )}

                <div className={styles.routineList}>
                    {!loading && routines.map((r) => (
                        <div className={styles.card} key={r.id}>
                            <div className={styles.routineHeader}>
                                <h3>
                                    <span className={styles.headerIconBadge}><FontAwesomeIcon icon={faClipboardList} /></span>
                                    {r.name}
                                </h3>
                                <div className={styles.routineActions}>
                                    <button className={styles.iconBtn} onClick={() => openEditBuilder(r)} aria-label="Edit routine">
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                    <button className={styles.iconBtn} onClick={() => deleteRoutine(r.id)} aria-label="Delete routine">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </div>
                            <p className={styles.routineMeta}>
                                {r.exercises.length} exercise{r.exercises.length !== 1 ? "s" : ""}
                                {r.exercises.length ? ` • ${r.exercises.map((ex) => ex.name).join(", ")}` : ""}
                            </p>
                        </div>
                    ))}

                    {!loading && !routines.length && !showBuilder && (
                        <div className={`${styles.card} ${styles.emptyState}`}>
                            <div className={styles.emptyStateIcon}>
                                <FontAwesomeIcon icon={faClipboardList} />
                            </div>
                            <p>No routines yet. Build one above to reuse it anytime.</p>
                        </div>
                    )}
                </div>
            </div>
            <Navbar/>
        </div>
    );
}

export default Routines;
