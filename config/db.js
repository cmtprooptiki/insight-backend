import { Sequelize } from "sequelize";


const db=new Sequelize('project_management','root','',{
      host: 'localhost',
    dialect:"mysql",
    port:3306
});


// const db=new Sequelize('mproj_db2023','mproj_user3','lMHSc{0Os+lk',{
//       host: '5.77.39.26',
//     dialect:"mysql",
//     port:3306
// });


export default db;