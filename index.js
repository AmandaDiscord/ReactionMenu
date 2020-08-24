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
	constructor(message, client, actions) {
		this.message = message;
		this.actions = actions;
		this.client = client;

		reactionMenus.set(this.message.id, this);
		this.react();
	}
	static get menus() {
		return reactionMenus;
	}
	/**
	 * @param {{ user_id: string, channel_id: string, message_id: string, emoji: { id: string, name: string }}} data
	 * @param {Discord.Channel} channel
	 * @param {Discord.User} user
	 * @param {Discord.Client} client
	 */
	static handler(data, channel, user, client) {
		// Set up vars
		const emoji = data.emoji;
		const menu = reactionMenus.get(data.message_id);
		// Quick conditions
		if (user.id == client.user.id) return;
		if (!menu) return;
		// We now have a menu
		const msg = menu.message;
		const action = menu.actions.find(a => resolveEmoji(a.emoji, false) == resolveEmoji(emoji, false));
		// Make sure the emoji is actually an action
		if (!action) return;
		// Make sure the user is allowed
		if ((action.allowedUsers && !action.allowedUsers.includes(user.id)) || (action.deniedUsers && action.deniedUsers.includes(user.id))) {
			removeReaction(client, channel.id, data.message_id, data.emoji, user.id);
			return;
		}
		// Actually do stuff
		switch (action.actionType) {
		case "js":
			action.actionData(msg, emoji, user);
			break;
		}
		switch (action.ignore) {
		case "that":
			menu.actions.find(a => a.emoji == resolveEmoji(emoji, false)).actionType = "none";
			break;
		case "thatTotal":
			menu.actions = menu.actions.filter(a => a.emoji != resolveEmoji(emoji, false));
			break;
		case "all":
			menu.actions.forEach(a => a.actionType = "none");
			break;
		case "total":
			menu.destroy(true);
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
		}
	}
	/**
	 * Returns 0 on fail and 1 on success.
	 */
	async react() {
		for (const a of this.actions) {
			try {
				await this.message.react(a.emoji);
			} catch (e) {
				return 0
			}
		}
		return 1;
	}
	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 * @param {boolean} [remove]
	 * @param {"text" | "dm"} [channelType]
	 */
	destroy(remove, channelType = "text") {
		reactionMenus.delete(this.message.id);
		if (remove) {
			if (channelType === "text") this._removeAll();
			else if (channelType === "dm") this._removeEach();
		}
	}
	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 * @private
	 */
	_removeAll() {
		this.client._snow.channel.deleteAllReactions(this.message.channel.id, this.message.id).catch(() => this._removeEach());
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
						return 0
					}
				}
			}
		}
		return 1
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
	const reaction = resolveEmoji(emoji, true);
	const promise = client._snow.channel.deleteReaction(channelID, messageID, reaction, userID);
	promise.catch(() => {});
	return promise;
}

/**
 * @param {{ id: string, name: string } | string} emoji
 * @param {boolean} encode
 */
function resolveEmoji(emoji, encode) {
	let e;
	if (typeof emoji === "string") return emoji
	if (emoji.id) {
		// Custom emoji, has name and ID
		e = `${emoji.name}:${emoji.id}`;
	} else {
		// Default emoji, has name only
		e = encode ? encodeURIComponent(emoji.name) : emoji.name;
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
 * @property {string} [ignore]
 * @property {string} [remove]
 * @property {string} [actionType]
 * @property {ReactionMenuActionCallback} [actionData]
 */
