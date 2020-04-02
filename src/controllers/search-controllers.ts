import { RequestHandler } from 'express';
import { catchErrors } from '../errors/catchErrors';

const db = require('../postgres/queries');

const searchAll: RequestHandler = catchErrors(async (req, res) => {
	const q = req.query.q;

	let result = await db.query(
		`SELECT * FROM (
		SELECT u.username AS title, u.u_id AS id, 'user' AS type, '/user' AS link
		FROM users u
		UNION ALL 
		SELECT r.title, r.r_id AS id, 'resource' AS type, '/resources' AS link 
		FROM resources r 
		UNION ALL 
		SELECT b.title, b.b_id AS id, 'post' AS type, '/forum' AS link 
		FROM blogs b 
		UNION ALL 
		SELECT p.title, p.project_id AS id, 'project' AS type, '/projects' AS link 
		FROM projects p ORDER BY title ASC
		) AS res WHERE LOWER(res.title) LIKE LOWER($1) LIMIT 10`,
		[q + '%'],
	);
	result = result.rows;

	// First, we get all results that start with the query, if it returns less than 10 we
	// get anything containing the query (and filter out duplicates), because searching for
	// items that start with the query is much faster due to postgres btree indexing.

	if (result.length < 10) {
		let matched = await db.query(
			`SELECT * FROM (
		SELECT u.username AS title, u.u_id AS id, 'user' AS type, '/user' AS link
		FROM users u
		UNION ALL 
		SELECT r.title, r.r_id AS id, 'resource' AS type, '/resources' AS link 
		FROM resources r 
		UNION ALL 
		SELECT b.title, b.b_id AS id, 'post' AS type, '/forum' AS link 
		FROM blogs b 
		UNION ALL 
		SELECT p.title, p.project_id AS id, 'project' AS type, '/projects' AS link 
		FROM projects p ORDER BY title ASC
		) AS res WHERE LOWER(res.title) LIKE LOWER($1) LIMIT $2`,
			['%' + q + '%', 10 - result.length],
		);
		result = [
			...result,
			...matched.rows.filter(
				(match: { title: any; }) => !result.find((res: { title: any; }) => res.title === match.title),
			),
		];
	}

	res.json(result);
}, 'Failed to search database');

module.exports = {
	searchAll,
};