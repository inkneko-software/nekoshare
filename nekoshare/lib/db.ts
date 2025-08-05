// lib/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // 确保数字以十进制格式返回
});

export default pool;
