import React from 'react';
import styles from "./Dashboard.module.css";
import profile from "../../assets/Profile-Icon.png";


function Dashboard() {
    return (
        <div>
            <div className={styles.titleFlex}>
                <h2>Good Morning User</h2>
                <img src={profile} alt="Profile Image"/>
            </div>
            <div className={styles.midFlex}>
                <div className={styles.todaysWorkout}>
                    <div>Today's Workout Routine/Schedule</div>
                </div>
                <div className={styles.midFlexCol}>
                    <div className={styles.tipOfTheDay}>
                        <h3>Tip of the Day</h3>
                        <p>Did you know that carbs are the best source to fuel your workout?</p>
                    </div>
                    <div className={styles.weeklyGraph}>
                        <p>This Week</p>
                        <div>Days</div>
                    </div>
                </div>
            </div>
            <div className={styles.bottomFlex}>

            </div>
            
            <nav>
                <ul>
                    <li>Home</li>
                    <li>Workout</li>
                    <li>Meals</li>
                    <li>Progress</li>
                    <li>Settings</li>
                </ul>
            </nav>
        </div>
    );
}

export default Dashboard;