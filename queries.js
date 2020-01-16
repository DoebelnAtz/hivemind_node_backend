const pg = require('pg');
const logger = require('./logger');

const pool = new pg.Pool ({
    user: 'admin',
    host: '134.209.227.11',
    database: 'hiveapi',
    password: '94502491Hive',
});

const client = new pg.Client ({
    user: 'admin',
    host: '134.209.227.11',
    database: 'hiveapi',
    password: '94502491Hive',
});

client.connect(function(err) {
    if(err) {
        return console.error('could not connect to postgres', err);
    }
    client.query('SELECT NOW() AS "theTime"', function(err, result) {
        if(err) {
            return console.error('error running query', err);
        }
        console.log(result.rows[0].theTime);
        // >> output: 2018-08-23T14:02:57.117Z
        client.end();
    });
});

module.exports = {
    query: (text, params) => {
        return pool.query(text, params)
    },
    connect: () => pool.connect(),
};