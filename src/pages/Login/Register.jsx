import styles from "./Login.module.css";

function LoginForm({ setEmail, setPassword, hanldeSignup, toggle }) {
  return (
    <div className={styles.formCard}>
      <h2>Register</h2>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={hanldeSignup}>Login</button>
      <p>Already have an account? <span onClick={toggle}>Login</span></p>
    </div>
  );
}

export default LoginForm;