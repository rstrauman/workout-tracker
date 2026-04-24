import { useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";


function Workout() {
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState([]);

  const addExercise = () => {
    if (!exercise) return;

    const newExercise = {
      name: exercise,
      sets,
      reps,
      weight
    };

    setWorkoutExercises([...workoutExercises, newExercise]);

    // reset inputs
    setExercise("");
    setSets("");
    setReps("");
    setWeight("");
  };

  const saveWorkout = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("No user logged in");
      return;
    }

    try {
      await addDoc(
        collection(db, "users", user.uid, "workouts"),
        {
          date: new Date(),
          exercises: workoutExercises
        }
      );

      alert("Workout saved!");
      setWorkoutExercises([]);
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
      <h2>Workout</h2>

      <input
        placeholder="Exercise"
        value={exercise}
        onChange={(e) => setExercise(e.target.value)}
      />

      <input
        placeholder="Sets"
        value={sets}
        onChange={(e) => setSets(e.target.value)}
      />

      <input
        placeholder="Reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
      />

      <input
        placeholder="Weight"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />

      <br /><br />

      <button onClick={addExercise}>Add Exercise</button>

      <ul>
        {workoutExercises.map((ex, index) => (
          <li key={index}>
            {ex.name} - {ex.sets}x{ex.reps} @ {ex.weight}
          </li>
        ))}
      </ul>

      <br />

      <button onClick={saveWorkout}>Save Workout</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Workout;