import cron from "node-cron";
import { checkBirthdays } from "./jobs/birthdayJob.js";

cron.schedule("0 0 * * *", () => {
  checkBirthdays();
});