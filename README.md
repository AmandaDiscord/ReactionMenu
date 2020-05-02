## ReactionMenu
written by @cloudrac3r (A.K.A. Cadence), this module is a reaction handler for Discord.js to easily create menus which are highly customizable.

# Requirements
This module requires Discord.js v12.0.0 or higher.

# Note
There is a static method handler which is an in-house written reaction event handler method. This method by default is not able to be passed to the vanilla Discord.js Client messageReactionAdd event as there are differences in the data structure. You will have to build the data parameter yourself or install https://github.com/AmandaDiscord/discord.js#amanda-v12 which emits data suitable for the static handler method with the exception of the client parameter.
