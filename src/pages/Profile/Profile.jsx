import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import styles from "./Profile.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faPen, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useModal } from "../../hooks/useModal";

const LBS_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

function lbsToDisplayWeight(lbs, unit) {
    if (!Number.isFinite(lbs)) return "";
    return unit === "metric" ? Math.round((lbs / LBS_PER_KG) * 10) / 10 : Math.round(lbs);
}

function displayWeightToLbs(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return unit === "metric" ? n * LBS_PER_KG : n;
}

function inchesToFeetAndInches(totalInches) {
    if (!Number.isFinite(totalInches)) return { feet: "", inches: "" };
    return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

function feetAndInchesToInches(feet, inches) {
    return (Number(feet) || 0) * 12 + (Number(inches) || 0);
}

function inchesToCm(totalInches) {
    return Number.isFinite(totalInches) ? Math.round(totalInches * CM_PER_IN) : "";
}

function cmToInches(cm) {
    const n = Number(cm);
    return Number.isFinite(n) ? n / CM_PER_IN : 0;
}

function Profile({isOnboarding = false}) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [unitSystem, setUnitSystem] = useState("imperial"); // 'imperial' | 'metric'
    const [weight, setWeight] = useState("");
    const [heightFeet, setHeightFeet] = useState("");
    const [heightInches, setHeightInches] = useState("");
    const [heightCm, setHeightCm] = useState("");
    const [tel, setTel] = useState("");
    const [goal, setGoal] = useState("Hypertrophy");
    const [activityLevel, setActivityLevel] = useState("Active");

    const [isEditing, setIsEditing] = useState(isOnboarding);
    const navigate = useNavigate();
    const modal = useModal();

    useEffect(() => {
        const fetchUserData = async () => {
            if (!isOnboarding && auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const savedUnit = data.unitSystem === "metric" ? "metric" : "imperial";
                    setUnitSystem(savedUnit);
                    setFirstName(data.firstName || "");
                    setLastName(data.lastName || "");
                    setWeight(lbsToDisplayWeight(data.weight, savedUnit));
                    if (savedUnit === "metric") {
                        setHeightCm(inchesToCm(data.height));
                    } else {
                        const { feet, inches } = inchesToFeetAndInches(data.height);
                        setHeightFeet(feet);
                        setHeightInches(inches);
                    }
                    setTel(data.tel || "")
                    setGoal(data.goal || "Hypertrophy");
                    setActivityLevel(data.activityLevel || "Moderate");
                }
            }
        };
        fetchUserData();
    }, [isOnboarding]);

    const toggleUnitSystem = () => {
        const nextUnit = unitSystem === "imperial" ? "metric" : "imperial";
        const lbs = displayWeightToLbs(weight, unitSystem);
        setWeight(lbsToDisplayWeight(lbs, nextUnit));

        const totalInches = unitSystem === "metric"
            ? cmToInches(heightCm)
            : feetAndInchesToInches(heightFeet, heightInches);

        if (nextUnit === "metric") {
            setHeightCm(inchesToCm(totalInches));
        } else {
            const { feet, inches } = inchesToFeetAndInches(totalInches);
            setHeightFeet(feet);
            setHeightInches(inches);
        }
        setUnitSystem(nextUnit);
    };

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const weightLbs = displayWeightToLbs(weight, unitSystem);
        const heightInchesTotal = unitSystem === "metric"
            ? cmToInches(heightCm)
            : feetAndInchesToInches(heightFeet, heightInches);

        try {
            await setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                weight: weightLbs,
                height: heightInchesTotal,
                unitSystem,
                email: user.email,
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
                await modal.alert(error.message);
            }
        };

    const dashboard = async () => {
        try {
            if (!isOnboarding) {
                navigate("/dashboard")
            }
        } catch (error) {
            await modal.alert(error.message);
        }
    }

  return (
    <div className={styles.background}>
        <div className={styles.profileCard}>
            <div className={styles.header}>
                <h2>{isOnboarding ? "CreateProfile" : "Profile"}</h2>
                {!isOnboarding && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className={styles.editIcon}>
                        Edit Profile <FontAwesomeIcon icon={faPen} />
                    </button>
                )}
                {!isOnboarding && isEditing && (
                    <button onClick={() => setIsEditing(false)} className={styles.exitIcon} aria-label="Cancel editing">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                )}
            </div>
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
                <div className={`${styles.stats} ${styles.fullWidth}`}>
                    <div className={styles.unitToggle}>
                        <button
                            type="button"
                            className={unitSystem === "imperial" ? styles.unitActive : ""}
                            disabled={!isEditing}
                            onClick={() => unitSystem !== "imperial" && toggleUnitSystem()}
                        >
                            lbs / ft-in
                        </button>
                        <button
                            type="button"
                            className={unitSystem === "metric" ? styles.unitActive : ""}
                            disabled={!isEditing}
                            onClick={() => unitSystem !== "metric" && toggleUnitSystem()}
                        >
                            kg / cm
                        </button>
                    </div>
                </div>
                <div className={styles.stats}>
                    <div className={styles.inputWithUnit}>
                        <input
                            type="number"
                            placeholder="Weight"
                            value={weight}
                            disabled={!isEditing}
                            onChange={(e) => setWeight(e.target.value)}
                        />
                        <span className={styles.unitSuffix}>{unitSystem === "metric" ? "kg" : "lbs"}</span>
                    </div>
                    {unitSystem === "metric" ? (
                        <div className={styles.inputWithUnit}>
                            <input
                                type="number"
                                placeholder="Height"
                                value={heightCm}
                                disabled={!isEditing}
                                onChange={(e) => setHeightCm(e.target.value)}
                            />
                            <span className={styles.unitSuffix}>cm</span>
                        </div>
                    ) : (
                        <div className={styles.heightImperial}>
                            <div className={styles.inputWithUnit}>
                                <input
                                    type="number"
                                    placeholder="Height"
                                    value={heightFeet}
                                    disabled={!isEditing}
                                    onChange={(e) => setHeightFeet(e.target.value)}
                                />
                                <span className={styles.unitSuffix}>ft</span>
                            </div>
                            <div className={styles.inputWithUnit}>
                                <input
                                    type="number"
                                    placeholder=""
                                    value={heightInches}
                                    disabled={!isEditing}
                                    onChange={(e) => setHeightInches(e.target.value)}
                                />
                                <span className={styles.unitSuffix}>in</span>
                            </div>
                        </div>
                    )}
                </div>
                {!isOnboarding && (
                    <div className={styles.stats}>
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={auth.currentUser?.email || ""}
                                disabled
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
                        <select className={styles.dropdown} value={goal} disabled={!isEditing} onChange={(e) => setGoal(e.target.value)}>
                            <option value="Hypertrophy">Hypertrophy (Muscle Gain)</option>
                            <option value="Strength">Strength (Powerlifting)</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Fat Loss">Fat Loss (Cutting)</option>
                            <option value="Athletic Performance">Athletic Performance</option>
                        </select>
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Activity Level</label>
                        <select className={styles.dropdown} id="activityLevel" value={activityLevel} disabled={!isEditing} onChange={(e) => setActivityLevel(e.target.value)}>
                            <option value="Sedentary">Sedentary (Little to no exercise)</option>
                            <option value="Light">Light (Light exercise 1-3x per week or a Job where you spend time on your feet)</option>
                            <option value="Moderate">Moderate (Moderate exercise 3-5x per week)</option>
                            <option value="Vigorous">Very (Moderate-Vigorous exercise 6-7x per week, includes running or sports)</option>
                            <option value="Extra">Extra (Vigorous training 2x per day, have a job that requires hard physical labour)</option>
                        </select>
                    </div>
                </div>
                <div className={styles.stats}>
                    <button className={styles.save} onClick={handleSave}>Save Profile</button>
                    <button className={styles.home} onClick={dashboard}>Home <FontAwesomeIcon icon={faHouse} /></button>
                </div>
            </div>
        </div>
    </div>
  );
}

export default Profile;