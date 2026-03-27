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

        this.socket.on('start_replay', () => {
            console.log('Both players ready — restarting game');
            game.restartGame(true); // true = confirmed by server
        });

        this.socket.on('replay_waiting', () => {
            console.log('Waiting for opponent to accept replay...');
            if (game.replay_elem) {
                game.replay_elem.innerText = 'Waiting for opponent...';
                game.replay_elem.disabled = true;
            }
        });
    }

    joinRoom(roomCode, playerName, deck) {
        this.roomCode = roomCode;
        this.playerName = playerName;
        this.socket.emit('join_room', { roomCode, playerName, deck });
    }

    requestReplay() {
        if (this.isMultiplayer && this.roomCode) {
            this.socket.emit('request_replay', { roomCode: this.roomCode });
        }
    }

    leaveRoom() {
        if (this.roomCode) {
            this.socket.emit('leave_room', { roomCode: this.roomCode });
        }
        this.roomCode = null;
        this.playerName = null;
        this.playerIndex = null;
        this.isMultiplayer = false;
        this.randomQueue = [];
    }

    sendMove(move) {
        if (this.isMultiplayer) {
            console.log('Sending move:', move);
            this.socket.emit('game_move', { roomCode: this.roomCode, move });
        }
    }

    startGame(players) {
        console.log('Starting network game with players:', players);
        document.getElementById('multiplayer-setup').classList.add('hide');
        document.getElementById('deck-customization').classList.add('hide');

        const myData = players[this.playerIndex];
        const opData = players[1 - this.playerIndex];

        window.player_me = new Player(0, myData.name, myData.deck);
        window.player_op = new Player(1, opData.name, opData.deck);

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
    }

    async receiveMove(move) {
        console.log(`ControllerRemote: received move ${move.type} for card ${move.cardName}`);
        switch (move.type) {

            case 'play_card': {
                // Search by name first — most reliable across rounds
                let card = this.player.hand.cards.find(c => c.name === move.cardName);

                // Fallback: search deck
                if (!card) {
                    card = this.player.deck.cards.find(c => c.name === move.cardName);
                }

                // Last resort: use hand index
                if (!card && typeof move.handIndex !== 'undefined' && move.handIndex !== -1) {
                    card = this.player.hand.cards[move.handIndex];
                }

                if (card) {
                    console.log(`Playing card: ${card.name}, rowName: ${move.rowName}`);
                    if (move.rowName) {
                        const row = move.rowName === "weather"
                            ? weather
                            : board.getRow(card, move.rowName, this.player);
                        await this.player.playCardToRow(card, row);
                    } else {
                        await this.player.playCard(card);
                    }
                } else {
                    console.error("Remote card not found:", move.cardName);
                    this.player.endTurn();
                }
                break;
            }

            case 'scorch': {
                let scorchCard = this.player.hand.cards.find(c => c.name === move.cardName);
                if (!scorchCard && typeof move.handIndex !== 'undefined' && move.handIndex !== -1) {
                    scorchCard = this.player.hand.cards[move.handIndex];
                }
                if (scorchCard) {
                    await this.player.playScorch(scorchCard);
                } else {
                    console.error("Remote scorch card not found:", move.cardName);
                    this.player.endTurn();
                }
                break;
            }

            case 'pass':
                await this.player.passRound();
                break;

            case 'activate_leader':
                await this.player.activateLeader();
                break;

            case 'coin_toss':
                game.firstPlayer = (move.firstPlayerAbsIndex === window.network.playerIndex)
                    ? player_me
                    : player_op;
                break;

            case 'ready_to_start':
                game.opponentReady = true;
                break;

            case 'sync_random':
                window.network.randomQueue.push(move.value);
                break;

            case 'sync_deck': {
                const targetPlayer = (move.playerAbsIndex === window.network.playerIndex)
                    ? player_me
                    : player_op;
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

            case 'sync_redraw': {
                // Rebuild opponent's deck and hand after their redraw
                const targetPlayer = (move.playerAbsIndex === window.network.playerIndex)
                    ? player_me
                    : player_op;
                
                // Rebuild deck
                targetPlayer.deck.reset();
                move.deckIndices.forEach(index => {
                    const card = new Card(card_dict[index], targetPlayer);
                    targetPlayer.deck.cards.push(card);
                    targetPlayer.deck.addCardElement();
                });
                targetPlayer.deck.resize();
                
                // Rebuild hand
                const oldHand = [...targetPlayer.hand.cards];
                targetPlayer.hand.cards = [];
                move.handCards.forEach(hc => {
                    // Try to find matching card from old hand first (preserves object identity)
                    let card = oldHand.find(c => c.name === hc.name && c.filename === hc.filename);
                    if (card) {
                        oldHand.splice(oldHand.indexOf(card), 1);
                    } else {
                        // Card was drawn during redraw — create new one
                        const cardData = card_dict.find(cd => cd.name === hc.name && cd.filename === hc.filename);
                        card = new Card(cardData, targetPlayer);
                    }
                    targetPlayer.hand.cards.push(card);
                });
                targetPlayer.hand.resize();
                
                console.log(`Synced redraw for player ${move.playerAbsIndex}: deck=${move.deckIndices.length}, hand=${move.handCards.length}`);
                break;
            }

            case 'redraw':
                break;

            case 'medic': {
                // Handle medic card revival on remote side
                const medicTarget = this.player.grave.cards.find(c => c.name === move.targetCardName);
                if (medicTarget) {
                    await medicTarget.autoplay(this.player.grave);
                } else {
                    console.error('Medic target not found:', move.targetCardName);
                }
                break;
            }

            case 'decoy': {
                //  Use rowName to find the correct row, then find the card in it
                let targetCard = null;
                let targetRow = null;
                if (move.rowName) {
                    targetRow = board.getRow({abilities:[]}, move.rowName, this.player);
                    if (targetRow) {
                        targetCard = targetRow.cards.find(c => c.name === move.cardName);
                    }
                }
                // Fallback: search all rows if rowName didn't resolve
                if (!targetCard) {
                    for (let r of board.row) {
                        const found = r.cards.find(c => c.name === move.cardName);
                        if (found) {
                            targetCard = found;
                            targetRow = r;
                            break;
                        }
                    }
                }
                const decoyCard = this.player.hand.cards.find(c => c.name === move.decoyCardName);
                if (targetCard && decoyCard && targetRow) {
                    // Reset holder + clear placed so spy cards dont retrigger
                    targetCard.holder = this.player;
                    const savedPlaced = targetCard.placed;
                    targetCard.placed = [];
                    await board.toHand(targetCard, targetRow);
                    targetCard.placed = savedPlaced;
                    await board.moveTo(decoyCard, targetRow, this.player.hand);
                    this.player.endTurn();
                } else {
                    console.error('Decoy failed:', {
                        targetCard: move.cardName,
                        decoyCard: move.decoyCardName,
                        found: !!targetCard
                    });
                    this.player.endTurn();
                }
                break;
            }

        } // closes switch
    }     // closes receiveMove
}         // closes ControllerRemote

window.network = new Network();

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