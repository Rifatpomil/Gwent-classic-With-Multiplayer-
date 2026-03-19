const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '.')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (data) => {
        const { roomCode, playerName, deck } = data;
        console.log(`Join request: room ${roomCode} user ${playerName}`);
        
        let room = rooms.get(roomCode);
        if (!room) {
            console.log(`Creating room ${roomCode}`);
            room = {
                players: [],
                code: roomCode,
                gameState: 'waiting'
            };
            rooms.set(roomCode, room);
        }

        if (room.players.length >= 2) {
            console.log(`Room ${roomCode} full`);
            socket.emit('room_full');
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            deck: deck,
            isHost: room.players.length === 0
        };

        room.players.push(player);
        socket.join(roomCode);
        console.log(`User ${playerName} joined room ${roomCode}. Total players: ${room.players.length}`);

        socket.emit('joined_room', { 
            playerIndex: room.players.length - 1,
            players: room.players
        });

        if (room.players.length === 2) {
            console.log(`Room ${roomCode} ready! Starting game.`);
            room.gameState = 'ready';
            io.to(roomCode).emit('game_ready', { players: room.players });
        } else {
            console.log(`Broadcasting player_joined to room ${roomCode}`);
            socket.broadcast.to(roomCode).emit('player_joined', player);
        }
    });

    socket.on('game_move', (data) => {
        const { roomCode, move } = data;
        console.log(`Move in room ${roomCode}:`, move.type);
        socket.broadcast.to(roomCode).emit('remote_move', move);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [roomCode, room] of rooms.entries()) {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('player_left', { id: socket.id });
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
