const Interpreter = require("../../core/interpreter.js");
const { MessageReaction } = require("discord.js");
/**
 * @param  {MessageReaction} reaction
 * @param  {User} user
 * @param  {import('../../classes/AoiClient.js')} client
 */
module.exports = async (reaction, user, client) => {
    const cmds = client.cmd.reactionRemove.allValues();
    const data = {
        message: reaction.message,
        channel: reaction.message.channel,
        client: client,
        guild: reaction.message.guild,
        author: user,
    };
    for (const cmd of cmds) {
        let chan;
        if (cmd.channel?.includes("$")) {
            const id = await Interpreter(
                client,
                data,
                [],
                { name: "ChannelParser", code: cmd.channel },
                client.db,
                true,
            );
            chan = client.channels?.cache.get(id?.code);
        } else {
            chan = client.channels.cache.get(cmd.channel);
        }
        await Interpreter(
            client,
            data,
            [],
            cmd,
            client.db,
            false,
            chan?.id,
            { reactionData: reaction },
            chan,
        );
    }
};
