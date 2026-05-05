// @ts-ignore
import pkg from 'pg';
const { Client } = pkg;

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'zutomayo_gallery_test';
const DB_GRANT_USER = process.env.DB_GRANT_USER || DB_USER;

if (!DB_PASS) {
  throw new Error('Missing DB_PASS for grant_privs script');
}
if (!/^[a-zA-Z0-9_]+$/.test(DB_GRANT_USER)) {
  throw new Error('DB_GRANT_USER contains invalid characters');
}

const client = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

client.connect()
  .then(() => {
    return client.query(`GRANT ALL ON SCHEMA public TO ${DB_GRANT_USER};`);
  })
  .then(() => {
    return client.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_GRANT_USER};`);
  })
  .then(() => {
    return client.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_GRANT_USER};`);
  })
  .then(() => {
    console.log(`Granted all necessary privileges to ${DB_GRANT_USER}`);
    return client.end();
  })
  .catch((err: any) => {
    console.error('Connection error', err);
    process.exit(1);
  });