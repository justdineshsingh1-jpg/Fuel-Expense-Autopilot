const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres'
});

async function checkUsers() {
  await client.connect();
  const res = await client.query('SELECT id, email, role, password_hash FROM users');
  console.log("Users in DB:");
  console.table(res.rows);
  await client.end();
}
checkUsers().catch(console.error);
