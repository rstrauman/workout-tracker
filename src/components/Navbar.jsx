import styles from "../pages/Dashboard/Dashboard.module.css";

function Navbar() {
    return (
        <nav className={styles.mainNav}>
            <ul>
                <li><p>Home</p></li>
                <li><p>Workout</p></li>
                <li><p>Meals</p></li>
                <li><p>Progress</p></li>
                <li><p>Settings</p></li>
            </ul>
        </nav>
    );
}

export default Navbar;