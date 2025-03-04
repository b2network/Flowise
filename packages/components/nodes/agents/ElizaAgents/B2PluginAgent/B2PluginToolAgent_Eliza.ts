// import { flatten } from 'lodash'
import { getBaseClasses } from '../../../../src/utils'
import { AgentExecutor } from '../../../../src/agents'
import { b2Plugin } from "@elizaos-plugins/plugin-b2"
import {
    type Adapter,
    CacheStore,
    IDatabaseAdapter,
    FsCacheAdapter,
    IDatabaseCacheAdapter,
    ModelProviderName,
    IAgentRuntime,
    type Action,
    type Memory,
    type State,
    type UUID,
    type Content,
    type Character,
    type ClientInstance,
    composeContext,
    generateMessageResponse,
    ModelClass,
    getEmbeddingZeroVector,
    settings,
    validateCharacterConfig,
    CacheManager,
    DbCacheAdapter,
} from "@elizaos/core";
import {
    loadCharacter,
    stringToUuid,
    getTokenForProvider,
    createAgent,
    findDatabaseAdapter,
    initializeCache,
    initializeClients,
    transferTemplate,
    messageHandlerTemplate,
    createElizeAgent
} from '../../../../src/elizaAgents'
import fs from "fs";
import path from "path";
import type { Address } from "viem";
import {
    FlowiseMemory,
    ICommonObject,
    IMessage,
    INode,
    INodeData,
    INodeParams,
    IServerSideEventStreamer,
    IUsedTool
} from '../../../../src/Interface'

class B2PluginFunctionAgent_Eliza_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'B2 Plugin Tool Agent'
        this.name = 'b2PluginToolAgentEliza'
        this.version = 2.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `A plugin for interacting with the B2-Network within the ElizaOS ecosystem`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.tags = ['Eliza']
        this.inputs = [
            {
                label: 'Eliza agent character json file',
                name: 'elizaAgentCharacterJsonFile',
                type: 'string',
                placeholder: 'local path'
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const characterJsonFile = nodeData.inputs?.elizaAgentCharacterJsonFile as string
        const userId = stringToUuid("user");
        const roomId = stringToUuid("room");
        let runtime = await createElizeAgent(characterJsonFile);
        console.log(`plugin name: ${b2Plugin.name}`)
        const content: Content = {
            text: input,
            source: "direct",
            inReplyTo: undefined,
        };
        const userMessage = {
            content,
            userId,
            roomId,
            agentId: runtime.agentId,
        };

        const messageId = stringToUuid(Date.now().toString());

        const memory: Memory = {
            id: stringToUuid(messageId + "-" + userId),
            ...userMessage,
            agentId: runtime.agentId,
            userId,
            roomId,
            content,
            createdAt: Date.now(),
        };

        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);

        let state = await runtime.composeState(userMessage, {
            agentName: runtime.character.name,
        });

        const context = composeContext({
            state,
            template: transferTemplate,
        });
        console.log("----generateMessageResponse start-----")
        const response = await generateMessageResponse({
            runtime: runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        console.log("----generateMessageResponse end-----")
        // save response to memory
        const responseMessage: Memory = {
            id: stringToUuid(messageId + "-" + runtime.agentId),
            ...userMessage,
            userId: runtime.agentId,
            content: response,
            embedding: getEmbeddingZeroVector(),
            createdAt: Date.now(),
        };
        await runtime.messageManager.createMemory(responseMessage);

        state = await runtime.updateRecentMessageState(state);
        let message = null as Content | null;

        // await runtime.processActions(
        //     memory,
        //     [responseMessage],
        //     state,
        //     async (newMessages) => {
        //         message = newMessages;
        //         return [memory];
        //     }
        // );

        // await runtime.evaluate(memory, state);
        if (b2Plugin.actions) {
            await b2Plugin.actions[0].handler(
                runtime,
                memory,
                state,
                {},
                async (newMessages: Content | null) => {
                    message = newMessages;
                    return [memory];
                })
        }
        return `plugin name: ${b2Plugin.name}: msg: ${JSON.stringify(message, null, 2)}`
    }
}

module.exports = { nodeClass: B2PluginFunctionAgent_Eliza_Agents }
