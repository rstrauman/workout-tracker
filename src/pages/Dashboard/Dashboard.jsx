import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import profile from "../../assets/Profile-Icon.png";
import Navbar from '../../components/Navbar';
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import { collection, doc, deleteDoc, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDumbbell, faFire, faLightbulb, faChevronRight, faLock, faListCheck, faClock, faTrash } from '@fortawesome/free-solid-svg-icons';

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDuration(totalSeconds) {
    if (!totalSeconds) return "—";
    const minutes = Math.round(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Dashboard() {
    const navigate = useNavigate();
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteWorkout = async (workoutId) => {
        if (!window.confirm("Delete this workout? This can't be undone.")) return;
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "workouts", workoutId));
            setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
        } catch (error) {
            alert(error.message);
        }
    };

    useEffect(() => {
        const fetchWorkouts = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            const thirtyDaysAgo = startOfDay(new Date());
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            try {
                const q = query(
                    collection(db, "users", user.uid, "workouts"),
                    where("date", ">=", Timestamp.fromDate(thirtyDaysAgo)),
                    orderBy("date", "desc")
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((docSnap) => {
                    const w = docSnap.data();
                    return {
                        id: docSnap.id,
                        ...w,
                        date: w.date?.toDate ? w.date.toDate() : new Date(w.date),
                    };
                });
                setWorkouts(data);
            } catch (error) {
                console.error("Failed to load workouts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkouts();
    }, []);

    const today = new Date();
    const todaysWorkout = workouts.find((w) => isSameDay(w.date, today));

    const startOfWeek = startOfDay(today);
    startOfWeek.setDate(startOfWeek.getDate() - ((today.getDay() + 6) % 7));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return {
            label: DAY_LABELS[i],
            done: workouts.some((w) => isSameDay(w.date, d)),
        };
    });

    const completedThisWeek = weekDays.filter((d) => d.done).length;

    let streak = 0;
    const cursor = startOfDay(today);
    if (!workouts.some((w) => isSameDay(w.date, cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    while (workouts.some((w) => isSameDay(w.date, cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    const recentActivity = workouts.slice(0, 3).map((w) => ({
        id: w.id,
        date: w.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        summary: w.exercises?.length ? w.exercises.map((ex) => ex.name).join(", ") : "No exercises logged",
        duration: formatDuration(w.durationSeconds),
    }));

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <h2>{getGreeting()}, User</h2>
                        <p className={styles.dateText}>
                            {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className={styles.profileMenuWrap}>
                        <img
                            src={profile}
                            alt="Profile Image"
                            tabIndex={0}
                            onClick={() => setMenuOpen((open) => !open)}
                            onBlur={() => setMenuOpen(false)}
                        />
                        {menuOpen && (
                            <div className={styles.profileMenu}>
                                <button onMouseDown={() => navigate('/profile')}>Edit Profile</button>
                                <button onMouseDown={handleLogout}>Log Out</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.contentSections}>
                    <div className={styles.midFlex}>
                        <div className={styles.todaysWorkout}>
                            <div className={`${styles.card} ${styles.cardBlue}`}>
                                <div className={styles.cardHeader}>
                                    <h3><FontAwesomeIcon icon={faDumbbell} className={styles.headerIcon} /> Today's Workout</h3>
                                    {todaysWorkout && (
                                        <span className={styles.badge}>
                                            {todaysWorkout.exercises.length} exercise{todaysWorkout.exercises.length !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
                                {loading ? (
                                    <div className={styles.workoutList}>
                                        <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                        <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                    </div>
                                ) : todaysWorkout ? (
                                    <div className={styles.workoutList}>
                                        {todaysWorkout.exercises.map((ex, i) => (
                                            <div className={styles.workoutItem} key={`${ex.name}-${i}`}>
                                                <span className={styles.exerciseName}>{ex.name}</span>
                                                <span className={styles.exerciseDetail}>
                                                    {ex.sets?.length || 0} set{ex.sets?.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={styles.emptyText}>No workout logged yet today.</p>
                                )}
                                <button className={styles.startBtn} onClick={() => navigate('/workout')}>
                                    {todaysWorkout ? "Continue Workout" : "Start Workout"} <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        </div>

                        <div className={styles.midFlexCol}>
                            <div className={styles.tipOfTheDay}>
                                <div className={`${styles.card} ${styles.cardPurple}`}>
                                    <h3><FontAwesomeIcon icon={faLightbulb} className={styles.headerIconPurple} /> Tip of the Day</h3>
                                    <p>Did you know that carbs are the best source to fuel your workout?</p>
                                </div>
                            </div>
                            <div className={styles.weeklyGraph}>
                                <div className={`${styles.card} ${styles.cardBlue}`}>
                                    <div className={styles.cardHeader}>
                                        <h3>This Week</h3>
                                        {loading ? (
                                            <div className={styles.skeleton} style={{ width: 56, height: 16 }}></div>
                                        ) : (
                                            <span className={styles.streakText}>
                                                <FontAwesomeIcon icon={faFire} /> {streak} day{streak !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.graphBars}>
                                        {loading ? (
                                            DAY_LABELS.map((label, i) => (
                                                <div className={styles.dayCol} key={i}>
                                                    <div className={`${styles.skeleton} ${styles.skeletonBar}`}></div>
                                                    <span>{label}</span>
                                                </div>
                                            ))
                                        ) : (
                                            weekDays.map((d, i) => (
                                                <div className={styles.dayCol} key={i}>
                                                    <div className={`${styles.bar} ${d.done ? styles.barDone : ""}`}></div>
                                                    <span>{d.label}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.bottomFlex}>
                        <div className={`${styles.card} ${styles.statCard}`}>
                            {loading ? (
                                <div className={`${styles.skeleton} ${styles.skeletonValue}`}></div>
                            ) : (
                                <span className={styles.statValue}>{completedThisWeek}</span>
                            )}
                            <span className={styles.statLabel}>Workouts this week</span>
                        </div>
                        <div className={`${styles.card} ${styles.statCard}`}>
                            {loading ? (
                                <div className={`${styles.skeleton} ${styles.skeletonValue}`}></div>
                            ) : (
                                <span className={`${styles.statValue} ${styles.statValueAmber}`}>{streak}</span>
                            )}
                            <span className={styles.statLabel}>Day streak</span>
                        </div>
                        <div className={`${styles.card} ${styles.statCard} ${styles.cardPurple} ${styles.comingSoon}`}>
                            <FontAwesomeIcon icon={faLock} className={styles.lockIcon} />
                            <span className={styles.statLabel}>Macro Tracking</span>
                            <span className={styles.soonBadge}>Coming Soon</span>
                        </div>
                    </div>

                    <div className={styles.recentActivity}>
                        <div className={`${styles.card} ${styles.cardPurple}`}>
                            <h3><FontAwesomeIcon icon={faListCheck} className={styles.headerIconPurple} /> Recent Activity</h3>
                            {loading ? (
                                <div className={styles.activityList}>
                                    <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                    <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                    <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                </div>
                            ) : recentActivity.length ? (
                                <div className={styles.activityList}>
                                    {recentActivity.map((entry) => (
                                        <div className={styles.activityItem} key={entry.id}>
                                            <span className={styles.activityDate}>{entry.date}</span>
                                            <span className={styles.activitySummary}>{entry.summary}</span>
                                            <span className={styles.activityDuration}>
                                                <FontAwesomeIcon icon={faClock} /> {entry.duration}
                                            </span>
                                            <button
                                                className={styles.deleteActivityBtn}
                                                onClick={() => handleDeleteWorkout(entry.id)}
                                                aria-label="Delete workout"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.emptyText}>No workouts logged yet. Start your first one above!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Navbar/>
        </div>
    );
}

export default Dashboard;
