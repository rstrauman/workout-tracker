const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { logger } = require("firebase-functions");
const { CloudBillingClient } = require("@google-cloud/billing");

// The name of the Pub/Sub topic your billing budget must be connected to
// (Console -> Billing -> Budgets & alerts -> your budget -> Manage notifications).
const BUDGET_TOPIC = "budget-alerts";

const billing = new CloudBillingClient();

// Safety net: once actual cost exceeds the configured budget amount, disable
// billing on this project so usage can't keep accruing charges unattended.
// This is a hard stop, not a warning - re-enabling billing afterward is a
// manual step (Console -> Billing -> link a billing account again).
exports.disableBillingOnBudgetExceeded = onMessagePublished(
    { topic: BUDGET_TOPIC, region: "us-central1" },
    async (event) => {
        const data = event.data.message.json;
        logger.info("Budget alert received", data);

        if (typeof data?.costAmount !== "number" || typeof data?.budgetAmount !== "number") {
            logger.warn("Unrecognized budget alert payload, taking no action", data);
            return;
        }

        if (data.costAmount <= data.budgetAmount) {
            logger.info(`Cost ${data.costAmount} is within budget ${data.budgetAmount} - no action.`);
            return;
        }

        const projectId = process.env.GCLOUD_PROJECT;
        const projectName = `projects/${projectId}`;

        const [billingInfo] = await billing.getProjectBillingInfo({ name: projectName });
        if (!billingInfo.billingEnabled) {
            logger.info("Billing is already disabled - nothing to do.");
            return;
        }

        logger.warn(
            `Cost ${data.costAmount} exceeded budget ${data.budgetAmount} on ${projectId} - disabling billing now.`
        );
        await billing.updateProjectBillingInfo({
            name: projectName,
            projectBillingInfo: { billingAccountName: "" },
        });
        logger.warn(`Billing disabled on ${projectId}.`);
    }
);
