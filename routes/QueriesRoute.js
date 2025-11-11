import express from "express";
import {
   getTeamProjectsSummary,
  getProjectTeamUserStats,
  getUserDurationsForProject,
  getUserDurations,
  getProjectUserHourlyRate,
  getProjectUserTimeLogs,
  getUsers,
  getActivityCategories,
  getUserDaysoff,
  getUserProjectTimeLogs,
  getUsersOverview,
  getProjectsOverviewByDateAndStatus,
  getTotalLoggedHours,
  getPreviousPeriodLoggedHours,
  getAllProjectDurationsInPeriod,
  getUserProjectDurationsInPeriod,
  getUserSubmissionFrequency,
  getUsersForProjectWithHours,
  getTotalActiveUsers,
  getTotalActiveProjects,
  getTotalUsersInProject,
  getDayoffUsersWithRate,
  updateKimaiDaysOff,
  getProjectUsersWithHourlyRate,
  getTotalProjectCost,
  getProjectBudget,
  getMonthlyCostsPerUser,
  getProjectUsersMonthlyHours, 
  getProjectManagersWithProjects,
  getUserExpectedVsSubmittedHours,
  getUserRateHistory ,
  updateUserRate,
  createUserRate
} from "../controllers/Queries.js"

import { verifyUser,adminOnly } from "../middleware/AuthUser.js";

const router = express.Router();


////////////////////////////

// Team-level project summary
router.get('/summary', verifyUser,adminOnly,getTeamProjectsSummary);
router.get('/user-project-hours',verifyUser,adminOnly,getUserDurationsForProject);
// Detailed stats for a specific project/team combination
router.get('/project/:projectId/team/:teamId', verifyUser,adminOnly,getProjectTeamUserStats);

// Duration summaries by user over a date range
router.get('/durations',  verifyUser,adminOnly,getUserDurations);

// Hourly rate + time tracking per user/project over time range and filter
router.get('/hourly-stats',  verifyUser,adminOnly,getProjectUserHourlyRate);

// Time log entries per user and project
router.get('/timelogs',  verifyUser,adminOnly,getProjectUserTimeLogs);

// List of all users (alias + ID)
router.get('/users',  verifyUser,adminOnly,getUsers);

// Activity breakdown (Normal/Sick/Educational) by user
router.get('/activity-categories', verifyUser,adminOnly, getActivityCategories);

// Time off (days off and user metadata)
router.get('/daysoff', verifyUser,adminOnly, getUserDaysoff);
router.get('/users-overview', verifyUser,adminOnly, getUsersOverview);
router.get('/users-overview-project-timelogs', verifyUser,adminOnly, getUserProjectTimeLogs);

//project overview: name duration allias enabled
router.get('/projects-overview',verifyUser,adminOnly, getProjectsOverviewByDateAndStatus);

router.get('/timesheets/total-logged-hours', verifyUser,adminOnly, getTotalLoggedHours);
router.get('/timesheets/previous-logged-hours', verifyUser,adminOnly, getPreviousPeriodLoggedHours);
router.get('/timesheets/project-duration', verifyUser,adminOnly, getAllProjectDurationsInPeriod);
router.get('/timesheets/user-project-hours',  verifyUser,adminOnly,getUserProjectDurationsInPeriod);
router.get('/timesheets/user-submission-frequency', verifyUser,adminOnly, getUserSubmissionFrequency);
router.get('/timesheets/user-expected-vs-submitted-hours', verifyUser,adminOnly, getUserExpectedVsSubmittedHours);

router.get('/timesheets/project-users-hours',verifyUser,adminOnly,  getUsersForProjectWithHours);

router.get('/active-count', verifyUser,adminOnly, getTotalActiveUsers);
router.get('/active-count-project',  verifyUser,adminOnly,getTotalActiveProjects);
router.get('/projects/total-users',  verifyUser,adminOnly,getTotalUsersInProject);
router.get('/dayoff-hourly-rates', verifyUser,adminOnly, getDayoffUsersWithRate);
router.get('/rates/:userid', verifyUser,adminOnly, getUserRateHistory);
router.patch('/rates', verifyUser,adminOnly, updateUserRate);
router.post('/rates', verifyUser, adminOnly, createUserRate);


router.patch('/update-hourly-rate', verifyUser,adminOnly, updateKimaiDaysOff)
router.get('/project-users-hourly-costs', verifyUser,adminOnly, getProjectUsersWithHourlyRate);
router.get('/timesheets/project-total-cost',verifyUser,adminOnly,  getTotalProjectCost);
router.get('/projects/budget', verifyUser,adminOnly, getProjectBudget);
router.get('/project-users-monthly-costs', verifyUser,adminOnly, getMonthlyCostsPerUser);
router.get('/project-users-monthly-hours', verifyUser,adminOnly, getProjectUsersMonthlyHours);
router.get('/stack-bar', verifyUser,adminOnly, getProjectManagersWithProjects)




//////////////////////////////


export default router;