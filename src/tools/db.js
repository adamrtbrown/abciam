import mysql from 'mysql';

class DB {
  constructor() {
    this.conn = false;
    this.test = 1;
  }

  async createConnection() {
    let config = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DB
    }
    console.log("config",config)
    return new Promise(
      (resolve, reject) => {
        var conn = mysql.createConnection(config);
        conn.connect(function(err) {
          if (err) throw err;
          resolve(conn)
        });
    })
  }

  async getConn() {
    return new Promise(async (resolve) => {
      if(this.conn === false) {
        try {
          this.conn = await this.createConnection();
          this.conn.on('error', (err)=>{
            if(err.code === 'PROTOCOL_CONNECTION_LOST') {
              console.log("connection closed");
              this.conn = false;
            }
          });
        } catch(err) {
          console.error("DB Connection Error: ", err);
          throw err;
        }
      }
      resolve(this.conn);
    });
  }

  async query(sql, params) {
    return new Promise(async (resolve,reject) => {
    let conn = await this.getConn();
    conn.query(sql, params, function(error, results, fields) {
      if (error) {
        throw error;
      }
      resolve(
        {
          "error": error,
          "results" : results,
          "fields": fields
        });
      });
    });
  }

  log(message){
    console.log(message)
  }
}

export default DB;