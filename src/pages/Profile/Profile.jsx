import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import styles from "./Profile.module.css"; 

function Profile({isOnboarding = false, isMetric = false}) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [email, setEmail] = useState("");
    const [tel, setTel] = useState("");
    const [goal, setGoal] = useState("Hypertrophy");
    const [activityLevel, setActivityLevel] = useState("Active");

    const [isEditing, setIsEditing] = useState(isOnboarding);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            if (!isOnboarding && auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setFirstName(data.firstName || "");
                    setLastName(data.lastName || "");
                    setWeight(data.weight || "");
                    setHeight(data.height || "");
                    setEmail(data.email || "");
                    setTel(data.tel || "")
                    setGoal(data.goal || "Hypertrophy");
                    setActivityLevel(data.activityLevel || "Moderate");
                }
            }
        };
        fetchUserData();
    }, [isOnboarding]);

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName, 
                weight: Number(weight), 
                height: Number(height),
                email,
                tel,
                goal,
                activityLevel, 
                isProfileComplete: true, 
                updatedAt: new Date()
                }, { merge: true });

                if (isOnboarding) {
                    navigate("/workout");
                } else {
                    setIsEditing(false);
                }
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
    <div className={styles.background}>
        <div className={styles.profileCard}>
            <h2>{isOnboarding ? "CreateProfile" : "Profile"}</h2>
            {!isOnboarding && !isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.editIcon}>
                    Edit Profile ✎
                </button>
            )}
            {!isOnboarding && isEditing && (
                <button onClick={() => setIsEditing(false)} className={styles.exitIcon}>
                    X
                </button>
            )}
            <div className={styles.contentContainer}>
                <div className={styles.stats}>
                    <input 
                        placeholder="First Name" 
                        value={firstName}
                        disabled={!isEditing}
                        onChange={(e) => setFirstName(e.target.value)} 
                    />
                    <input 
                        placeholder="Last Name" 
                        value={lastName}
                        disabled={!isEditing}
                        onChange={(e) => setLastName(e.target.value)} 
                    />
                </div>
                <div className={styles.stats}>
                    <input 
                        placeholder="Weight (kg)" 
                        value={isMetric ? `${weight} kg` : `${Math.round(weight * 2.20462)} lbs`}
                        disabled={!isEditing}
                        onChange={(e) => setWeight(e.target.value)} 
                    />
                    <input 
                        placeholder="Height (cm)" 
                        value={isMetric ? `${height} cm` : `${Math.floor(height / 2.54 / 12)}' ${Math.round((height / 2.54) % 12)}"`}
                        disabled={!isEditing}
                        onChange={(e) => setHeight(e.target.value)} 
                    />
                </div>
                {!isOnboarding && (
                    <div className={styles.stats}>
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={email} 
                                disabled={!isEditing} 
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                {!isOnboarding && (
                    <div className={styles.stats}>
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                            <input 
                                type="tel" 
                                placeholder="Phone Number" 
                                value={tel} 
                                pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                                disabled={!isEditing} 
                                onChange={(e) => setTel(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                <div className={styles.stats}>
                    <div className={styles.inputGroup}>
                        <label>Training Goal</label>
                        <select value={goal} disabled={!isEditing} onChange={(e) => setGoal(e.target.value)}>
                            <option value="Hypertrophy">Hypertrophy (Muscle Gain)</option>
                            <option value="Strength">Strength (Powerlifting)</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Fat Loss">Fat Loss (Cutting)</option>
                            <option value="Athletic Performance">Athletic Performance</option>
                        </select>
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Activity Level</label>
                        <select id="activityLevel" value={activityLevel} disabled={!isEditing} onChange={(e) => setActivityLevel(e.target.value)} className={styles.dropdown}>
                            <option value="Sedentary">Sedentary (Little to no exercise)</option>
                            <option value="Light">Light (Light exercise 1-3x per week or a Job where you spend time on your feet)</option>
                            <option value="Moderate">Moderate (Moderate exercise 3-5x per week)</option>
                            <option value="Vigorous">Very (Moderate-Vigorous exercise 6-7x per week, includes running or sports)</option>
                            <option value="Extra">Extra (Vigorous training 2x per day, have a job that requires hard physical labour)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className={styles.stats}>
                <button onClick={handleSave}>Save Profile</button>
                <button onClick={handleLogout}>Logout</button>
            </div>
        </div>
    </div>
  );
}

export default Profile;