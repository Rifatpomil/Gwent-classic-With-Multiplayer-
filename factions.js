"use strict"

var factions = {
	realms: {
		name: "Northern Realms",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount > 1 && game.roundHistory[game.roundCount-2].winner === player) {
				player.deck.draw(player.hand);
				await ui.notification("north", 1200);
			}
			return false;
		}),
		description: "Draw a card from your deck whenever you win a round."
	},
	nilfgaard: {
		name: "Nilfgaardian Empire",
		description: "Wins any round that ends in a draw."
	},
	monsters: {
		name: "Monsters",
		factionAbility: player => game.roundEnd.push( async () => {
			let isMe = (player === player_me);
			let units = board.row.filter( (r,i) => isMe ? i >= 3 : i < 3)
				.reduce((a,r) => r.cards.filter(c => c.isUnit()).concat(a), []);
			if (units.length === 0)
				return;
			
			let card;
			const playerAbsIndex = (player === player_me) ? network.playerIndex : 1 - network.playerIndex;

			if (network.isMultiplayer) {
				if (network.playerIndex === 0) {
					// Host picks and sends to guest
					let idx = Math.floor(Math.random() * units.length);
					card = units[idx];
					network.sendMove({ type: 'monsters_ability', choice: card.name, playerAbsIndex: playerAbsIndex });
				} else {
					// Guest waits for host's choice for this specific player
					while (!game.monstersChoice[playerAbsIndex]) await sleep(50);
					card = units.find(c => c.name === game.monstersChoice[playerAbsIndex]);
					game.monstersChoice[playerAbsIndex] = null;
				}
			} else {
				card = units[Math.floor(Math.random() * units.length)];
			}

			if (!card) return; // Should not happen if in sync

			card.noRemove = true;
			game.roundStart.push( async () => {
				await ui.notification("monsters", 1200);
				delete card.noRemove;
				return true; 
			});
			return false;
		}),
		description: "Keeps a random Unit Card out after each round."
	},
	scoiatael: {
		name: "Scoia'tael",
		factionAbility: player => game.gameStart.push( async () => {
			let notif = "";
			if (player === player_me) {
				if (network.isMultiplayer) {
					// Multiplayer: local Scoia'tael player picks, sends choice via coin_toss
					await ui.popup("Go First", () => game.firstPlayer = player, "Let Opponent Start", () => game.firstPlayer = player.opponent(), "Would you like to go first?", "The Scoia'tael faction perk allows you to decide who will get to go first.");
					const firstPlayerAbsIndex = (game.firstPlayer === player_me) ? network.playerIndex : 1 - network.playerIndex;
					network.sendMove({ type: 'coin_toss', firstPlayerAbsIndex: firstPlayerAbsIndex });
				} else {
					await ui.popup("Go First", () => game.firstPlayer = player, "Let Opponent Start", () => game.firstPlayer = player.opponent(), "Would you like to go first?", "The Scoia'tael faction perk allows you to decide who will get to go first.");
				}
				notif = game.firstPlayer.tag + "-first";
			} else if (player.controller instanceof ControllerRemote) {
				// Multiplayer: remote Scoia'tael player — wait for their choice via coin_toss
				while (!game.firstPlayer) await sleep(100);
				notif = game.firstPlayer.tag + "-first";
			} else if (player.hand instanceof HandAI) {
				if (Math.random() < 0.5) {
					game.firstPlayer = player;
					notif = "scoiatael";
				} else {
					game.firstPlayer = player.opponent();
					notif = game.firstPlayer.tag + "-first";
				}
			} else {
				//sleepUntil(game.firstPlayer); //TODO online
			}
			await ui.notification(notif,1200);
			return true;
		}),
		description: "Decides who takes first turn."
	},
	skellige: {
		name: "Skellige",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount != 3)
				return false;
			await ui.notification("skellige-" + player.tag, 1200);
			
			let graveUnits = player.grave.findCards(c => c.isUnit());
			let chosen = [];
			const count = Math.min(2, graveUnits.length);
			const playerAbsIndex = (player === player_me) ? network.playerIndex : 1 - network.playerIndex;

			if (network.isMultiplayer) {
				if (network.playerIndex === 0) {
					// Host picks and sends names to guest for this specific player
					for (let i = count; i > 0; --i) {
						let idx = Math.floor(Math.random() * graveUnits.length);
						chosen.push(graveUnits.splice(idx, 1)[0]);
					}
					network.sendMove({ 
						type: 'skellige_ability', 
						choices: chosen.map(c => c.name), 
						playerAbsIndex: playerAbsIndex 
					});
				} else {
					// Guest waits for host's choice for this specific player
					while (!game.skelligeChoices[playerAbsIndex]) await sleep(50);
					for (const name of game.skelligeChoices[playerAbsIndex]) {
						let card = graveUnits.find(c => c.name === name);
						if (card) {
							chosen.push(card);
							graveUnits.splice(graveUnits.indexOf(card), 1);
						}
					}
					game.skelligeChoices[playerAbsIndex] = null;
				}
			} else {
				for (let i = count; i > 0; --i) {
					let idx = Math.floor(Math.random() * graveUnits.length);
					chosen.push(graveUnits.splice(idx, 1)[0]);
				}
			}

			// Use for...of to ensure sequential execution and proper awaiting of each move
			for (const c of chosen) {
				await board.toRow(c, player.grave);
			}
			return true;
		}),
		description: "2 random cards from the graveyard are placed on the battlefield at the start of the third round."
	}
}