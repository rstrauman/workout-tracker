import { useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

function Profile() {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");

  const handleSave = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("No user logged in");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        name,
        weight,
        height,
        goal,
        email: user.email
      }, { merge: true });

      alert("Profile saved!");
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
    <div>
      <h2>Profile</h2>

      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input placeholder="Weight" onChange={(e) => setWeight(e.target.value)} />
      <input placeholder="Height" onChange={(e) => setHeight(e.target.value)} />
      <input placeholder="Goal" onChange={(e) => setGoal(e.target.value)} />

      <br /><br />

      <button onClick={handleSave}>Save Profile</button>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Profile;