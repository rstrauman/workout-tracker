import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../../components/Navbar';
import styles from "../Dashboard/Dashboard.module.css";
import pageStyles from "./ComingSoon.module.css";

function ComingSoon({ title, icon, description }) {
    const navigate = useNavigate();

    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={pageStyles.centerWrap}>
                    <div className={`${styles.card} ${styles.cardPurple} ${pageStyles.card}`}>
                        <FontAwesomeIcon icon={icon} className={pageStyles.icon} />
                        <h2>{title}</h2>
                        <span className={styles.soonBadge}>Coming Soon</span>
                        <p className={pageStyles.description}>{description}</p>
                        <button className={styles.startBtn} onClick={() => navigate('/dashboard')}>
                            <FontAwesomeIcon icon={faHouse} /> Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
            <Navbar />
        </div>
    );
}

export default ComingSoon;
