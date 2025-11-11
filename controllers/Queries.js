import e from "express";
//import User from "../models/UserModel.js";
import argon2 from "argon2";
import db from "../config/db.js";
import sequelize from "../config/sequelize.js";

import {Op, Sequelize } from "sequelize";


// Helper to run raw SQL queries
const runQuery = async (query, params) => {
  return sequelize.query(query, {
    replacements: params,
    type: Sequelize.QueryTypes.SELECT,
  });
};

// Helper to run raw SQL queries
const runQuery2 = async (query, params) => {
  return sequelize.query(query, {
    replacements: params,
    type: Sequelize.QueryTypes.UPDATE,
  });
};






export const getTeamProjectsSummary = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All',
  };

  const selectedFilterValue = filterMap[filter] ?? 'All';

  let query = `
    SELECT 
      kimai2_users.alias AS username,
      kimai2_projects.name AS project_name,
      SUM(kimai2_timesheet.duration) AS duration,
      SUM((kimai2_timesheet.duration / 3600) * IFNULL(d.hourly_rate, 0)) AS budget,
      kimai2_projects.visible
    FROM kimai2_teams
    INNER JOIN kimai2_users_teams 
      ON kimai2_teams.id = kimai2_users_teams.team_id
    INNER JOIN kimai2_projects_teams 
      ON kimai2_projects_teams.team_id = kimai2_teams.id
    INNER JOIN kimai2_users 
      ON kimai2_users_teams.user_id = kimai2_users.id
    INNER JOIN kimai2_projects 
      ON kimai2_projects_teams.project_id = kimai2_projects.id
    INNER JOIN kimai2_timesheet 
      ON kimai2_timesheet.project_id = kimai2_projects.id 
      AND kimai2_timesheet.user = kimai2_users.id
    LEFT JOIN kimai2_daysoff d 
      ON d.user_id = kimai2_users.id
    WHERE kimai2_users_teams.teamlead = 1
      AND DATE(kimai2_timesheet.start_time) >= ?
      AND DATE(kimai2_timesheet.end_time) <= ?
  `;

  const params = [startdate, enddate];

  if (selectedFilterValue !== 'All') {
    query += ` AND kimai2_projects.visible = ?`;
    params.push(selectedFilterValue);
  }

  query += `
    GROUP BY kimai2_users.alias, kimai2_projects.name
    ORDER BY kimai2_users.alias
  `;

  try {
    const results = await runQuery(query, params);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching team project summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// // Controller to get team project summaries
// export const getTeamProjectsSummary = async (req, res) => {
//   const { startdate, enddate, filter } = req.query;

//   if (!startdate || !enddate || !filter) {
//     return res.status(400).json({ error: 'Missing startdate, enddate or filter' });
//   }

//   const filterMap = {
//     Active: 1,
//     Inactive: 0,
//     Total: 'All',
//   };

//   const selectedFilterValue = filterMap[filter] ?? 'All';

//   let query = `
//     SELECT 
//       kimai2_users.alias AS username,
//       kimai2_projects.name AS project_name,
//       SUM(kimai2_timesheet.duration) AS duration,
//       SUM((kimai2_timesheet.duration / 3600) * IFNULL(d.hourly_rate, 0)) AS budget,
//       kimai2_projects.visible
//     FROM kimai2_teams
//     INNER JOIN kimai2_users_teams 
//       ON kimai2_teams.id = kimai2_users_teams.team_id
//     INNER JOIN kimai2_projects_teams 
//       ON kimai2_projects_teams.team_id = kimai2_teams.id
//     INNER JOIN kimai2_users 
//       ON kimai2_users_teams.user_id = kimai2_users.id
//     INNER JOIN kimai2_projects 
//       ON kimai2_projects_teams.project_id = kimai2_projects.id
//     INNER JOIN kimai2_timesheet 
//       ON kimai2_timesheet.project_id = kimai2_projects.id 
//       AND kimai2_timesheet.user = kimai2_users.id
//     LEFT JOIN kimai2_daysoff d 
//       ON d.user_id = kimai2_users.id
//     WHERE kimai2_users_teams.teamlead = 1
//       AND DATE(kimai2_timesheet.start_time) >= ?
//       AND DATE(kimai2_timesheet.end_time) <= ?
//   `;

//   const params = [startdate, enddate];

//   if (selectedFilterValue !== 'All') {
//     query += ` AND kimai2_projects.visible = ?`;
//     params.push(selectedFilterValue);
//   }

//   query += `
//     GROUP BY kimai2_users.alias, kimai2_projects.name
//     ORDER BY kimai2_users.alias
//   `;

//   try {
//     const [results] = await runQuery(query, params);
//     res.status(200).json(results);
//   } catch (error) {
//     console.error("Error fetching team project summary:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };



export const getUserDurationsForProject = async (req, res) => {
  const { projectName, startdate, enddate, filter } = req.query;

  if (!projectName || !startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All',
  };

  const selectedFilterValue = filterMap[filter] ?? 'All';

  let query = `
    SELECT 
      u.alias AS username,
      SUM(t.duration) / 3600 AS total_hours
    FROM kimai2_timesheet t
    INNER JOIN kimai2_users u ON t.user = u.id
    INNER JOIN kimai2_projects p ON t.project_id = p.id
    WHERE p.name = ?
      AND DATE(t.start_time) >= ?
      AND DATE(t.end_time) <= ?
  `;

  const params = [projectName, startdate, enddate];

  if (selectedFilterValue !== 'All') {
    query += ` AND p.visible = ?`;
    params.push(selectedFilterValue);
  }

  query += `
    GROUP BY u.alias
    ORDER BY total_hours DESC
  `;

  try {
    const results = await runQuery(query, params);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching user durations for project:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};





export const getProjectTeamUserStats = async (req, res) => {
  const { projectId, teamId } = req.params;
  try {
    const results = await runQuery(`
      SELECT kimai2_projects_teams.*, kimai2_projects.name, kimai2_projects.visible,
             kimai2_projects.time_budget, kimai2_projects.budget,
             kimai2_users_teams.user_id, kimai2_users_teams.teamlead,
             (
               SELECT SUM(kimai2_timesheet.duration)
               FROM kimai2_timesheet
               WHERE kimai2_timesheet.user = kimai2_users_teams.user_id
                 AND kimai2_timesheet.project_id = kimai2_projects_teams.project_id
             ) AS duration,
             kimai2_users.alias AS username, kimai2_teams.name AS team_name
      FROM kimai2_projects_teams
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_projects_teams.project_id
      INNER JOIN kimai2_users_teams ON kimai2_users_teams.team_id = kimai2_projects_teams.team_id
      INNER JOIN kimai2_timesheet ON kimai2_timesheet.user = kimai2_users_teams.user_id
         AND kimai2_timesheet.project_id = kimai2_projects_teams.project_id
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_users_teams.user_id
      INNER JOIN kimai2_teams ON kimai2_teams.id = kimai2_projects_teams.team_id
      WHERE kimai2_projects_teams.project_id = ? AND kimai2_projects_teams.team_id = ?
      GROUP BY kimai2_users_teams.user_id
    `, [projectId, teamId]);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching project team user stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserDurations = async (req, res) => {
  const { startdate, enddate } = req.query;
  try {
    const results = await runQuery(`
      SELECT kimai2_users.alias, SUM(kimai2_timesheet.duration) as duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      WHERE DATE(start_time) >= ? AND DATE(start_time) <= ?
      GROUP BY kimai2_users.alias
    `, [startdate, enddate]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching user durations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProjectUserHourlyRate = async (req, res) => {
  const { startdate, enddate, filterCondition } = req.query;
  try {
    const results = await runQuery(`
      SELECT kimai2_projects.name, kimai2_users.alias, kimai2_users.enabled,
             SUM(kimai2_timesheet.duration) as duration,
             MIN(kimai2_timesheet.start_time) as startime,
             MAX(kimai2_timesheet.start_time) as lasttime,
             kimai2_projects.visible,
             kimai2_user_preferences.name as rate,
             kimai2_user_preferences.value
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      INNER JOIN kimai2_user_preferences ON kimai2_users.id = kimai2_user_preferences.user_id
      WHERE DATE(start_time) >= ? AND DATE(start_time) <= ?
        AND kimai2_user_preferences.name = 'hourly_rate'
        AND (${filterCondition})
      GROUP BY kimai2_users.alias, kimai2_projects.name, kimai2_projects.visible,
               kimai2_user_preferences.name, kimai2_user_preferences.value, kimai2_users.enabled
    `, [startdate, enddate]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching project user hourly rate:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProjectUserTimeLogs = async (req, res) => {
  const { alias, projectName } = req.query;
  try {
    const results = await runQuery(`
      SELECT kimai2_users.alias, kimai2_projects.name,
             kimai2_timesheet.start_time, kimai2_timesheet.duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE kimai2_users.alias = ? AND kimai2_projects.name = ?
    `, [alias, projectName]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching project user time logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const results = await runQuery(`
      SELECT kimai2_users.id, kimai2_users.alias as name FROM kimai2_users
    `);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getActivityCategories = async (req, res) => {
  const { userId } = req.query;
  try {
    const results = await runQuery(`
      SELECT start_time,
             CASE
               WHEN activity_id = 4 THEN 'Normal'
               WHEN activity_id = 115 THEN 'Sick'
               WHEN activity_id = 116 THEN 'Educational'
               ELSE 'Other'
             END AS category
      FROM kimai2_timesheet
      WHERE (activity_id IN (4, 115, 116)) AND user = ?
    `, [userId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching activity categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserDaysoff = async (req, res) => {
  const { userId } = req.query;
  try {
    const results = await runQuery(`
      SELECT kimai2_daysoff.total_daysoff, kimai2_daysoff.user_id,
             kimai2_users.alias, kimai2_users.avatar
      FROM kimai2_daysoff
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_daysoff.user_id
      WHERE kimai2_daysoff.user_id = ?
    `, [userId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching user daysoff:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUsersOverview = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All'
  };

  const selectedFilterValue = filterMap[filter] ?? 'All';

  // const baseQuery = `
  //   SELECT kimai2_projects.name, kimai2_users.alias, kimai2_users.enabled,
  //          SUM(kimai2_timesheet.duration) as duration,
  //          MIN(kimai2_timesheet.start_time) as startime,
  //          MAX(kimai2_timesheet.start_time) as lasttime,
  //          kimai2_projects.visible,
  //          kimai2_user_preferences.name as rate,
  //          kimai2_user_preferences.value
  //   FROM kimai2_timesheet
  //   INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
  //   INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
  //   INNER JOIN kimai2_user_preferences ON kimai2_users.id = kimai2_user_preferences.user_id

  //   WHERE DATE(start_time) >= ? AND DATE(start_time) <= ?
  //     AND kimai2_user_preferences.name = 'hourly_rate'
  //     ${selectedFilterValue !== 'All' ? 'AND kimai2_projects.visible = ?' : ''}
  //   GROUP BY kimai2_users.alias, kimai2_projects.name, kimai2_projects.visible,
  //            kimai2_user_preferences.name, kimai2_user_preferences.value, kimai2_users.enabled
  // `;
  const baseQuery=`
    SELECT kimai2_projects.name, kimai2_users.alias, kimai2_users.enabled,
           SUM(kimai2_timesheet.duration) as duration,
           MIN(kimai2_timesheet.start_time) as startime,
           MAX(kimai2_timesheet.start_time) as lasttime,
           kimai2_projects.visible,
           kimai2_daysoff.hourly_rate as rate
    FROM kimai2_timesheet
    INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
    INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
    INNER JOIN kimai2_daysoff ON kimai2_daysoff.user_id=kimai2_users.id    

    WHERE DATE(start_time) >= ? AND DATE(start_time) <= ?
    ${selectedFilterValue !== 'All' ? 'AND kimai2_projects.visible = ?' : ''}
    GROUP BY kimai2_users.alias, kimai2_projects.name, kimai2_projects.visible,
             kimai2_daysoff.hourly_rate, kimai2_users.enabled
  `

  const params = [startdate, enddate];
  if (selectedFilterValue !== 'All') {
    params.push(selectedFilterValue);
  }

  try {
    const results = await runQuery(baseQuery, params);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching users overview:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUserProjectTimeLogs = async (req, res) => {
  const { alias, project } = req.query;

  if (!alias || !project) {
    return res.status(400).json({ error: 'Missing alias or project name' });
  }

  try {
    const results = await runQuery(`
      SELECT kimai2_users.alias, kimai2_projects.name, kimai2_timesheet.start_time, kimai2_timesheet.duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE kimai2_users.alias = ? AND kimai2_projects.name = ?
    `, [alias, project]);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching project time logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProjectsOverviewByDateAndStatus = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All'
  };

  const selectedFilterValue = filterMap[filter] ?? 'All';

  const baseQuery = `
    SELECT 
      kimai2_projects.name AS project_name,
      kimai2_users.alias AS alias,
      kimai2_users.enabled,
      SUM(kimai2_timesheet.duration) AS duration,
      MIN(kimai2_timesheet.start_time) AS starttime,
      MAX(kimai2_timesheet.start_time) AS lasttime
    FROM kimai2_timesheet
    INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
    INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
    WHERE DATE(kimai2_timesheet.start_time) >= ? 
      AND DATE(kimai2_timesheet.start_time) <= ?
      ${selectedFilterValue !== 'All' ? 'AND kimai2_projects.visible = ?' : ''}
    GROUP BY kimai2_users.alias, kimai2_projects.name, kimai2_users.enabled
    ORDER BY kimai2_projects.name, kimai2_users.alias
  `;

  const params = [startdate, enddate];
  if (selectedFilterValue !== 'All') {
    params.push(selectedFilterValue);
  }

  try {
    const results = await runQuery(baseQuery, params);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching project overview:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTotalLoggedHours = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate, or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All'
  };

  const visibility = filterMap[filter];
  const projectFilterCondition =
    visibility === 'All' ? '1=1' : `kimai2_projects.visible = ${visibility}`;

  try {
    const results = await runQuery(`
      SELECT 
        SUM(kimai2_timesheet.duration) AS total_duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE DATE(kimai2_timesheet.start_time) >= ?
        AND DATE(kimai2_timesheet.start_time) <= ?
        AND (${projectFilterCondition})
    `, [startdate, enddate]);

    const duration = results[0].total_duration || 0;
    const hours = Math.floor(duration / 3600);

    res.status(200).json({ hours });
  } catch (error) {
    console.error("Error fetching total logged hours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPreviousPeriodLoggedHours = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate, or filter' });
  }

  try {
    const start = new Date(startdate);
    const end = new Date(enddate);
    const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - dayCount + 1);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    const filterMap = {
      Active: 1,
      Inactive: 0,
      Total: 'All'
    };

    const visibility = filterMap[filter];
    const projectFilterCondition =
      visibility === 'All' ? '1=1' : `kimai2_projects.visible = ${visibility}`;

    const results = await runQuery(`
      SELECT 
        SUM(kimai2_timesheet.duration) AS total_duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE DATE(kimai2_timesheet.start_time) >= ?
        AND DATE(kimai2_timesheet.start_time) <= ?
        AND (${projectFilterCondition})
    `, [prevStartStr, prevEndStr]);

    const duration = results[0].total_duration || 0;
    const hours = Math.floor(duration / 3600);

    res.status(200).json({
      hours: hours,
      prev_start: prevStartStr,
      prev_end: prevEndStr
    });
  } catch (error) {
    console.error("Error fetching previous period logged hours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllProjectDurationsInPeriod = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate, or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All'
  };

  const visibility = filterMap[filter];
  const projectFilterCondition =
    visibility === 'All' ? '1=1' : `kimai2_projects.visible = ${visibility}`;

  try {
    const results = await runQuery(`
      SELECT 
        kimai2_projects.name AS project_name,
        kimai2_projects.visible,
        SUM(kimai2_timesheet.duration) AS total_duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE DATE(kimai2_timesheet.start_time) >= ?
        AND DATE(kimai2_timesheet.start_time) <= ?
        AND (${projectFilterCondition})
      GROUP BY kimai2_projects.name, kimai2_projects.visible
      ORDER BY total_duration DESC
    `, [startdate, enddate]);

    const formatted = results.map(row => ({
      project_name: row.project_name,
      visible: row.visible === 1,
      hours: Math.floor((row.total_duration || 0) / 3600)
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching project durations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserProjectDurationsInPeriod = async (req, res) => {
  const { startdate, enddate } = req.query;

  if (!startdate || !enddate) {
    return res.status(400).json({ error: 'Missing startdate or enddate' });
  }

  try {
    const results = await runQuery(`
      SELECT 
        kimai2_users.alias AS username,
        kimai2_projects.name AS project_name,
        SUM(kimai2_timesheet.duration) AS total_duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE DATE(kimai2_timesheet.start_time) >= ?
        AND DATE(kimai2_timesheet.start_time) <= ?
      GROUP BY kimai2_users.alias, kimai2_projects.name
      ORDER BY kimai2_users.alias, kimai2_projects.name
    `, [startdate, enddate]);

    const formatted = results.map(row => ({
      username: row.username,
      project_name: row.project_name,
      hours: Math.floor((row.total_duration || 0) / 3600)
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching user project durations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserSubmissionFrequency = async (req, res) => {
  const { startdate, enddate } = req.query;

  if (!startdate || !enddate) {
    return res.status(400).json({ error: 'Missing startdate or enddate' });
  }

  try {
    // Only include enabled users
    const users = await runQuery(`
      SELECT id, alias FROM kimai2_users
      WHERE alias != 'ADMINISTRATOR' AND enabled = 1
    `);

    const entries = await runQuery(`
      SELECT 
        kimai2_timesheet.user AS user_id,
        DATE(kimai2_timesheet.start_time) AS submission_date
      FROM kimai2_timesheet
      WHERE DATE(kimai2_timesheet.start_time) BETWEEN ? AND ?
      GROUP BY kimai2_timesheet.user, DATE(kimai2_timesheet.start_time)
    `, [startdate, enddate]);

    const submissionMap = {};
    entries.forEach(row => {
      if (!submissionMap[row.user_id]) submissionMap[row.user_id] = new Set();
      submissionMap[row.user_id].add(row.submission_date);
    });

    const start = new Date(startdate);
    const end = new Date(enddate);
    const daysInRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const result = users.map(user => {
      const submissions = submissionMap[user.id]?.size || 0;
      const avg_gap = submissions > 0 ? (daysInRange / submissions).toFixed(2) : null;

      return {
        username: user.alias,
        submissions,
        days_range: daysInRange,
        avg_gap
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error calculating user submission frequency:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUsersForProjectWithHours = async (req, res) => {
  const { projectName, startdate, enddate, filter } = req.query;

  if (!projectName || !startdate || !enddate || !filter) {
    console.log("Project Name: ", projectName)
    return res.status(400).json({ error: 'Missing projectName, startdate, enddate or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All'
  };

  const visibility = filterMap[filter];
  const visibilityCondition =
    visibility === 'All' ? '1=1' : `kimai2_projects.visible = ${visibility}`;

  try {
    const results = await runQuery(`
      SELECT 
        kimai2_users.alias AS username,
        SUM(kimai2_timesheet.duration) AS total_duration
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_users.id = kimai2_timesheet.user
      INNER JOIN kimai2_projects ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE kimai2_projects.name = ?
        AND DATE(kimai2_timesheet.start_time) BETWEEN ? AND ?
        AND (${visibilityCondition})
      GROUP BY kimai2_users.alias
      ORDER BY total_duration DESC
    `, [projectName, startdate, enddate]);

    const formatted = results.map(row => ({
      username: row.username,
      hours: Math.floor((row.total_duration || 0) / 3600)
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching user hours for project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTotalActiveUsers = async (req, res) => {
  const { startdate, enddate } = req.query;

  if (!startdate || !enddate) {
    return res.status(400).json({ error: "startdate and enddate are required" });
  }

  try {
    const results = await runQuery(`
      SELECT COUNT(DISTINCT kimai2_users.id) AS total_active_users
      FROM kimai2_users
      INNER JOIN kimai2_timesheet ON kimai2_users.id = kimai2_timesheet.user
      WHERE kimai2_users.enabled = 1
        AND DATE(kimai2_timesheet.start_time) BETWEEN ? AND ?
    `, [startdate, enddate]);

    res.status(200).json({ total: results[0].total_active_users });
  } catch (error) {
    console.error("Error fetching total active users in period:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getTotalActiveProjects = async (req, res) => {
  const { startdate, enddate } = req.query;

  if (!startdate || !enddate) {
    return res.status(400).json({ error: "startdate and enddate are required" });
  }

  try {
    const results = await runQuery(`
      SELECT COUNT(DISTINCT kimai2_projects.id) AS total_active_projects
      FROM kimai2_projects
      INNER JOIN kimai2_timesheet ON kimai2_projects.id = kimai2_timesheet.project_id
      WHERE kimai2_projects.visible = 1
        AND DATE(kimai2_timesheet.start_time) BETWEEN ? AND ?
    `, [startdate, enddate]);

    res.status(200).json({ total: results[0].total_active_projects });
  } catch (error) {
    console.error("Error fetching total active projects in period:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTotalUsersInProject = async (req, res) => {
  const { projectName, startdate, enddate } = req.query;

  if (!projectName || !startdate || !enddate) {
    return res.status(400).json({ error: "projectName, startdate, and enddate are required" });
  }

  try {
    const results = await runQuery(`
      SELECT COUNT(DISTINCT kimai2_users.id) AS total_users
      FROM kimai2_timesheet
      INNER JOIN kimai2_users ON kimai2_timesheet.user = kimai2_users.id
      INNER JOIN kimai2_projects ON kimai2_timesheet.project_id = kimai2_projects.id
      WHERE kimai2_projects.name = ?
        AND DATE(kimai2_timesheet.start_time) BETWEEN ? AND ?
    `, [projectName, startdate, enddate]);

    res.status(200).json({ total_users: results[0].total_users });
  } catch (error) {
    console.error("Error fetching total users for project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// export const getDayoffUsersWithRate = async (req, res) => {
//   try {
//     const results = await runQuery(`
//       SELECT 
//         d.user_id,
//         u.alias AS username,
//         d.hourly_rate
//       FROM kimai2_daysoff d
//       JOIN kimai2_users u ON d.user_id = u.id
//     `, []);

//     console.log("✅ Dayoff query results:", results);

//     if (!results) {
//       console.warn("⚠️ WARNING: results is null or undefined");
//     }

//     res.status(200).json(results);
//   } catch (error) {
//     console.error("❌ Error fetching dayoff users and hourly rates:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

export const getDayoffUsersWithRate = async (req, res) => {
  try {
    const rows = await runQuery(
      `
      SELECT 
        u.id AS user_id,
        u.alias AS username,
        u.avatar AS avatar,
        r.hourly_rate,
        r.effective_from
      FROM kimai2_users u
      LEFT JOIN (
        SELECT r1.user_id, r1.hourly_rate, r1.effective_from
        FROM kimai2_user_rates r1
        JOIN (
          SELECT user_id, MAX(effective_from) AS max_eff
          FROM kimai2_user_rates
          GROUP BY user_id
        ) m 
          ON m.user_id = r1.user_id 
         AND m.max_eff = r1.effective_from
      ) r ON r.user_id = u.id
      WHERE u.enabled = 1
      ORDER BY u.alias
      `
    );

    const result = rows.map(r => ({
      user_id: r.user_id,
      username: r.username,
      avatar: r.avatar,
      hourly_rate: r.hourly_rate ? Number(r.hourly_rate) : 0,
      effective_from: r.effective_from,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching users' current rates:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const getUserRateHistory = async (req, res) => {
  const userid  = req.params.userid;

  if (!userid) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const rows = await runQuery(
      `
      SELECT 
        r.user_id,
        u.alias AS username,
        r.effective_from,
        r.hourly_rate
      FROM kimai2_user_rates r
      LEFT JOIN kimai2_users u ON u.id = r.user_id
      WHERE r.user_id = ?
      ORDER BY r.effective_from DESC
      `,
      [userid]
    );

    // normalize numeric types
    const result = rows.map(r => ({
      user_id: r.user_id,
      username: r.username,
      effective_from: r.effective_from,           // 'YYYY-MM-DD'
      hourly_rate: r.hourly_rate != null ? Number(r.hourly_rate) : null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching user rate history:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const updateUserRate = async (req, res) => {
  const { userId, effective_from, hourly_rate } = req.body;

  if (!userId || !effective_from || hourly_rate == null) {
    return res.status(400).json({ error: "userId, effective_from and hourly_rate are required" });
  }
  const rate = Number(hourly_rate);
  if (Number.isNaN(rate) || rate < 0) {
    return res.status(400).json({ error: "hourly_rate must be a non-negative number" });
  }

  try {
    await runQuery2(
      `
      UPDATE kimai2_user_rates
      SET hourly_rate = ?
      WHERE user_id = ? AND effective_from = ?
      `,
      [rate, userId, effective_from]
    );

    // If you want to detect "not found", you can inspect the metadata from sequelize.query.
    // For simplicity, we return ok=true.
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error updating user rate:", err);
    return res.status(500).json({ error: "Database update failed" });
  }
};


// export const updateKimaiDaysOff = async(req,res) =>
// {
//   const { userId, hourly_rate } = req.body;

//   if (!userId || hourly_rate === undefined) {
//     return res.status(400).json({ error: 'Missing user_Id or hourly_rate' });
//   }

//   try {
//     await db.query(
//       'UPDATE kimai2_daysoff SET hourly_rate = ? WHERE user_id = ?',
//       [hourly_rate, userId]
//     );
//     res.json({ message: 'Hourly rate updated successfully' });
//   } catch (err) {
//     console.error('Update error:', err);
//     res.status(500).json({ error: 'Database update failed' });
//   }
// }

export const updateKimaiDaysOff = async (req, res) => {
  const { userId, hourly_rate } = req.body;

  if (!userId || hourly_rate === undefined) {
    return res.status(400).json({ error: 'Missing userId or hourly_rate' });
  }

  try {
    await runQuery2(
      'UPDATE kimai2_daysoff SET hourly_rate = ? WHERE user_id = ?',
      [hourly_rate, userId]
    );

    res.json({ message: 'Hourly rate updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
};

// export const getProjectUsersWithHourlyRate = async (req, res) => {
//   const { projectName, startdate, enddate } = req.query;

//   try {
//     const rows = await runQuery(
//       `SELECT 
//          u.alias AS username,
//          SUM(t.duration) AS total_duration,
//          d.hourly_rate
//        FROM kimai2_timesheet t
//        JOIN kimai2_users u ON t.user = u.id
//        JOIN kimai2_projects p ON t.project_id = p.id
//        LEFT JOIN kimai2_daysoff d ON d.user_id = u.id
//        WHERE p.name = ? AND t.start_time BETWEEN ? AND ?
//        GROUP BY u.id`,
//       [projectName, startdate, enddate]
//     );

//     const result = rows.map(row => ({
//       username: row.username,
//       hours: row.total_duration / 3600,
//       hourly_rate: parseFloat(row.hourly_rate || 0),
//       total_cost: (row.total_duration / 3600) * parseFloat(row.hourly_rate || 0)
//     }));

//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Database error' });
//   }
// };
export const getProjectUsersWithHourlyRate = async (req, res) => {
  const { projectName, startdate, enddate } = req.query;

  if (!projectName || !startdate || !enddate) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const rows = await runQuery(
      `
      SELECT 
        u.alias AS username,
        SUM(t.duration) / 3600 AS hours,
        SUM(
          (t.duration / 3600) *
          IFNULL((
            SELECT r.hourly_rate
            FROM kimai2_user_rates r
            WHERE r.user_id = t.\`user\`
              AND r.effective_from <= DATE(t.start_time)
            ORDER BY r.effective_from DESC
            LIMIT 1
          ), 0)
        ) AS total_cost
      FROM kimai2_timesheet t
      JOIN kimai2_users u    ON u.id = t.\`user\`
      JOIN kimai2_projects p ON p.id = t.project_id
      WHERE p.name = ?
        AND t.start_time >= ?
        AND t.start_time <  ?
      GROUP BY u.id, u.alias
      ORDER BY u.alias
      `,
      [projectName, startdate, enddate]
    );

    // normalize numbers; optionally round as you wish
    const result = rows.map(r => ({
      username: r.username,
      hours: Number(r.hours),            // or: Math.round(r.hours * 100) / 100
      total_cost: Number(r.total_cost),  // or: Math.round(r.total_cost * 100) / 100
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching project users hourly costs:", err);
    res.status(500).json({ error: "Database error" });
  }
};


// controller/timesheets.js

export const getTotalProjectCost = async (req, res) => {
  const { projectName, startdate, enddate } = req.query;

  if (!projectName || !startdate || !enddate) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const query = `
    SELECT 
      SUM((t.duration / 3600) * IFNULL(d.hourly_rate, 0)) AS total_cost
    FROM kimai2_timesheet t
    JOIN kimai2_users u ON u.id = t.user
    JOIN kimai2_projects p ON p.id = t.project_id
    LEFT JOIN kimai2_daysoff d ON d.user_id = u.id
    WHERE p.name = ? AND t.start_time BETWEEN ? AND ?
  `;

  try {
    const rows = await runQuery(query, [projectName, startdate, enddate]);
    const total = rows[0]?.total_cost ?? 0;

    res.json(total);
  } catch (error) {
    console.error("Error calculating total project cost:", error);
    res.status(500).json({ error: "Failed to calculate total project cost" });
  }
};




export const getProjectBudget = async (req, res) => {
  const { projectName } = req.query;
  try {
    const rows = await runQuery(
      `SELECT budget FROM kimai2_projects WHERE name = ?`,
      [projectName]
    );
    if (rows.length > 0) {
      res.json({ budget: rows[0].budget });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (err) {
    console.error("Error fetching project budget:", err);
    res.status(500).json({ error: "Database error" });
  }
};


export const getMonthlyCostsPerUser = async (req, res) => {
  const { projectName, year } = req.query;

  if (!projectName || !year) {
    return res.status(400).json({ error: "Missing projectName or year" });
  }

  try {
    const rows = await runQuery(
      `
      SELECT 
        u.alias,
        MONTH(t.start_time) AS month,
        -- total hours in the month (for reference if you need it later)
        SUM(TIMESTAMPDIFF(SECOND, t.start_time, t.end_time)) / 3600 AS hours,
        -- time-aware monthly cost
        SUM(
          (TIMESTAMPDIFF(SECOND, t.start_time, t.end_time) / 3600) *
          IFNULL((
            SELECT r.hourly_rate
            FROM kimai2_user_rates r
            WHERE r.user_id = t.\`user\`
              AND r.effective_from <= DATE(t.start_time)
            ORDER BY r.effective_from DESC
            LIMIT 1
          ), 0)
        ) AS cost
      FROM kimai2_timesheet t
      JOIN kimai2_users u    ON u.id = t.\`user\`
      JOIN kimai2_projects p ON p.id = t.project_id
      WHERE p.name = ? 
        AND YEAR(t.start_time) = ?
      GROUP BY u.id, u.alias, month
      ORDER BY u.alias, month
      `,
      [projectName, year]
    );

    // Build: [{ alias, monthly_costs: [12 numbers] }]
    const resultByUser = {};
    for (const row of rows) {
      const { alias, month, cost } = row;
      if (!resultByUser[alias]) {
        resultByUser[alias] = new Array(12).fill(0);
      }
      resultByUser[alias][Number(month) - 1] = Number(cost) || 0;
    }

    const formatted = Object.entries(resultByUser).map(([alias, monthly_costs]) => ({
      alias,
      monthly_costs,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching monthly user costs:", error);
    res.status(500).json({ error: "Database error" });
  }
};


// export const getMonthlyCostsPerUser = async (req, res) => {
//   const { projectName, year } = req.query;

//   if (!projectName || !year) {
//     return res.status(400).json({ error: "Missing projectName or year" });
//   }

//   try {
//     const rows = await runQuery(`
//       SELECT 
//         u.alias,
//         MONTH(t.start_time) AS month,
//         SUM(TIMESTAMPDIFF(SECOND, t.start_time, t.end_time)) / 3600 AS hours,
//         COALESCE(d.hourly_rate, 0) AS hourly_rate,
//         (SUM(TIMESTAMPDIFF(SECOND, t.start_time, t.end_time)) / 3600) * COALESCE(d.hourly_rate, 0) AS cost
//       FROM kimai2_timesheet t
//       JOIN kimai2_users u ON u.id = t.user
//       LEFT JOIN kimai2_daysoff d ON d.user_id = u.id
//       JOIN kimai2_projects p ON p.id = t.project_id
//       WHERE p.name = ? AND YEAR(t.start_time) = ?
//       GROUP BY u.alias, month
//       ORDER BY u.alias, month
//     `, [projectName, year]);

//     // Organize data by user
//     const result = {};
//     for (let row of rows) {
//       const { alias, month, cost } = row;
//       if (!result[alias]) {
//         result[alias] = new Array(12).fill(0);
//       }
//       result[alias][month - 1] = cost;
//     }

//     const formatted = Object.entries(result).map(([alias, monthly_costs]) => ({
//       alias,
//       monthly_costs,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     console.error("Error fetching monthly user costs:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// };

// export const getProjectUsersMonthlyHours = async (req, res) => {
//   const { projectName, year } = req.query;

//   if (!projectName || !year) {
//     return res.status(400).json({ error: 'Missing projectName or year' });
//   }

//   try {
//     const query = `
//       SELECT 
//         u.alias AS alias,
//         MONTH(t.start_time) AS month,
//         SUM(TIMESTAMPDIFF(SECOND, t.start_time, t.end_time)) / 3600 AS hours
//       FROM kimai2_timesheet t
//       JOIN kimai2_users u ON u.id = t.user
//       JOIN kimai2_projects p ON p.id = t.project_id
//       WHERE p.name = ?
//         AND YEAR(t.start_time) = ?
//       GROUP BY u.alias, month
//       ORDER BY u.alias, month;
//     `;

//     const rows = await db.query(query, [projectName, year]);

//     // Structure result: one row per user, array of 12 months
//     const userMap = {};

//     rows.forEach(row => {
//       const alias = row.alias;
//       const month = row.month;
//       const hours = parseFloat(row.hours);

//       if (!userMap[alias]) {
//         userMap[alias] = Array(12).fill(0);
//       }

//       userMap[alias][month - 1] = hours;
//     });

//     const result = Object.entries(userMap).map(([alias, monthly_hours]) => ({
//       alias,
//       monthly_hours
//     }));

//     res.json(result);
//   } catch (err) {
//     console.error('Error fetching monthly hours:', err);
//     res.status(500).json({ error: 'Database error' });
//   }
// };

export const getProjectUsersMonthlyHours = async (req, res) => {
  const { projectName, year } = req.query;

  if (!projectName || !year) {
    return res.status(400).json({ error: 'Missing projectName or year' });
  }

  try {
    const query = `
      SELECT 
        u.alias AS alias,
        MONTH(t.start_time) AS month,
        SUM(TIMESTAMPDIFF(SECOND, t.start_time, t.end_time)) / 3600 AS hours
      FROM kimai2_timesheet t
      JOIN kimai2_users u ON u.id = t.user
      JOIN kimai2_projects p ON p.id = t.project_id
      WHERE p.name = :projectName
        AND YEAR(t.start_time) = :year
      GROUP BY u.alias, month
      ORDER BY u.alias, month
    `;

    const rows = await sequelize.query(query, {
      replacements: { projectName, year },
      type: Sequelize.QueryTypes.SELECT
    });

    // Structure result: one row per user, array of 12 months
    const userMap = {};

    rows.forEach(row => {
      const alias = row.alias;
      const month = row.month;
      const hours = parseFloat(row.hours);

      if (!userMap[alias]) {
        userMap[alias] = Array(12).fill(0);
      }

      userMap[alias][month - 1] = hours;
    });

    const result = Object.entries(userMap).map(([alias, monthly_hours]) => ({
      alias,
      monthly_hours
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching monthly hours:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

export const getProjectManagersWithProjects = async (req, res) => {
  const { startdate, enddate, filter } = req.query;

  if (!startdate || !enddate || !filter) {
    return res.status(400).json({ error: 'Missing startdate, enddate or filter' });
  }

  const filterMap = {
    Active: 1,
    Inactive: 0,
    Total: 'All',
  };
  const selectedFilterValue = filterMap[filter] ?? 'All';

  try {
    const baseQuery = `
      SELECT 
        u.alias AS username,
        p.name AS project_name,
        SUM(t.duration) / 3600 AS total_hours
      FROM kimai2_users_teams ut
      INNER JOIN kimai2_users u ON ut.user_id = u.id
      INNER JOIN kimai2_teams tm ON ut.team_id = tm.id
      INNER JOIN kimai2_projects_teams pt ON pt.team_id = tm.id
      INNER JOIN kimai2_projects p ON pt.project_id = p.id
      INNER JOIN kimai2_timesheet t ON t.project_id = p.id
      WHERE ut.teamlead = 1
        AND DATE(t.start_time) >= ?
        AND DATE(t.end_time) <= ?
        ${selectedFilterValue !== 'All' ? 'AND p.visible = ?' : ''}
      GROUP BY u.alias, p.name
      ORDER BY u.alias, p.name
    `;

    const params = [startdate, enddate];
    if (selectedFilterValue !== 'All') {
      params.push(selectedFilterValue);
    }

    const results = await runQuery(baseQuery, params);
    res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching project manager project summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserExpectedVsSubmittedHours = async (req, res) => {
  const { startdate, enddate } = req.query;

  if (!startdate || !enddate) {
    return res.status(400).json({ error: 'Missing startdate or enddate' });
  }

  try {
    // 1. Get enabled users and their weekly_hours
    const users = await runQuery(`
      SELECT u.id AS user_id, u.alias, d.weekly_hours
      FROM kimai2_users u
      LEFT JOIN kimai2_daysoff d ON u.id = d.user_id
      WHERE u.enabled = 1 AND u.alias != 'ADMINISTRATOR'
    `);

    // 2. Get total duration (in seconds) from timesheets in date range
    const entries = await runQuery(`
      SELECT 
        user AS user_id,
        SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) AS total_seconds
      FROM kimai2_timesheet
      WHERE DATE(start_time) BETWEEN ? AND ?
      GROUP BY user
    `, [startdate, enddate]);

    // Map: user_id -> submitted hours
    const submittedMap = {};
    entries.forEach(entry => {
      submittedMap[entry.user_id] = (entry.total_seconds || 0) / 3600; // convert to hours
    });

    // 3. Calculate number of weeks (rounded to 2 decimal places)
    const start = new Date(startdate);
    const end = new Date(enddate);
    const daysInRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const weeksInRange = +(daysInRange / 7).toFixed(2);

    // 4. Build result per user
    const result = users.map(user => {
      const expected = user.weekly_hours ? +(user.weekly_hours * weeksInRange).toFixed(2) : null;
      const submitted = +(submittedMap[user.user_id] || 0).toFixed(2);
      return {
        username: user.alias,
        expected_hours: expected,
        submitted_hours: submitted,
        missing_hours: expected !== null ? +(expected - submitted).toFixed(2) : null
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error calculating expected vs submitted hours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const createUserRate = async (req, res) => {
  const { userId, effective_from, hourly_rate } = req.body;

  if (!userId || !effective_from || hourly_rate == null) {
    return res.status(400).json({ error: "userId, effective_from and hourly_rate are required" });
  }

  const rate = Number(hourly_rate);
  if (Number.isNaN(rate) || rate < 0) {
    return res.status(400).json({ error: "hourly_rate must be a non-negative number" });
  }

  try {
    // Insert; if that (user_id, effective_from) exists, update it.
    await sequelize.query(
      `
      INSERT INTO kimai2_user_rates (user_id, effective_from, hourly_rate)
      VALUES (:userId, :effective_from, :hourly_rate)
      ON DUPLICATE KEY UPDATE hourly_rate = VALUES(hourly_rate)
      `,
      { replacements: { userId, effective_from, hourly_rate: rate } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error creating user rate:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }
};









