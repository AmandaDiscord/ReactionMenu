// @ts-check

const Discord = require("thunderstorm");
/**
 * @type {Map<string, ReactionMenu>}
 */
const reactionMenus = new Map();

class ReactionMenu {
	/**
	 * @param {Discord.Message} message
	 * @param {Discord.Client} client
	 * @param {ReactionMenuAction[]} actions
	 */
	constructor(message, client, actions, autoReact = true) {
		this.message = message;
		this.actions = actions;
		this.client = client;
		/** @type {Array<boolean>} */
		this.reactionResults = [];

		reactionMenus.set(this.message.id, this);
		if (autoReact) this.react();
	}

	static get menus() {
		return reactionMenus;
	}
	get menus() {
		return reactionMenus;
	}

	/**
	 * @param {ReactionData} data
	 * @param {Discord.Channel | Discord.PartialChannel} channel
	 * @param {Discord.User} user
	 * @param {Discord.Client} client
	 */
	static handler(data, channel, user, client) {
		// Set up vars
		const emoji = data.emoji;
		const menu = reactionMenus.get(data.message_id);
		// Quick conditions
		if (user.id === client.user.id) return;
		if (!menu) return;
		// We now have a menu
		const msg = menu.message;
		const action = menu.actions.find(a => resolveEmoji(a.emoji) === resolveEmoji(emoji));
		// Make sure the emoji is actually an action
		if (!action) return;
		// Make sure the user is allowed
		if ((action.allowedUsers && !action.allowedUsers.includes(user.id)) || (action.deniedUsers && action.deniedUsers.includes(user.id))) {
			removeReaction(client, channel.id, data.message_id, data.emoji, user.id);
			return;
		}

		// Actually do stuff
		if (action.actionType === "js") {
			action.actionData(msg, emoji, user);
		}

		switch (action.ignore) {
		case "that":
			menu.actions.find(a => resolveEmoji(a.emoji) === resolveEmoji(emoji)).actionType = "none";
			break;
		case "thatTotal":
			menu.actions = menu.actions.filter(a => resolveEmoji(a.emoji) !== resolveEmoji(emoji));
			break;
		case "all":
			menu.actions.forEach(a => a.actionType = "none");
			break;
		case "total":
			menu.destroy(true);
			break;
		default:
			// Should probably do something, but it's probably undefined so don't throw an error.
			break;
		}

		switch (action.remove) {
		case "user":
			removeReaction(client, channel.id, data.message_id, data.emoji, user.id);
			break;
		case "bot":
			removeReaction(client, channel.id, data.message_id, data.emoji, client.user.id);
			break;
		case "all":
			client._snow.channel.deleteAllReactions(channel.id, data.message_id);
			break;
		case "message":
			menu.destroy(true);
			msg.delete();
			break;
		default:
			// Should probably do something, but it's probably undefined so don't throw an error.
			break;
		}
	}

	/**
	 * @param {ReactionData} data
	 * @param {Discord.Channel | Discord.PartialChannel} channel
	 * @param {Discord.User} user
	 * @param {Discord.Client} client
	 */
	handler(data, channel, user, client) {
		return ReactionMenu.handler(data, channel, user, client);
	}

	/**
	 * Returns the results of the reacts.
	 * @returns {Promise<Array<boolean>>}
	 */
	async react() {
		// hold references since the this key word is quirky.
		const message = this.message;
		const rResults = this.reactionResults;

		/**
		 * @param {string} emoji
		 * @param {number} index
		 */
		async function doReact(emoji, index, attempts = 0) {
			if (attempts === 2) return setResult(index, false);
			let timer;

			const tprom = new Promise((res, rej) => {
				timer = setTimeout(() => rej(new Error("Timed out.")), 5000);
			});

			try {
				await Promise.race([
					tprom,
					message.react(emoji)
				]);
				clearTimeout(timer);
				setResult(index, true);
			} catch {
				await doReact(emoji, index, attempts++);
			}
		}

		/**
		 * @param {number} index
		 * @param {boolean} result
		 */
		function setResult(index, result) {
			typeof rResults[index] === "boolean" ? rResults.splice(index, 1, result) : rResults.push(result)
		}

		for (let index = 0; index < this.actions.length; index++) {
			if (rResults[index] === true) continue;
			const a = this.actions[index];
			await doReact(a.emoji, index);
		}
		return rResults;
	}

	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 * @param {boolean} [remove]
	 * @param {"text" | "dm"} [channelType]
	 */
	destroy(remove, channelType = "text") {
		reactionMenus.delete(this.message.id);
		if (remove) {
			if (channelType === "dm") this._removeEach();
			else this._removeAll();
		}
	}

	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 * @private
	 * @returns {Promise<0 | 1>}
	 */
	async _removeAll() {
		/** @type {0 | 1} */
		let value = 1
		try {
			await this.client._snow.channel.deleteAllReactions(this.message.channel.id, this.message.id);
		} catch {
			try {
				value = await this._removeEach();
			} catch {
				value = 0;
			}
		}
		return value;
	}

	/**
	 * For each action, remove the client's reaction.
	 * @private
	 */
	async _removeEach() {
		for(const a of this.actions) {
			if (a.allowedUsers && Array.isArray(a.allowedUsers)) {
				for (const user of a.allowedUsers) {
					try {
						await removeReaction(this.client, this.message.channel.id, this.message.id, a.emoji, user);
					} catch (e) {
						return 0;
					}
				}
			}
		}
		return 1;
	}
}

module.exports = ReactionMenu;

/**
 * @param {Discord.Client} client
 * @param {string} channelID
 * @param {string} messageID
 * @param {{ id: string, name: string } | string} emoji
 * @param {string} userID
 */
function removeReaction(client, channelID, messageID, emoji, userID) {
	if (!userID) userID = "@me";
	const reaction = resolveEmoji(emoji);
	const promise = client._snow.channel.deleteReaction(channelID, messageID, reaction, userID);
	promise.catch(() => {});
	return promise;
}

/**
 * @param {{ id: string, name: string } | string} emoji
 */
function resolveEmoji(emoji) {
	let e;
	if (typeof emoji === "string") {
		if (emoji.includes(":")) return emoji;
		else return encodeURIComponent(emoji);
	}
	if (emoji.id) {
		// Custom emoji, has name and ID
		e = `${emoji.name}:${emoji.id}`;
	} else {
		// Default emoji, has name only
		e = encodeURIComponent(emoji.name);
	}
	return e;
}

/**
 * @callback ReactionMenuActionCallback
 * @param {Discord.Message} message
 * @param {{ id: string, name: string }} emoji
 * @param {Discord.User} user
 */

/**
 * @typedef {Object} ReactionMenuAction
 * @property {string} emoji
 * @property {string[]} [allowedUsers]
 * @property {string[]} [deniedUsers]
 * @property {"that" | "thatTotal" | "all" | "total"} [ignore]
 * @property {"user" | "bot" | "all" | "message"} [remove]
 * @property {"js" | "none"} [actionType]
 * @property {ReactionMenuActionCallback} [actionData]
 */

/**
 * @typedef {Object} ReactionData
 * @property {string} user_id
 * @property {string} channel_id
 * @property {string} message_id
 * @property {{ id: string, name: string }} emoji
 */
