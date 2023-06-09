import { Client, createCacheManager } from "aoiluna";
import { AoiClientOptions, CommandOptions } from "../typings/interfaces.js";
import { CommandManager } from "../manager/Command.js";
import { onMessage } from "../events/messageCreate.js";
import { Util } from "./Util.js";
import { FunctionManager } from "../manager/Function.js";
import { AoiClientProps, CommandTypes } from "../typings/types.js";
import { AoiClientEvents } from "../typings/enums.js";

interface AoiClient extends AoiClientProps {
    client: Client;
}

class AoiClient {
    constructor(options: AoiClientOptions) {
        this.client = new Client(options);
        this.managers = {
            commands: new CommandManager(this),
            functions: new FunctionManager(this),
        };
        this.options = options;
        if (options.caches)
            this.cache = createCacheManager(options.caches, this.client);

        this.#bindEvents();
        this.#bindCommands();
        this.util = Util;
        Util.client = this;
        this.__on__ = {};
    }
    #bindEvents() {
        for (const event of this.options.events)
            if (event === "MessageCreate") onMessage(this);
    }
    #bindCommands() {
        const cmdTypes = this.managers.commands.types as CommandTypes[];
        for (const type of cmdTypes) {
            const cmdType = `${type}Command` as const;
            const parsedType = cmdType === "basicCommand" ? "command" : cmdType;
            this[parsedType] = function (
                ...cmd: Omit<CommandOptions, "type">[]
            ) {
                const Cmds = cmd.map((c) => {
                    return {
                        ...c,
                        type,
                    };
                }) as CommandOptions[];
                this.managers.commands.addMany(Cmds);
            };
        }

        this.componentCommand = function (
            ...cmd: Omit<CommandOptions, "type">[]
        ) {
            const Cmds = cmd.map((c) => {
                return {
                    ...c,
                    type: "component",
                };
            }) as CommandOptions[];
            this.managers.commands.addMany(Cmds);
        };
    }
    emit(event: AoiClientEvents, ...args: unknown[]) {
        if (this.__on__[event]) {
            for (const func of this.__on__[event] ?? []) {
                func(...args);
            }
        }
    }
    on(event: AoiClientEvents, func: (...args: unknown[]) => void) {
        if (!this.__on__[event]) this.__on__[event] = [];
        this.__on__[event]?.push(func);
    }
}

export { AoiClient };
