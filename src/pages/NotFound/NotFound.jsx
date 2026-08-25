import { useNavigate } from "react-router-dom";
import styles from "./NotFound.module.css";
import logo from "../../assets/SRP_Fitness_Logo.png";

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                <img src={logo} alt="Logo" className={styles.logo} />
                <h1>404</h1>
                <p className={styles.subtitle}>This page doesn't exist.</p>
                <button className={styles.mainBtn} onClick={() => navigate('/')}>
                    Take Me Back
                </button>
            </div>
        </div>
    );
}

export default NotFound;
