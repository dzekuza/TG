// db.js - PostgreSQL connection utility for Neon.tech
import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: 'postgresql://driverxl_owner:npg_rsk0SPGv8OzH@ep-falling-fog-ab2gvfil-pooler.eu-west-2.aws.neon.tech/driverxl?sslmode=require&channel_binding=require',
});

export const query = (text, params) => pool.query(text, params);
