// config/sequelize.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// Create and export a Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'project_management',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3308,
    dialect: 'mysql',
    logging: false, // Set to console.log if you want query logging
    define: {
      freezeTableName: true
    }
  }
);



// Create and export a Sequelize instance
// const sequelize = new Sequelize(
//   process.env.DB_NAME || 'mproj_db2023',
//   process.env.DB_USER || 'mproj_user3',
//   process.env.DB_PASSWORD || 'lMHSc{0Os+lk',
//   {
//     host: process.env.DB_HOST || '5.77.39.26',
//     port: process.env.DB_PORT || 3306,
//     dialect: 'mysql',
//     logging: false, // Set to console.log if you want query logging
//     define: {
//       freezeTableName: true
//     }
//   }
// );

// Optional: test the connection on startup
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to MySQL has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
})();

export default sequelize;
