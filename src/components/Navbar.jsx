import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faDumbbell, faUtensils, faChartLine, faGear } from '@fortawesome/free-solid-svg-icons';
import styles from "../pages/Dashboard/Dashboard.module.css";

const navItems = [
    { to: "/dashboard", label: "Home", icon: faHouse },
    { to: "/workout", label: "Workout", icon: faDumbbell },
    { to: "/meals", label: "Meals", icon: faUtensils },
    { to: "/progress", label: "Progress", icon: faChartLine },
    { to: "/profile", label: "Settings", icon: faGear },
];

function Navbar() {
    return (
        <nav className={styles.mainNav}>
            <ul>
                {navItems.map((item) => (
                    <li key={item.label}>
                        <NavLink
                            to={item.to}
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ""}`}
                        >
                            <span className={styles.navIndicator}></span>
                            <FontAwesomeIcon icon={item.icon} />
                            <p>{item.label}</p>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default Navbar;
