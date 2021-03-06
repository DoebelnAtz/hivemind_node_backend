import db from '../postgres/queries';
const { errorLogger } = require('../logger');

// TODO: add implicit types
const saveMessageToDB = async (socket: any, message: any, io: any) => {
	const senderId = socket.body.decoded.u_id;
	const threadId = message.t_id;
	const incomingMessage = message;
	let isAllowed;
	try {
		isAllowed = await db.query(
			'SELECT * from threadconnections WHERE thread_id = $1',
			[threadId],
		);
		if (
			!isAllowed.rows.find(
				(user: { user_id: number }) => user.user_id === senderId,
			)
		) {
			errorLogger.error(`Unathorized thread access by u_id: ${senderId}`);
			return io.to(socket.body.decoded.u_id).emit('chat-message', {
				message:
					'Unauthorized thread access, this instance will be reported',
				m_id: new Date().toISOString(),
				username: 'marvin',
				time_sent: new Date(0).toISOString(),
			});
		}
	} catch (e) {
		errorLogger.error(`Failed to send message: ` + e);
		return io.to(socket.body.decoded.u_id).emit('chat-message', {
			message: 'failed to send message',
			m_id: new Date().toISOString(),
			username: 'marvin',
			time_sent: new Date(0).toISOString(),
		});
	}
	let createdMessage: Message;
	try {
		let newMessage = await db.query(
			'INSERT INTO messages (message, sender, thread) ' +
				'VALUES ($1, $2, $3) ' +
				'RETURNING m_id, time_sent, message, sender',
			[incomingMessage.message, senderId, threadId],
		);
		createdMessage = newMessage.rows[0];
		createdMessage.username = socket.body.decoded.username;
	} catch (e) {
		errorLogger.error('FAILED TO SAVE MESSAGE: ' + e);
		return io.to(socket.body.decoded.u_id).emit('chat-message', {
			message: 'failed to send message: ',
			m_id: new Date().toISOString(),
			username: 'marvin',
			time_sent: new Date(0).toISOString(),
		});
	}
	message.activeUsers.map((user: User) => {
		console.log('sending to room ' + user.u_id + ' by: ' + senderId);
		io.to(String(user.u_id)).emit('notification', {
			type: 'message',
			message: `${createdMessage.username} has sent you a message`,
			link: `${socket.request.headers.room.slice(-1)}`,
		});
	});
	io.to(socket.request.headers.room).emit('chat-message', createdMessage);
};

module.exports = {
	saveMessageToDB,
};
