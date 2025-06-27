// db.js - PostgreSQL connection utility for Neon.tech
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://driverxl_owner:npg_rsk0SPGv8OzH@ep-falling-fog-ab2gvfil-pooler.eu-west-2.aws.neon.tech/driverxl?sslmode=require&channel_binding=require',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
