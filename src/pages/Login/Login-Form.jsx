import styles from "./Login.module.css";
import logo from "../../assets/SRP_Fitness_Logo.png";
import darkGym from "../../assets/Gym_Background.png";

function LoginForm({ setEmail, setPassword, handleLogin, toggle }) {
  return (
    <div className={styles.formCard}>
      <img src={logo} alt="SRP Fitness Logo" className={styles.logo} />
      <div className={styles.loginDetails}>
        <h2>Welcome back</h2>
        <p className={styles.subtitle}>Please enter your details</p>
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button className={styles.mainBtn} onClick={handleLogin}>Sign in</button>
        <p className={styles.toggleText}>
          Don't have an account? <span onClick={toggle}>Sign up</span>
        </p>
      </div>
      <div className={styles.rightImage}>
        <img src={darkGym} alt="Gym Background" />
        <div className={styles.gradientOverlay}></div>
      </div>
    </div>
  );
}

export default LoginForm;