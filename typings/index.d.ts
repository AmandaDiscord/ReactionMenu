import Discord = require("discord.js");

declare class ReactionMenu {
	constructor(message: Discord.Message, actions: Array<ReactionMenuAction>);
	constructor(message: Discord.Message, actions: Array<ReactionMenuActionReply>);
	constructor(message: Discord.Message, actions: Array<ReactionMenuActionEdit>);
	constructor(message: Discord.Message, actions: Array<ReactionMenuActionJS>);

	public message: Discord.Message;
	public actions: Array<ReactionMenuAction>;

	public static menus: Map<string, ReactionMenu>;
	public static handler(data: { user_id: string, channel_id: string, message_id: string, emoji: { id: string, name: string }}, channel: Discord.Channel, user: Discord.User, client: Discord.Client): void;

	public react(): void;
	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 */
	public destroy(remove?: boolean): void;

	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 */
	private _removeAll(): void;
	/**
	 * For each action, remove the client's reaction.
	 */
	private _removeEach(): void;
}
export = ReactionMenu;

export interface ReactionMenuAction {
	public emoji: Discord.EmojiIdentifierResolvable;
	public messageReaction?: Discord.MessageReaction;
	public allowedUsers?: Array<string>;
	public deniedUsers?: Array<string>;
	public ignore?: string;
	public remove?: RemoveType;
	public actionType?: string;
};

export interface ReactionMenuActionReply {
	public emoji: Discord.EmojiIdentifierResolvable;
	public messageReaction?: Discord.MessageReaction;
	public allowedUsers?: Array<string>;
	public deniedUsers?: Array<string>;
	public ignore?: IgnoreType;
	public remove?: RemoveType;
	public actionType: "reply";
	public actionData: string;
};

export interface ReactionMenuActionEdit {
	public emoji: Discord.EmojiIdentifierResolvable;
	public messageReaction?: Discord.MessageReaction;
	public allowedUsers?: Array<string>;
	public deniedUsers?: Array<string>;
	public ignore?: IgnoreType;
	public remove?: RemoveType;
	public actionType: "edit";
	public actionData: string | Discord.MessageEmbed;
};

export interface ReactionMenuActionJS {
	public emoji: Discord.EmojiIdentifierResolvable;
	public messageReaction?: Discord.MessageReaction;
	public allowedUsers?: Array<string>;
	public deniedUsers?: Array<string>;
	public ignore?: IgnoreType;
	public remove?: RemoveType;
	public actionType: "js";
	public actionData(message?: Discord.Message, emoji?: { id: string; name: string; }, user?: Discord.User): any;
};

declare type IgnoreType = "that" | "thatTotal" | "all" | "total";
declare type RemoveType = "user" | "bot" | "all" | "message";
