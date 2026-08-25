import styles from "../pages/Dashboard/Dashboard.module.css";

function AppSkeleton() {
    return (
        <div className={styles.main}>
            <div className={styles.scrollArea}>
                <div className={styles.titleFlex}>
                    <div>
                        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
                        <div className={`${styles.skeleton} ${styles.skeletonSubtitle}`}></div>
                    </div>
                    <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                </div>

                <div className={styles.contentSections}>
                    <div className={styles.midFlex}>
                        <div className={styles.todaysWorkout}>
                            <div className={styles.card}>
                                <div className={`${styles.skeleton} ${styles.skeletonHeading}`}></div>
                                <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                                <div className={`${styles.skeleton} ${styles.skeletonRow}`}></div>
                            </div>
                        </div>
                        <div className={styles.midFlexCol}>
                            <div className={styles.tipOfTheDay}>
                                <div className={styles.card}>
                                    <div className={`${styles.skeleton} ${styles.skeletonBlock}`}></div>
                                </div>
                            </div>
                            <div className={styles.weeklyGraph}>
                                <div className={styles.card}>
                                    <div className={`${styles.skeleton} ${styles.skeletonGraphBlock}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.mainNav} style={{ opacity: 0.5 }}></div>
        </div>
    );
}

export default AppSkeleton;
