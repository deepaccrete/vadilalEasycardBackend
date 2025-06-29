const { Pool } = require('pg');
const moment = require('moment');

// Setup connection pool
const pool = new Pool({
  host:"192.168.120.235",
  user: "postgres",
  password: "Aitl@321",
  database: "vadilal_cardmate_node",
  port: process.env.DBPORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.log('error connecting: ' + err.message);
    throw new Error('Please Check Your Database Connection Or Internet Connection And Restart Your App');
  } else {
    console.log('connected to PostgreSQL DB');
    release();
  }
});

module.exports = {
  pool,

  getMaxDate: function (data) {
    return moment(new Date(Math.max.apply(null, data.map(e => new Date(e.maxdate)))))
      .format('YYYY-MM-DD H:m:s');
  },

  escapData: (data) => {
    return data.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"":
        case "'":
        case "/":
        case "`":
        case "\\":
        case "%":
          return "\\" + char;
      }
    });
  },

  beginTransaction: async (client) => {
    try {
      await client.query("BEGIN");
    } catch (err) {
      throw new Error("Transaction Begin Failed: " + err.message);
    }
  },

  rollback: async (client) => {
    try {
      await client.query("ROLLBACK");
    } catch (err) {
      throw err;
    }
  },

  commit: async (client) => {
    try {
      await client.query("COMMIT");
    } catch (err) {
      throw err;
    }
  },

  getRow: async (sql, params = []) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  },

  getResults: async (sql, params = []) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (err) {
      console.log(err);
      throw new Error('Query failed: ' + err.message);
    }
  },

  insert: async (table, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  },

  update: async (table, data, where) => {
    let setClause = data.map((item, i) => `${item.column} = $${i + 1}`).join(', ');
    let whereClause = where.map((item, i) => `${item.column} = $${data.length + i + 1}`).join(' AND ');

    const values = [...data.map(d => d.value), ...where.map(w => w.value)];
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

    try {
      const result = await pool.query(sql, values);
      return result;
    } catch (err) {
      throw err;
    }
  },

  array_diff: (a1, a2) => {
    let a = {}, diff = [];

    a1.forEach(i => a[i] = true);
    a2.forEach(i => {
      if (a[i]) delete a[i];
      else a[i] = true;
    });

    for (let k in a) {
      diff.push(k);
    }

    return diff;
  }
};
