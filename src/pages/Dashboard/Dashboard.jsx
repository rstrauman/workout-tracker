import React from 'react';
import styles from "./Dashboard.module.css";
import profile from "../../assets/Profile-Icon.png";
import Navbar from '../../components/Navbar';


function Dashboard() {
    return (
        <div className={styles.main}>
            <div className={styles.titleFlex}>
                <h2>Good Morning User</h2>
                <img src={profile} alt="Profile Image"/>
            </div>
            <div className={styles.midFlex}>
                <div className={styles.todaysWorkout}>
                    <div className={styles.card}>
                        <h3>Today's Workout</h3>
                        <div className={styles.workoutList}>
                            <p>Squat</p>
                            <p>Deadlift</p>
                            <p>Bench</p>
                        </div>
                    </div>
                </div>
                <div className={styles.midFlexCol}>
                    <div className={styles.tipOfTheDay}>
                        <div className={styles.card}>
                            <h3>Tip of the Day</h3>
                            <p>Did you know that carbs are the best source to fuel your workout?</p>
                        </div>
                    </div>
                    <div className={styles.weeklyGraph}>
                        <div className={styles.card}>
                            <p>This Week</p>
                            <div>Days</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.bottomFlex}>
                    <div className={styles.card}>
                    <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ad quo maiores itaque molestias expedita blanditiis quas doloribus unde vero dolores repudiandae quidem, architecto cumque illo! Blanditiis a quidem repellendus incidunt?</p>
                </div>
            </div>
            <Navbar/>
        </div>
    );
}

export default Dashboard;