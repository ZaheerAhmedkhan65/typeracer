const mysql = require('../config/database.js');
let players = {};
module.exports = (io) =>{
    // WebSocket (Socket.IO)
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('select-car', (carType) => {
        players[socket.id] = { car: carType, progress: 0 };
        io.emit('car-selected', { playerId: socket.id, carType: carType, username: socket.id });
        io.emit('update-players', players);
    });

    socket.on('start-game', () => {
        io.emit('start-game');
    });

    socket.on('update-progress', (data) => {
        if (players[socket.id]) {
            players[socket.id].progress = data.progress;
            io.emit('update-progress', { id: socket.id, progress: data.progress });
        }
    });

    socket.on('game-won', (data) => {
        const winnerId = data.winnerId;
        const players = data.players;
        io.emit('game-won', { winnerId, players });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('update-players', players);
    });
});
}