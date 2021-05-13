// @ts-check

const Discord = require("thunderstorm");
/**
 * @type {Map<string, ReactionMenu>}
 */
const reactionMenus = new Map();

class ReactionMenu {
	/**
	 * @param {Discord.Message} message
	 * @param {ReactionMenuAction[]} actions
	 */
	constructor(message, actions, autoReact = true) {
		this.message = message;
		this.actions = actions;
		this.client = message.client;
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
	 * @param {import("thunderstorm").MessageReaction} reaction
	 * @param {Discord.User} user
	 */
	static handler(reaction, user) {
		// Set up vars
		const menu = reactionMenus.get(reaction.message.id);
		// Quick conditions
		if (user.id === reaction.message.client.user.id) return;
		if (!menu) return;
		// We now have a menu
		const msg = menu.message;
		const action = menu.actions.find(a => resolveEmoji(a.emoji) === reaction.emoji.identifier);
		// Make sure the emoji is actually an action
		if (!action) return;
		// Make sure the user is allowed
		if ((action.allowedUsers && !action.allowedUsers.includes(user.id)) || (action.deniedUsers && action.deniedUsers.includes(user.id))) {
			reaction.remove(user.id);
			return;
		}

		// Actually do stuff
		if (action.actionType === "js") {
			action.actionData(msg, reaction.emoji, user);
		}

		switch (action.ignore) {
		case "that":
			menu.actions.find(a => resolveEmoji(a.emoji) === reaction.emoji.identifier).actionType = "none";
			break;
		case "thatTotal":
			menu.actions = menu.actions.filter(a => resolveEmoji(a.emoji) !== reaction.emoji.identifier);
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
			removeReaction(msg.client, msg.channel.id, msg.id, reaction.emoji.identifier, user.id);
			break;
		case "bot":
			removeReaction(msg.client, msg.channel.id, msg.id, reaction.emoji.identifier);
			break;
		case "all":
			msg.clearReactions();
			break;
		case "message":
			menu.destroy();
			msg.delete();
			break;
		default:
			// Should probably do something, but it's probably undefined so don't throw an error.
			break;
		}
	}

	/**
	 * @param {import("thunderstorm").MessageReaction} reaction
	 * @param {Discord.User} user
	 */
	handler(reaction, user) {
		return ReactionMenu.handler(reaction, user);
	}

	/**
	 * Returns the results of the reacts.
	 * @returns {Promise<Array<boolean>>}
	 */
	async react() {
		const values = [];
		for (const action of this.actions) {
			try {
				await this.message.react(action.emoji);
				values.push(true);
			} catch {
				values.push(false);
			}
		}
		return values;
	}

	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 * @param {boolean} [remove]
	 */
	destroy(remove) {
		reactionMenus.delete(this.message.id);
		if (remove) {
			if (this.message.channel.type === "dm") this._removeEach();
			else this._removeAll();
		}
	}

	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 * @private
	 */
	async _removeAll() {
		/** @type {0 | 1} */
		let value = 1
		try {
			await this.message.clearReactions();
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
			try {
				await removeReaction(this.client, this.message.channel.id, this.message.id, a.emoji)
			} catch (e) {
				return 0;
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
 * @param {string} [userID]
 */
function removeReaction(client, channelID, messageID, emoji, userID) {
	if (!userID) userID = "@me";
	const reaction = resolveEmoji(emoji);
	if (userID === client.user.id || userID === "@me") return client._snow.channel.deleteReactionSelf(channelID, messageID, reaction);
	else return client._snow.channel.deleteReaction(channelID, messageID, reaction, userID);
}

/**
 * @param {{ id: string, name: string } | string} emoji
 */
function resolveEmoji(emoji) {
	let e;
	if (typeof emoji === "string") {
		if (emoji.includes(":") || emoji.includes("%")) return emoji; //already encoded
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
 * @param {Discord.ReactionEmoji} emoji
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
