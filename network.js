"use strict"

class Network {
    constructor() {
        this.socket = io();
        this.roomCode = null;
        this.playerName = null;
        this.playerIndex = null;
        this.isMultiplayer = false;
        this.randomQueue = [];

        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('joined_room', (data) => {
            this.playerIndex = data.playerIndex;
            console.log(`Joined room as player ${this.playerIndex}`);
            // Wait for another player
        });

        this.socket.on('player_joined', (player) => {
            console.log(`Player ${player.name} joined`);
        });

        this.socket.on('game_ready', (data) => {
            console.log('Game is ready!');
            this.isMultiplayer = true;
            this.startGame(data.players);
        });

        this.socket.on('remote_move', (move) => {
            this.handleRemoteMove(move);
        });

        this.socket.on('room_full', () => {
            alert('Room is full!');
        });

        this.socket.on('player_left', () => {
            alert('Opponent disconnected');
            location.reload();
        });
    }

    joinRoom(roomCode, playerName, deck) {
        this.roomCode = roomCode;
        this.playerName = playerName;
        this.socket.emit('join_room', { roomCode, playerName, deck });
    }

    sendMove(move) {
        if (this.isMultiplayer) {
            console.log('Sending move:', move);
            this.socket.emit('game_move', { roomCode: this.roomCode, move });
        }
    }

    startGame(players) {
        console.log('Starting network game with players:', players);
        // Hide multiplayer setup
        document.getElementById('multiplayer-setup').classList.add('hide');
        document.getElementById('deck-customization').classList.add('hide');

        // Initialize players based on network data
        const myData = players[this.playerIndex];
        const opData = players[1 - this.playerIndex];

        // Refactor gwent.js to use these players
        window.player_me = new Player(0, myData.name, myData.deck);
        window.player_op = new Player(1, opData.name, opData.deck);
        
        // Change opponent's controller to remote
        window.player_op.controller = new ControllerRemote(window.player_op);

        game.startGame();
    }

    handleRemoteMove(move) {
        console.log('Handling remote move:', move);
        if (window.player_op && window.player_op.controller instanceof ControllerRemote) {
            window.player_op.controller.receiveMove(move);
        }
    }
}

class ControllerRemote {
    constructor(player) {
        this.player = player;
        this.pendingMove = null;
    }

    async startTurn(player) {
        console.log("Waiting for remote move...");
        // This controller waits for receiveMove to be called by Network
    }

    async receiveMove(move) {
        console.log(`ControllerRemote: received move ${move.type} for card ${move.cardName}`);
        switch (move.type) {
            case 'play_card':
                // Check hand by index first if provided
                let card = null;
                if (typeof move.handIndex !== 'undefined' && move.handIndex !== -1) {
                    card = this.player.hand.cards[move.handIndex];
                }
                
                // Fallback to name search if index failed or wasn't provided
                if (!card || card.name !== move.cardName) {
                    card = this.player.hand.cards.find(c => c.name === move.cardName);
                }
                
                // If still not in hand, check other containers
                if (!card) {
                    card = this.player.deck.cards.find(c => c.name === move.cardName);
                }
                
                if (card) {
                    if (move.rowName) {
                        const row = board.getRow(card, move.rowName, this.player);
                        await this.player.playCardToRow(card, row);
                    } else if (card.name === "Scorch") {
                        await this.player.playScorch(card);
                    } else {
                        await this.player.playCard(card);
                    }
                } else {
                    console.error("Remote card not found:", move.cardName);
                    // Force turn end if card missing to prevent soft-lock
                    this.player.endTurn();
                }
                break;
            case 'pass':
                await this.player.passRound();
                break;
            case 'activate_leader':
                await this.player.activateLeader();
                break;
            case 'coin_toss':
                // firstPlayerAbsIndex is absolute (0=host, 1=guest); compare to our own playerIndex
                game.firstPlayer = (move.firstPlayerAbsIndex === window.network.playerIndex) ? player_me : player_op;
                break;
            case 'ready_to_start':
                game.opponentReady = true;
                break;
            case 'sync_random':
                window.network.randomQueue.push(move.value);
                break;
            case 'sync_deck': {
                 // playerAbsIndex is absolute (0=host, 1=guest); map to local player_me/player_op
                 const targetPlayer = (move.playerAbsIndex === window.network.playerIndex) ? player_me : player_op;
                 // Reset first to clear both the cards array and the DOM deck-back elements
                 targetPlayer.deck.reset();
                 move.indices.forEach(index => {
                     const card = new Card(card_dict[index], targetPlayer);
                     targetPlayer.deck.cards.push(card);
                     targetPlayer.deck.addCardElement();
                 });
                 targetPlayer.deck.resize();
                 if (targetPlayer === player_me) game.meDeckSynced = true;
                 else game.opDeckSynced = true;
                 break;
            }
            case 'redraw':
                // Handle initial redraw synchronization
                break;
            case 'decoy':
                const targetCard = this.player.opponent().hand.cards.find(c => c.name === move.cardName) || 
                                 board.row.flatMap(r => r.cards).find(c => c.name === move.cardName);
                const decoyCard = this.player.hand.cards.find(c => c.name === move.decoyCardName);
                
                if (targetCard && decoyCard) {
                    const row = board.getRow(decoyCard, move.rowName, this.player);
                    board.toHand(targetCard, row);
                    await board.moveTo(decoyCard, row, this.player.hand);
                    this.player.endTurn();
                }
                break;
        }
    }
}

window.network = new Network();

// Add event listeners for the multiplayer UI
document.addEventListener('DOMContentLoaded', () => {
    const multiplayerSetup = document.getElementById('multiplayer-setup');
    const joinBtn = document.getElementById('join-room-btn');
    const cancelBtn = document.getElementById('cancel-multiplayer-btn');
    const roomInput = document.getElementById('room-code-input');
    const nameInput = document.getElementById('player-name-input');
    const startMultiBtn = document.getElementById('start-multiplayer');

    multiplayerSetup.classList.add('hide');

    startMultiBtn.addEventListener('click', () => {
        multiplayerSetup.classList.remove('hide');
    });

    cancelBtn.addEventListener('click', () => {
        multiplayerSetup.classList.add('hide');
    });

    joinBtn.addEventListener('click', () => {
         const roomCode = String(roomInput.value.trim());
         const playerName = nameInput.value.trim() || 'Player';
         
         if (!roomCode) {
             alert('Please enter a room code');
             return;
         }

         console.log('Attempting to join room:', roomCode, 'as', playerName);

         if (typeof dm === 'undefined') {
             alert('Game engine not loaded yet. Please wait a moment.');
             return;
         }

         const deck = dm.getDeckData();
         if (!deck) {
             console.log('Deck validation failed');
             return;
         }

         console.log('Deck validated, joining room...');
         window.network.joinRoom(roomCode, playerName, deck);
         
         joinBtn.innerText = 'Waiting for opponent...';
         joinBtn.disabled = true;
     });
});
