import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import Navbar from '../../components/Navbar';
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import { collection, doc, deleteDoc, getDoc, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDumbbell, faFire, faLightbulb, faChevronRight, faListCheck, faTrash, faPen, faPlus, faUser, faClipboardList } from '@fortawesome/free-solid-svg-icons';

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeekFor(date) {
    const d = startOfDay(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
}

function formatDuration(totalSeconds) {
    if (!totalSeconds) return "—";
    const minutes = Math.round(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function ordinalSuffix(day) {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

function formatLongDate(date) {
    const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
    const month = date.toLocaleDateString(undefined, { month: 'long' });
    const day = date.getDate();
    return `${weekday}, ${month} ${day}${ordinalSuffix(day)}`;
}

function Dashboard() {
    const navigate = useNavigate();
    const [workouts, setWorkouts] = useState([]);
    const [firstName, setFirstName] = useState("");
    const [routineCount, setRoutineCount] = useState(0);
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
        const fetchDashboardData = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            const thirtyDaysAgo = startOfDay(new Date());
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            try {
                const [snapshot, userDoc, routinesSnapshot] = await Promise.all([
                    getDocs(query(
                        collection(db, "users", user.uid, "workouts"),
                        where("date", ">=", Timestamp.fromDate(thirtyDaysAgo)),
                        orderBy("date", "desc")
                    )),
                    getDoc(doc(db, "users", user.uid)),
                    getDocs(collection(db, "users", user.uid, "templates")),
                ]);

                const data = snapshot.docs.map((docSnap) => {
                    const w = docSnap.data();
                    return {
                        id: docSnap.id,
                        ...w,
                        date: w.date?.toDate ? w.date.toDate() : new Date(w.date),
                    };
                });
                setWorkouts(data);
                setRoutineCount(routinesSnapshot.size);

                if (userDoc.exists()) {
                    setFirstName(userDoc.data().firstName || "");
                }
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const today = new Date();
    const todayStart = startOfDay(today);
    const todaysWorkout = workouts.find((w) => isSameDay(w.date, today));

    const startOfWeek = startOfWeekFor(today);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return {
            label: DAY_LABELS[i],
            done: workouts.some((w) => isSameDay(w.date, d)),
            isToday: isSameDay(d, todayStart),
            isFuture: d > todayStart,
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

    // Last 4 weeks' workout counts (oldest to newest), from data already fetched above.
    const weeklyCounts = Array.from({ length: 4 }, (_, i) => {
        const weekOffset = 3 - i;
        const weekStart = new Date(startOfWeek);
        weekStart.setDate(weekStart.getDate() - weekOffset * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return workouts.filter((w) => w.date >= weekStart && w.date < weekEnd).length;
    });
    const maxWeeklyCount = Math.max(...weeklyCounts, 1);

    const recentActivity = workouts.slice(0, 3).map((w) => ({
        id: w.id,
        date: w.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        summary: w.exercises?.length ? w.exercises.map((ex) => ex.name).join(", ") : "No exercises logged",
        duration: formatDuration(w.durationSeconds),
    }));

    return (
        <div className={`${styles.main} ${styles.dashboardRoot}`}>
            <div className={styles.ambientGlow}></div>
            <div className={styles.scrollArea}>

                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.greeting}>
                            {loading ? (
                                <div className={`${styles.skeleton} ${styles.skeletonGreeting}`}></div>
                            ) : (
                                `${getGreeting()}${firstName ? `, ${firstName}` : ""}`
                            )}
                        </h2>
                        {loading ? (
                            <div className={`${styles.skeleton} ${styles.skeletonDate}`}></div>
                        ) : (
                            <p className={styles.dateText}>
                                {formatLongDate(today)}
                            </p>
                        )}
                    </div>
                    <div className={styles.profileMenuWrap}>
                        <button
                            className={styles.avatarBtn}
                            aria-label="Account menu"
                            tabIndex={0}
                            onClick={() => setMenuOpen((open) => !open)}
                            onBlur={() => setMenuOpen(false)}
                        >
                            <span className={styles.avatarCircle}>
                                {firstName ? firstName[0].toUpperCase() : <FontAwesomeIcon icon={faUser} style={{ fontSize: 12 }} />}
                            </span>
                        </button>
                        {menuOpen && (
                            <div className={styles.profileMenu}>
                                <button onMouseDown={() => navigate('/profile')}>Edit Profile</button>
                                <button onMouseDown={handleLogout}>Log Out</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.topGrid}>
                {/* Today's Workout */}
                <div className={styles.heroCard}>
                    <div className={styles.heroGlow}></div>
                    <div className={styles.heroTopRow}>
                        <div className={styles.heroLabelGroup}>
                            <FontAwesomeIcon icon={faDumbbell} style={{ color: "var(--db-blue-400)", fontSize: 15 }} />
                            <span className={styles.heroLabel}>Today's Workout</span>
                        </div>
                        {todaysWorkout && (
                            <span className={styles.heroBadge}>
                                {todaysWorkout.exercises.length} exercise{todaysWorkout.exercises.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className={`${styles.skeleton} ${styles.skeletonHeroLine}`} style={{ marginTop: 12 }}></div>
                    ) : todaysWorkout ? (
                        todaysWorkout.exercises.map((ex, i) => (
                            <div className={styles.heroExerciseRow} key={`${ex.name}-${i}`} style={i > 0 ? { marginTop: 8 } : undefined}>
                                <span className={styles.exerciseName}>{ex.name}</span>
                                <span className={styles.exerciseMeta}>
                                    {ex.sets?.length || 0} set{ex.sets?.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className={styles.heroEmpty}>
                            <div className={styles.heroEmptyIcon}>
                                <FontAwesomeIcon icon={faPlus} style={{ color: "var(--db-text-tertiary)", fontSize: 14 }} />
                            </div>
                            <span className={styles.emptyText}>No workout logged yet today.<br />Ready when you are.</span>
                        </div>
                    )}

                    <button className={styles.heroCta} onClick={() => navigate('/workout')}>
                        {todaysWorkout ? "Continue Workout" : "Start Workout"} <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>

                {/* Weekly Activity */}
                <div className={styles.weeklyCard}>
                    <div className={styles.weeklyTopRow}>
                        <span className={styles.weeklyTitle}>This Week</span>
                        {loading ? (
                            <div className={styles.skeleton} style={{ width: 90, height: 22, borderRadius: 999 }}></div>
                        ) : (
                            <span className={`${styles.streakBadge} ${streak === 0 ? styles.streakBadgeMuted : ""}`}>
                                <FontAwesomeIcon icon={faFire} />
                                {streak} day{streak !== 1 ? "s" : ""} streak
                            </span>
                        )}
                    </div>
                    <div className={styles.dayRow}>
                        {loading ? (
                            DAY_LABELS.map((label, i) => (
                                <div className={styles.dayCol} key={i}>
                                    <div className={`${styles.skeleton} ${styles.skeletonDay}`}></div>
                                    <div className={styles.dayMarkerEmpty}></div>
                                    <span className={styles.dayLabel}>{label}</span>
                                </div>
                            ))
                        ) : (
                            weekDays.map((d, i) => (
                                <div className={styles.dayCol} key={i}>
                                    <div className={`${styles.dayTrack} ${d.done ? "" : d.isFuture ? styles.dayTrackFuture : styles.dayTrackMissed} ${d.isToday ? styles.dayTrackToday : ""}`}>
                                        {d.done && <div className={styles.dayFill}></div>}
                                    </div>
                                    {d.done ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--db-blue-300)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    ) : d.isFuture ? (
                                        <div className={styles.dayMarkerEmpty}></div>
                                    ) : (
                                        <div className={`${styles.dayMarker} ${d.isToday ? styles.dayMarkerToday : ""}`}></div>
                                    )}
                                    <span className={`${styles.dayLabel} ${d.done ? styles.dayLabelDone : ""} ${d.isToday ? styles.dayLabelToday : ""} ${d.isFuture ? styles.dayLabelFuture : ""}`}>{d.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Tip of the Day */}
                <div className={styles.tipBanner}>
                    <div className={styles.tipIcon}>
                        <FontAwesomeIcon icon={faLightbulb} style={{ color: "var(--db-purple-400)", fontSize: 15 }} />
                    </div>
                    <div className={styles.tipContent}>
                        <span className={styles.tipEyebrow}>Tip of the Day</span>
                        <span className={styles.tipText}>Carbs are your best fuel source — try a light meal 1&ndash;2 hrs before training.</span>
                    </div>
                </div>
                </div>

                {/* Stats row */}
                <div className={styles.statsRow}>
                    <div className={`${styles.statCard} ${styles.weekStatCard}`}>
                        {!loading && (
                            <span className={`${styles.streakCorner} ${styles.streakCornerBottom}`}>
                                <FontAwesomeIcon icon={faFire} /> {streak}
                            </span>
                        )}
                        {loading ? (
                            <>
                                <div className={styles.skeleton} style={{ width: 60, height: 10 }}></div>
                                <div className={styles.skeleton} style={{ width: 30, height: 23 }}></div>
                            </>
                        ) : (
                            <>
                                <div className={styles.statCardHeader}>
                                    <span className={styles.statCardLabel}>This Week</span>
                                    <svg width="24" height="13" viewBox="0 0 24 13">
                                        {weeklyCounts.map((count, i) => {
                                            const h = Math.max((count / maxWeeklyCount) * 13, 2);
                                            return (
                                                <rect
                                                    key={i}
                                                    x={i * 7}
                                                    y={13 - h}
                                                    width="4"
                                                    height={h}
                                                    rx="1.5"
                                                    fill={i === 3 ? "var(--db-blue-400)" : "var(--db-blue-600)"}
                                                    opacity={i === 3 ? 1 : 0.35 + i * 0.15}
                                                ></rect>
                                            );
                                        })}
                                    </svg>
                                </div>
                                <span className={styles.statValue}>{completedThisWeek}</span>
                                <span className={styles.statUnit}>workouts</span>
                            </>
                        )}
                    </div>

                    <button
                        className={`${styles.statCard} ${styles.statCardBtn} ${styles.routineStatCard}`}
                        onClick={() => navigate('/routines')}
                    >
                        {loading ? (
                            <>
                                <div className={styles.skeleton} style={{ width: 60, height: 10 }}></div>
                                <div className={styles.skeleton} style={{ width: 30, height: 23 }}></div>
                            </>
                        ) : (
                            <>
                                <div className={styles.statCardHeader}>
                                    <span className={styles.statCardLabel}>Routines</span>
                                    <FontAwesomeIcon icon={faClipboardList} style={{ color: "var(--db-purple-400)", fontSize: 13 }} />
                                </div>
                                <span className={styles.statValue}>{routineCount}</span>
                                <span className={styles.statUnit}>saved</span>
                            </>
                        )}
                    </button>

                    <div className={`${styles.statCard} ${styles.macroCard}`}>
                        <svg width="38" height="38" viewBox="0 0 48 48" style={{ opacity: 0.55 }}>
                            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--db-purple-500)" strokeWidth="6" strokeDasharray="45 68" transform="rotate(-90 24 24)"></circle>
                            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--db-blue-500)" strokeWidth="6" strokeDasharray="34 79" strokeDashoffset="-45" transform="rotate(-90 24 24)"></circle>
                            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--db-amber-500)" strokeWidth="6" strokeDasharray="34 79" strokeDashoffset="-79" transform="rotate(-90 24 24)"></circle>
                        </svg>
                        <span className={styles.macroTag}>Coming Soon</span>
                        <span className={styles.macroLabel}>Macro Tracking</span>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={styles.activityCard}>
                    <div className={styles.activityHeader}>
                        <FontAwesomeIcon icon={faListCheck} style={{ color: "var(--db-purple-400)", fontSize: 15 }} />
                        <span className={styles.activityTitle}>Recent Activity</span>
                    </div>

                    {loading ? (
                        <div className={styles.activityList}>
                            <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                        </div>
                    ) : recentActivity.length ? (
                        <div className={styles.activityList}>
                            {recentActivity.map((entry, i) => (
                                <div className={styles.activityRow} key={entry.id}>
                                    <div className={`${styles.activityAccent} ${i % 2 ? styles.activityAccentPurple : ""}`}></div>
                                    <div className={styles.activityInfo}>
                                        <div className={styles.activityDate}>{entry.date}</div>
                                        <div className={styles.activitySummary}>{entry.summary}</div>
                                    </div>
                                    <span className={`${styles.activityDuration} ${i % 2 ? styles.activityDurationPurple : ""}`}>
                                        {entry.duration}
                                    </span>
                                    <button
                                        className={styles.editActivityBtn}
                                        onClick={() => navigate(`/workout/${entry.id}`)}
                                        aria-label="Edit workout"
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
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
                        <div className={styles.emptyActivity}>
                            <div className={styles.emptyActivityIcon}>
                                <FontAwesomeIcon icon={faListCheck} style={{ color: "var(--db-text-tertiary)", fontSize: 18 }} />
                            </div>
                            <span className={styles.emptyText}>No workouts logged yet. Start your first one above to see it here.</span>
                        </div>
                    )}
                </div>
            </div>
            <Navbar/>
        </div>
    );
}

export default Dashboard;
