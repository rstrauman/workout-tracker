import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import styles from "./Profile.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faPen, faXmark, faCamera, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons'
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

function withTimeout(promise, ms, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);
}

function resizeImageToBlob(file, maxDimension = 512, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let { width, height } = img;
            if (width > height && width > maxDimension) {
                height = Math.round((height / width) * maxDimension);
                width = maxDimension;
            } else if (height > maxDimension) {
                width = Math.round((width / height) * maxDimension);
                height = maxDimension;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image"))),
                "image/jpeg",
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read that image file"));
        };
        img.src = objectUrl;
    });
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
    const [photoURL, setPhotoURL] = useState("");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
                    setPhotoURL(data.photoURL || "");
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

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            await modal.alert("Please choose an image file.");
            return;
        }
        const user = auth.currentUser;
        if (!user) return;

        setUploadingPhoto(true);
        try {
            const blob = await resizeImageToBlob(file);
            const photoRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
            await withTimeout(
                uploadBytes(photoRef, blob, { contentType: "image/jpeg" }),
                15000,
                "Photo upload timed out. Please try again in a moment."
            );
            const url = await getDownloadURL(photoRef);
            setPhotoURL(url);
        } catch (error) {
            await modal.alert(error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteObject(storageRef(storage, `users/${user.uid}/profile.jpg`));
            } catch {
                // nothing to delete, or it's already gone - fine either way
            }
        }
        setPhotoURL("");
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
                photoURL,
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
            <div className={styles.avatarRow}>
                <div className={styles.avatarWrap}>
                    {photoURL ? (
                        <img src={photoURL} alt="Profile" className={styles.avatarImg} />
                    ) : (
                        <div className={styles.avatarFallback}>
                            {firstName ? firstName[0].toUpperCase() : <FontAwesomeIcon icon={faUser} />}
                        </div>
                    )}
                    {isEditing && (
                        <label className={styles.avatarEditBadge} aria-label="Change profile photo">
                            <FontAwesomeIcon icon={uploadingPhoto ? faSpinner : faCamera} spin={uploadingPhoto} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                disabled={uploadingPhoto}
                                className={styles.avatarInput}
                            />
                        </label>
                    )}
                </div>
                {isEditing && photoURL && (
                    <button type="button" className={styles.removePhotoBtn} onClick={handleRemovePhoto}>
                        Remove photo
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