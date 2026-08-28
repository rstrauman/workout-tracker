import styles from "../pages/Dashboard/Dashboard.module.css";

function AppSkeleton() {
    return (
        <div className={`${styles.main} ${styles.dashboardRoot}`}>
            <div className={styles.ambientGlow}></div>
            <div className={styles.scrollArea}>
                <div className={styles.header}>
                    <div>
                        <div className={`${styles.skeleton} ${styles.skeletonGreeting}`}></div>
                        <div className={`${styles.skeleton} ${styles.skeletonDate}`}></div>
                    </div>
                    <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                </div>

                <div className={styles.heroCard}>
                    <div className={`${styles.skeleton} ${styles.skeletonHeroLine}`}></div>
                </div>

                <div className={styles.weeklyCard}>
                    <div className={styles.dayRow}>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div className={styles.dayCol} key={i}>
                                <div className={`${styles.skeleton} ${styles.skeletonDay}`}></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.statsRow}>
                    <div className={`${styles.skeleton} ${styles.skeletonStatCard}`}></div>
                    <div className={`${styles.skeleton} ${styles.skeletonStatCard}`}></div>
                    <div className={`${styles.skeleton} ${styles.skeletonStatCard}`}></div>
                </div>

                <div className={styles.activityCard}>
                    <div className={styles.activityList}>
                        <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                        <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                        <div className={`${styles.skeleton} ${styles.skeletonActivityRow}`}></div>
                    </div>
                </div>
            </div>
            <div className={styles.mainNav} style={{ opacity: 0.5, minHeight: 62 }}></div>
        </div>
    );
}

export default AppSkeleton;
