// test-db.js (colócalo en la raíz o en src/)
const pool = require('./db'); // ajusta la ruta si lo colocas en otro lado

async function test() {
  try {
    const { rows } = await pool.query('SELECT NOW() as now');
    console.log('DB OK ->', rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error('DB ERROR ->', err.message);
    process.exit(1);
  }
}

test();
