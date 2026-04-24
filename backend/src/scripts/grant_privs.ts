// @ts-ignore
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'FBZNYC3HSJExdHX3',
  database: 'zutomayo_gallery_test',
});

client.connect()
  .then(() => {
    return client.query('GRANT ALL ON SCHEMA public TO zutomayo_gallery_test;');
  })
  .then(() => {
    return client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zutomayo_gallery_test;');
  })
  .then(() => {
    return client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zutomayo_gallery_test;');
  })
  .then(() => {
    console.log('Granted all necessary privileges to zutomayo_gallery_test');
    return client.end();
  })
  .catch((err: any) => {
    console.error('Connection error', err);
    process.exit(1);
  });