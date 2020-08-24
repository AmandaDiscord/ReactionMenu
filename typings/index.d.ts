import Discord = require("thunderstorm");

declare class ReactionMenu {
	constructor(message: Discord.Message, client: Discord.Client, actions: Array<ReactionMenuAction>);

	public message: Discord.Message;
	public client: Discord.Client;
	public actions: Array<ReactionMenuAction>;

	public static menus: Map<string, ReactionMenu>;
	public static handler(data: { user_id: string, channel_id: string, message_id: string, emoji: { id: string, name: string }}, channel: Discord.Channel, user: Discord.User, client: Discord.Client): void;

	public react(): void;
	/**
	 * Remove the menu from storage, and optionally delete its reactions.
	 */
	public destroy(remove?: boolean, channelType?: "text" | "dm"): void;

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
	public emoji: string;
	public allowedUsers?: Array<string>;
	public deniedUsers?: Array<string>;
	public ignore?: IgnoreType;
	public remove?: RemoveType;
	public actionType: "js";
	public actionData(message?: Discord.Message, emoji?: { id: string; name: string; }, user?: Discord.User): any;
};

declare type IgnoreType = "that" | "thatTotal" | "all" | "total";
declare type RemoveType = "user" | "bot" | "all" | "message";
