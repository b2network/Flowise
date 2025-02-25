import { flatten } from 'lodash'
import { getBaseClasses } from '../../../../src/utils'
import { AgentExecutor, ToolCallingAgentOutputParser } from '../../../../src/agents'
// import { zerionPlugin } from "@elizaos-plugins/plugin-zerion"
import { b2Plugin } from "@elizaos-plugins/plugin-b2"
import { AgentRuntime } from "@elizaos/core";
import {
    type IDatabaseAdapter,
    ModelProviderName,
    type Action,
    type Memory,
    type UUID,
} from "@elizaos/core";
import { defaultCharacter } from "./defaultCharacter";
// import { vi } from "vitest";
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
import { RUNTIME } from 'cohere-ai/core';

function mockResolvedValue(value: any) {
    const mockFn = (...args: any[]) => {
        mockFn.calls.push(args); // 记录调用参数
        return Promise.resolve(value); // 返回一个 Promise
    };

    mockFn.calls = [] as any[]; // 用于记录每次调用的参数

    mockFn.mockResolvedValue = (newValue: any) => {
        value = newValue; // 动态设置返回值
    };

    return mockFn;
}
// Mock dependencies with minimal implementations
const mockDatabaseAdapter: IDatabaseAdapter = {
    db: {},
    init: mockResolvedValue(undefined),
    close: mockResolvedValue(undefined),
    getKnowledge: mockResolvedValue(undefined),
    searchKnowledge: mockResolvedValue(undefined),
    createKnowledge: mockResolvedValue(undefined),
    removeKnowledge: mockResolvedValue(undefined),
    clearKnowledge: mockResolvedValue(undefined),
    getAccountById: mockResolvedValue(null),
    createAccount: mockResolvedValue(true),
    getMemories: mockResolvedValue([]),
    getMemoriesByIds: mockResolvedValue([]),
    getMemoryById: mockResolvedValue(null),
    getMemoriesByRoomIds: mockResolvedValue([]),
    getCachedEmbeddings: mockResolvedValue([]),
    log: mockResolvedValue(undefined),
    getActorDetails: mockResolvedValue([]),
    searchMemories: mockResolvedValue([]),
    updateGoalStatus: mockResolvedValue(undefined),
    searchMemoriesByEmbedding: mockResolvedValue([]),
    createMemory: mockResolvedValue(undefined),
    removeMemory: mockResolvedValue(undefined),
    removeAllMemories: mockResolvedValue(undefined),
    countMemories: mockResolvedValue(0),
    getGoals: mockResolvedValue([]),
    updateGoal: mockResolvedValue(undefined),
    createGoal: mockResolvedValue(undefined),
    removeGoal: mockResolvedValue(undefined),
    removeAllGoals: mockResolvedValue(undefined),
    getRoom: mockResolvedValue(null),
    createRoom: mockResolvedValue("test-room-id" as UUID),
    removeRoom: mockResolvedValue(undefined),
    getRoomsForParticipant: mockResolvedValue([]),
    getRoomsForParticipants: mockResolvedValue([]),
    addParticipant: mockResolvedValue(true),
    removeParticipant: mockResolvedValue(true),
    getParticipantsForAccount: mockResolvedValue([]),
    getParticipantsForRoom: mockResolvedValue([]),
    getParticipantUserState: mockResolvedValue(null),
    setParticipantUserState: mockResolvedValue(undefined),
    createRelationship: mockResolvedValue(true),
    getRelationship: mockResolvedValue(null),
    getRelationships: mockResolvedValue([]),
};

const mockCacheManager = {
    get: mockResolvedValue(null),
    set: mockResolvedValue(undefined),
    delete: mockResolvedValue(undefined),
};

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
                label: 'Eliza Server URL',
                name: 'elizaServerUrl',
                type: 'string',
                placeholder: 'http://localhost:3000'
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        // process.env = {
        //     OPENAI_API_KEY: "sk-test123",
        //     B2_PRIVATE_KEY: "11111",
        //     // REDPILL_API_KEY: "test-key",
        //     // GROK_API_KEY: "test-key",
        //     // GROQ_API_KEY: "gsk_test123",
        //     // OPENROUTER_API_KEY: "test-key",
        //     // GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
        //     // ELEVENLABS_XI_API_KEY: "test-key",
        // };
        process.env.B2_PRIVATE_KEY = ""
        process.env.OPENAI_API_KEY = ""
        const runtime = new AgentRuntime({
            token: "test-token",
            character: defaultCharacter,
            databaseAdapter: mockDatabaseAdapter,
            cacheManager: mockCacheManager,
            modelProvider: ModelProviderName.OPENAI,
        });
        console.log(`plugin name: ${b2Plugin.name}`)
        const message: Memory = {
            id: "123e4567-e89b-12d3-a456-426614174003",
            userId: "123e4567-e89b-12d3-a456-426614174004",
            agentId: "123e4567-e89b-12d3-a456-426614174005",
            roomId: "123e4567-e89b-12d3-a456-426614174003",
            content: { type: "text", text: input },
        };
        if (b2Plugin.actions) {
            await b2Plugin.actions[0].handler(runtime, message)
        }
        return `plugin name: ${b2Plugin.name}`
    }
}

module.exports = { nodeClass: B2PluginFunctionAgent_Eliza_Agents }
