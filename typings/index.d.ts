import Discord = require("thunderstorm");

declare class ReactionMenu {
	public message: Discord.Message;
	public client: Discord.Client;
	public actions: Array<ReactionMenuAction>;
	public static menus: Map<string, ReactionMenu>;
	public menus: Map<string, ReactionMenu>;
	public reactionResults: Array<boolean>;

	public constructor(message: Discord.Message, actions: Array<ReactionMenuAction>, autoReact?: boolean);

	public static handler(reaction: Discord.MessageReaction, user: Discord.User): void;
	public handler(data: Discord.MessageReaction, user: Discord.User): void;

	/**
	 * Call the endpoint to remove all reactions. Fall back to removing individually if this fails.
	 */
	private _removeAll(): Promise<0 | 1>;
	/**
	 * For each action, remove the client's reaction.
	 */
	private _removeEach(): Promise<0 | 1>;
	/**
	 * Returns the results of the reacts.
	 */
	public react(): Promise<Array<boolean>>;
	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 */
	public destroy(remove?: boolean): void;
}
export = ReactionMenu;

interface ReactionMenuAction {
	emoji: string;
	allowedUsers?: Array<string>;
	deniedUsers?: Array<string>;
	ignore?: IgnoreType;
	remove?: RemoveType;
	actionType?: "js";
	actionData?(message?: Discord.Message, emoji?: Discord.ReactionEmoji, user?: Discord.User): any;
}

declare type IgnoreType = "that" | "thatTotal" | "all" | "total";
declare type RemoveType = "user" | "bot" | "all" | "message";
