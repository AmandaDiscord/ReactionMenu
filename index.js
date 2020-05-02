// @ts-check

const Discord = require("discord.js");
/**
 * @type {Map<string, ReactionMenu>}
 */
const reactionMenus = new Map();

class ReactionMenu {
	/**
	 * @param {Discord.Message} message
	 * @param {ReactionMenuAction[]} actions
	 */
	constructor(message, actions) {
		this.message = message;
		this.actions = actions;
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
		const emoji = data.emoji
		const menu = reactionMenus.get(data.message_id)
		// Quick conditions
		if (user.id == client.user.id) return
		if (!menu) return
		// We now have a menu
		const msg = menu.message
		const action = menu.actions.find(a => fixEmoji(a.emoji) == fixEmoji(emoji))
		// Make sure the emoji is actually an action
		if (!action) return
		// Make sure the user is allowed
		if ((action.allowedUsers && !action.allowedUsers.includes(user.id)) || (action.deniedUsers && action.deniedUsers.includes(user.id))) {
			removeUncachedReaction(client, channel.id, data.message_id, data.emoji, user.id)
			return
		}
		// Actually do stuff
		switch (action.actionType) {
		case "reply":
			msg.channel.send(user.toString() + " " + action.actionData)
			break
		case "edit":
			msg.edit(action.actionData)
			break
		case "js":
			action.actionData(msg, emoji, user)
			break
		}
		switch (action.ignore) {
		case "that":
			menu.actions.find(a => a.emoji == emoji).actionType = "none"
			break
		case "thatTotal":
			menu.actions = menu.actions.filter(a => a.emoji != emoji)
			break
		case "all":
			menu.actions.forEach(a => a.actionType = "none")
			break
		case "total":
			menu.destroy(true)
			break
		}
		switch (action.remove) {
		case "user":
			removeUncachedReaction(client, channel.id, data.message_id, data.emoji, user.id)
			break
		case "bot":
			removeUncachedReaction(client, channel.id, data.message_id, data.emoji)
			break
		case "all":
			msg.reactions.removeAll()
			break
		case "message":
			menu.destroy(true)
			msg.delete()
			break
		}
	}
	react() {
		for (const a of this.actions) {
			const promise = this.message.react(a.emoji);
			promise.then(reaction => {
				a.messageReaction = reaction;
			});
			// eslint-disable-next-line no-empty-function
			promise.catch(() => {});
		}
	}
	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 * @param {boolean} [remove]
	 */
	destroy(remove) {
		reactionMenus.delete(this.message.id);
		if (remove) {
			if (this.message.channel.type == "text") this._removeAll();
			else if (this.message.channel.type == "dm") this._removeEach();
		}
	}
	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 * @private
	 */
	_removeAll() {
		this.message.reactions.removeAll().catch(() => this._removeEach());
	}
	/**
	 * For each action, remove the client's reaction.
	 * @private
	 */
	_removeEach() {
		this.actions.forEach(a => {
			if (!a.messageReaction) return;
			// eslint-disable-next-line no-empty-function
			a.messageReaction.users.remove().catch(() => {});
		})
	}
}

module.exports = ReactionMenu;

/**
 * Do not ask me in what way this "fixes" an emoji.
 */
function fixEmoji(emoji) {
	if (emoji && emoji.name) {
		if (emoji.id != null) return `${emoji.name}:${emoji.id}`
		else return emoji.name
	}
	return emoji
}

/**
 * @param {Discord.Client} client
 * @param {string} channelID
 * @param {string} messageID
 * @param {{ id: string, name: string }} emoji
 * @param {string} [userID]
 */
function removeUncachedReaction(client, channelID, messageID, emoji, userID) {
	if (!userID) userID = "@me"
	let reaction
	if (emoji.id) {
		// Custom emoji, has name and ID
		reaction = `${emoji.name}:${emoji.id}`
	} else {
		// Default emoji, has name only
		reaction = encodeURIComponent(emoji.name)
	}
	// @ts-ignore: client.api is not documented
	const promise = client.api.channels(channelID).messages(messageID).reactions(reaction, userID).delete()
	promise.catch(() => console.error)
	return promise
}

/**
 * @callback ReactionMenuActionCallback
 * @param {Discord.Message} message
 * @param {{ id: string, name: string }} emoji
 * @param {Discord.User} user
 */

/**
 * @typedef {Object} ReactionMenuAction
 * @property {Discord.EmojiIdentifierResolvable} emoji
 * @property {Discord.MessageReaction} [messageReaction]
 * @property {string[]} [allowedUsers]
 * @property {string[]} [deniedUsers]
 * @property {string} [ignore]
 * @property {string} [remove]
 * @property {string} [actionType]
 * @property {ReactionMenuActionCallback} [actionData]
 */
