import { flatten } from 'lodash'
import { getBaseClasses } from '../../../../src/utils'
import { AgentExecutor, ToolCallingAgentOutputParser } from '../../../../src/agents'
// import { zerionPlugin } from "@elizaos-plugins/plugin-zerion"
import { b2Plugin } from "@elizaos-plugins/plugin-b2"
import { AgentRuntime } from "@elizaos/core";
import { sha1 } from "js-sha1";
import {
    type IDatabaseAdapter,
    ModelProviderName,
    type Action,
    type Memory,
    type State,
    type UUID,
    type Content,
    type Character,
    composeContext,
    generateMessageResponse,
    ModelClass,
    getEmbeddingZeroVector,
    settings,
    validateCharacterConfig,
} from "@elizaos/core";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import type { Address } from "viem";
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
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

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

        const userId = stringToUuid("user");
        const roomId = stringToUuid("room");
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
        // process.env.B2_PRIVATE_KEY = ""
        // process.env.OPENAI_API_KEY = ""
        // process.env.DEFAULT_LOG_LEVEL = "debug"
        // const runtime = new AgentRuntime({
        //     token: process.env.OPENAI_API_KEY,
        //     character: defaultCharacter,
        //     databaseAdapter: mockDatabaseAdapter,
        //     cacheManager: mockCacheManager,
        //     plugins: [
        //         b2Plugin,
        //     ]
        //         .flat()
        //         .filter(Boolean),
        //     modelProvider: ModelProviderName.OPENAI,
        // });
        let characters = await loadCharacter("")

        const character = characters
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);
        if (!token) {
            throw new Error("Token is undefined");
        }
        console.log("----createAgent start------")
        const runtime: AgentRuntime = await createAgent(
            character,
            token
        );
        runtime.databaseAdapter = mockDatabaseAdapter
        runtime.cacheManager = mockCacheManager
        console.log("----createAgent end------")


        console.log(`plugin name: ${b2Plugin.name}`)
        // const message: Memory = {
        //     id: "123e4567-e89b-12d3-a456-426614174003",
        //     userId: userId,
        //     agentId: "123e4567-e89b-12d3-a456-426614174005",
        //     roomId: "123e4567-e89b-12d3-a456-426614174003",

        //     content: { type: "text", text: input },
        // };

        // const state: State = {
        //     userId: "123e4567-e89b-12d3-a456-426614174000", // Example UUID
        //     agentId: "987e6543-e21b-12d3-a456-426614174000", // Example UUID
        //     bio: "A helpful AI assistant.",
        //     lore: "Created to assist users in various tasks.",
        //     messageDirections: "Respond to user queries in a friendly manner.",
        //     postDirections: "Follow up with additional information if needed.",
        //     roomId: "456e7890-e89b-12d3-a456-426614174000", // Example UUID
        //     agentName: "Eliza",
        //     senderName: "User123",
        //     actors: "User, Eliza",
        //     // actorsData: [
        //     //     { id: "123e4567-e89b-12d3-a456-426614174000", name: "User123", role: "user" },
        //     //     { id: "987e6543-e21b-12d3-a456-426614174000", name: "Eliza", role: "agent" }
        //     // ],
        //     // goals: "Assist the user with their queries.",
        //     // goalsData: [
        //     //     { id: "111e2222-e89b-12d3-a456-426614174000", description: "Provide accurate information." }
        //     // ],
        //     // recentMessages: "User: Hello, Eliza!",
        //     // recentMessagesData: [
        //     //     { id: "222e3333-e89b-12d3-a456-426614174000", content: "Hello, Eliza!", sender: "User123" }
        //     // ],
        //     // actionNames: "greet, respond, followUp",
        //     // actions: "Greet the user, respond to queries, follow up with more info.",
        //     // actionsData: [
        //     //     { id: "333e4444-e89b-12d3-a456-426614174000", name: "greet", description: "Greet the user." }
        //     // ],
        //     // actionExamples: "greet: 'Hello! How can I assist you today?'",
        //     // providers: "OpenAI, DeepSeek",
        //     // responseData: { content: "Hello! How can I assist you today?", type: "text" },
        //     // recentInteractionsData: [
        //     //     { id: "444e5555-e89b-12d3-a456-426614174000", content: "User: Hello, Eliza!", sender: "User123" }
        //     // ],
        //     // recentInteractions: "User: Hello, Eliza!",
        //     // formattedConversation: "User: Hello, Eliza!\nEliza: Hello! How can I assist you today?",
        //     // knowledge: "General knowledge about AI and programming.",
        //     // knowledgeData: [
        //     //     { id: "555e6666-e89b-12d3-a456-426614174000", content: "AI is the simulation of human intelligence by machines." }
        //     // ],
        //     // ragKnowledgeData: [
        //     //     { id: "666e7777-e89b-12d3-a456-426614174000", content: "RAG stands for Retrieval-Augmented Generation." }
        //     // ],
        //     // Additional dynamic properties can be added as needed
        //     customProperty: "Some custom value"
        // };

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
            await b2Plugin.actions[0].handler(runtime, memory, state)
        }
        return `plugin name: ${b2Plugin.name}`
    }
}


export const messageCompletionFooter = `\nResponse format should be formatted in a valid JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "text": "<string>", "action": "<string>" }
\`\`\`

The “action” field should be one of the options in [Available Actions] and the "text" field should be the response you want to send.
`;



const messageHandlerTemplate =
    // {{goals}}
    // "# Action Examples" is already included
    `{{ actionExamples }}
(Action examples are for reference only.Do not use the information from them in your response.)

# Knowledge
{ { knowledge } }

# Task: Generate dialog and actions for the character {{ agentName }}.
About { { agentName } }:
{ { bio } }
{ { lore } }

{ { providers } }

{ { attachments } }

# Capabilities
Note that { { agentName } } is capable of reading / seeing / hearing various forms of media, including images, videos, audio, plaintext and PDFs.Recent attachments have been included above under the "Attachments" section.

{ { messageDirections } }

{ { recentMessages } }

{ { actions } }

# Instructions: Write the next message for {{ agentName }}.
` + messageCompletionFooter;

const TOKEN_ADDRESSES: Record<string, Address> = {
    "B2-BTC": "0x0000000000000000000000000000000000000000",
    uBTC: "0x796e4D53067FF374B89b2Ac101ce0c1f72ccaAc2",
    USDC: "0xE544e8a38aDD9B1ABF21922090445Ba93f74B9E5",
    USDT: "0x681202351a488040Fa4FdCc24188AfB582c9DD62",
};

const FARM_ADDRESS: Address = "0xd5B5f1CA0fa5636ac54b0a0007BA374A1513346e";

export {
    TOKEN_ADDRESSES,
    FARM_ADDRESS,
};

export const transferTemplate = `Respond with a JSON markdown block containing only the extracted values
- Use null for any values that cannot be determined.
- Use address zero for native B2-BTC transfers.

Example response for a 10 uBTC transfer:
\`\`\`json
{
    "tokenAddress": "0x796e4D53067FF374B89b2Ac101ce0c1f72ccaAc2",
    "recipient": "0x4f9e2dc50B4Cd632CC2D24edaBa3Da2a9338832a",
    "amount": "10"
}
\`\`\`

Example response for a 0.1 B2-BTC transfer:
\`\`\`json
{
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "recipient": "0x4f9e2dc50B4Cd632CC2D24edaBa3Da2a9338832a",
    "amount": "0.1"
}
\`\`\`

## Token Addresses

${Object.entries(TOKEN_ADDRESSES)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n")}

## Recent Messages

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;




function stringToUuid(target: string | number): UUID {
    if (typeof target === "number") {
        target = (target as number).toString();
    }

    if (typeof target !== "string") {
        throw TypeError("Value must be string");
    }

    const _uint8ToHex = (ubyte: number): string => {
        const first = ubyte >> 4;
        const second = ubyte - (first << 4);
        const HEX_DIGITS = "0123456789abcdef".split("");
        return HEX_DIGITS[first] + HEX_DIGITS[second];
    };

    const _uint8ArrayToHex = (buf: Uint8Array): string => {
        let out = "";
        for (let i = 0; i < buf.length; i++) {
            out += _uint8ToHex(buf[i]);
        }
        return out;
    };

    const escapedStr = encodeURIComponent(target);
    const buffer = new Uint8Array(escapedStr.length);
    for (let i = 0; i < escapedStr.length; i++) {
        buffer[i] = escapedStr[i].charCodeAt(0);
    }

    const hash = sha1(buffer);
    const hashBuffer = new Uint8Array(hash.length / 2);
    for (let i = 0; i < hash.length; i += 2) {
        hashBuffer[i / 2] = Number.parseInt(hash.slice(i, i + 2), 16);
    }

    return (_uint8ArrayToHex(hashBuffer.slice(0, 4)) +
        "-" +
        _uint8ArrayToHex(hashBuffer.slice(4, 6)) +
        "-" +
        _uint8ToHex(hashBuffer[6] & 0x0f) +
        _uint8ToHex(hashBuffer[7]) +
        "-" +
        _uint8ToHex((hashBuffer[8] & 0x3f) | 0x80) +
        _uint8ToHex(hashBuffer[9]) +
        "-" +
        _uint8ArrayToHex(hashBuffer.slice(10, 16))) as UUID;
}

export async function createAgent(
    character: Character,
    token: string
): Promise<AgentRuntime> {
    return new AgentRuntime({
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        // character.plugins are handled when clients are added
        plugins: [
            b2Plugin,
        ]
            .flat()
            .filter(Boolean),
        providers: [],
        managers: [],
        // verifiableInferenceAdapter,
    });
}
export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
): string | undefined {
    switch (provider) {
        // no key needed for llama_local, ollama, lmstudio, gaianet or bedrock
        case ModelProviderName.LLAMALOCAL:
            return "";
        case ModelProviderName.OLLAMA:
            return "";
        case ModelProviderName.LMSTUDIO:
            return "";
        case ModelProviderName.GAIANET:
            return (
                character.settings?.secrets?.GAIA_API_KEY ||
                settings.GAIA_API_KEY
            );
        case ModelProviderName.BEDROCK:
            return "";
        case ModelProviderName.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ETERNALAI:
            return (
                character.settings?.secrets?.ETERNALAI_API_KEY ||
                settings.ETERNALAI_API_KEY
            );
        case ModelProviderName.NINETEEN_AI:
            return (
                character.settings?.secrets?.NINETEEN_AI_API_KEY ||
                settings.NINETEEN_AI_API_KEY
            );
        case ModelProviderName.LLAMACLOUD:
        case ModelProviderName.TOGETHER:
            return (
                character.settings?.secrets?.LLAMACLOUD_API_KEY ||
                settings.LLAMACLOUD_API_KEY ||
                character.settings?.secrets?.TOGETHER_API_KEY ||
                settings.TOGETHER_API_KEY ||
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.CLAUDE_VERTEX:
        case ModelProviderName.ANTHROPIC:
            return (
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        case ModelProviderName.REDPILL:
            return (
                character.settings?.secrets?.REDPILL_API_KEY ||
                settings.REDPILL_API_KEY
            );
        case ModelProviderName.OPENROUTER:
            return (
                character.settings?.secrets?.OPENROUTER_API_KEY ||
                settings.OPENROUTER_API_KEY
            );
        case ModelProviderName.GROK:
            return (
                character.settings?.secrets?.GROK_API_KEY ||
                settings.GROK_API_KEY
            );
        case ModelProviderName.HEURIST:
            return (
                character.settings?.secrets?.HEURIST_API_KEY ||
                settings.HEURIST_API_KEY
            );
        case ModelProviderName.GROQ:
            return (
                character.settings?.secrets?.GROQ_API_KEY ||
                settings.GROQ_API_KEY
            );
        case ModelProviderName.GALADRIEL:
            return (
                character.settings?.secrets?.GALADRIEL_API_KEY ||
                settings.GALADRIEL_API_KEY
            );
        case ModelProviderName.FAL:
            return (
                character.settings?.secrets?.FAL_API_KEY || settings.FAL_API_KEY
            );
        case ModelProviderName.ALI_BAILIAN:
            return (
                character.settings?.secrets?.ALI_BAILIAN_API_KEY ||
                settings.ALI_BAILIAN_API_KEY
            );
        case ModelProviderName.VOLENGINE:
            return (
                character.settings?.secrets?.VOLENGINE_API_KEY ||
                settings.VOLENGINE_API_KEY
            );
        case ModelProviderName.NANOGPT:
            return (
                character.settings?.secrets?.NANOGPT_API_KEY ||
                settings.NANOGPT_API_KEY
            );
        case ModelProviderName.HYPERBOLIC:
            return (
                character.settings?.secrets?.HYPERBOLIC_API_KEY ||
                settings.HYPERBOLIC_API_KEY
            );

        case ModelProviderName.VENICE:
            return (
                character.settings?.secrets?.VENICE_API_KEY ||
                settings.VENICE_API_KEY
            );
        case ModelProviderName.ATOMA:
            return (
                character.settings?.secrets?.ATOMASDK_BEARER_AUTH ||
                settings.ATOMASDK_BEARER_AUTH
            );
        case ModelProviderName.NVIDIA:
            return (
                character.settings?.secrets?.NVIDIA_API_KEY ||
                settings.NVIDIA_API_KEY
            );
        case ModelProviderName.AKASH_CHAT_API:
            return (
                character.settings?.secrets?.AKASH_CHAT_API_KEY ||
                settings.AKASH_CHAT_API_KEY
            );
        case ModelProviderName.GOOGLE:
            return (
                character.settings?.secrets?.GOOGLE_GENERATIVE_AI_API_KEY ||
                settings.GOOGLE_GENERATIVE_AI_API_KEY
            );
        case ModelProviderName.MISTRAL:
            return (
                character.settings?.secrets?.MISTRAL_API_KEY ||
                settings.MISTRAL_API_KEY
            );
        case ModelProviderName.LETZAI:
            return (
                character.settings?.secrets?.LETZAI_API_KEY ||
                settings.LETZAI_API_KEY
            );
        case ModelProviderName.INFERA:
            return (
                character.settings?.secrets?.INFERA_API_KEY ||
                settings.INFERA_API_KEY
            );
        case ModelProviderName.DEEPSEEK:
            return (
                character.settings?.secrets?.DEEPSEEK_API_KEY ||
                settings.DEEPSEEK_API_KEY
            );
        case ModelProviderName.LIVEPEER:
            return (
                character.settings?.secrets?.LIVEPEER_GATEWAY_URL ||
                settings.LIVEPEER_GATEWAY_URL
            );
        case ModelProviderName.SECRETAI:
            return (
                character.settings?.secrets?.SECRET_AI_API_KEY ||
                settings.SECRET_AI_API_KEY
            );
        default:
            const errorMessage = `Failed to get token - unsupported model provider: ${provider}`;
            throw new Error(errorMessage);
    }
}
function commaSeparatedStringToArray(commaSeparated: string): string[] {
    return commaSeparated?.split(",").map((value) => value.trim());
}
async function readCharactersFromStorage(
    characterPaths: string[]
): Promise<string[]> {
    try {
        const uploadDir = path.join(process.cwd(), "data", "characters");
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const fileNames = await fs.promises.readdir(uploadDir);
        fileNames.forEach((fileName) => {
            characterPaths.push(path.join(uploadDir, fileName));
        });
    } catch (err) {
        console.log(`Error reading directory: ${err.message}`);
    }

    return characterPaths;
}
function tryLoadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
}
async function loadCharacter(filePath: string): Promise<Character> {
    const content = tryLoadFile(filePath);
    if (!content) {
        throw new Error(`Character file not found: ${filePath}`);
    }
    const character = JSON.parse(content);
    return jsonToCharacter(filePath, character);
}

async function jsonToCharacter(
    filePath: string,
    character: any
): Promise<Character> {
    validateCharacterConfig(character);

    // .id isn't really valid
    const characterId = character.id || character.name;
    const characterPrefix = `CHARACTER.${characterId
        .toUpperCase()
        .replace(/ /g, "_")}.`;
    const characterSettings = Object.entries(process.env)
        .filter(([key]) => key.startsWith(characterPrefix))
        .reduce((settings, [key, value]) => {
            const settingKey = key.slice(characterPrefix.length);
            return { ...settings, [settingKey]: value };
        }, {});
    if (Object.keys(characterSettings).length > 0) {
        character.settings = character.settings || {};
        character.settings.secrets = {
            ...characterSettings,
            ...character.settings.secrets,
        };
    }
    // Handle plugins
    character.plugins = await handlePluginImporting(character.plugins);
    if (character.extends) {
        console.info(
            `Merging  ${character.name} character with parent characters`
        );
        for (const extendPath of character.extends) {
            const baseCharacter = await loadCharacter(
                path.resolve(path.dirname(filePath), extendPath)
            );
            character = mergeCharacters(baseCharacter, character);
            console.info(
                `Merged ${character.name} with ${baseCharacter.name}`
            );
        }
    }
    return character;
}
function mergeCharacters(base: Character, child: Character): Character {
    const mergeObjects = (baseObj: any, childObj: any) => {
        const result: any = {};
        const keys = new Set([
            ...Object.keys(baseObj || {}),
            ...Object.keys(childObj || {}),
        ]);
        keys.forEach((key) => {
            if (
                typeof baseObj[key] === "object" &&
                typeof childObj[key] === "object" &&
                !Array.isArray(baseObj[key]) &&
                !Array.isArray(childObj[key])
            ) {
                result[key] = mergeObjects(baseObj[key], childObj[key]);
            } else if (
                Array.isArray(baseObj[key]) ||
                Array.isArray(childObj[key])
            ) {
                result[key] = [
                    ...(baseObj[key] || []),
                    ...(childObj[key] || []),
                ];
            } else {
                result[key] =
                    childObj[key] !== undefined ? childObj[key] : baseObj[key];
            }
        });
        return result;
    };
    return mergeObjects(base, child);
}
async function handlePluginImporting(plugins: string[]) {
    if (plugins.length > 0) {
        console.info("Plugins are: ", plugins);
        const importedPlugins = await Promise.all(
            plugins.map(async (plugin) => {
                try {
                    const importedPlugin = await import(plugin);
                    const functionName =
                        plugin
                            .replace("@elizaos/plugin-", "")
                            .replace("@elizaos-plugins/plugin-", "")
                            .replace(/-./g, (x) => x[1].toUpperCase()) +
                        "Plugin"; // Assumes plugin function is camelCased with Plugin suffix
                    return (
                        importedPlugin.default || importedPlugin[functionName]
                    );
                } catch (importError) {
                    console.info(
                        `Failed to import plugin: ${plugin}`,
                        importError
                    );
                    return []; // Return null for failed imports
                }
            })
        );
        return importedPlugins;
    } else {
        return [];
    }
}
async function loadCharacterTryPath(characterPath: string): Promise<Character> {
    let content: string | null = null;
    let resolvedPath = "";

    // Try different path resolutions in order
    const pathsToTry = [
        characterPath, // exact path as specified
        path.resolve(process.cwd(), characterPath), // relative to cwd
        path.resolve(process.cwd(), "agent", characterPath), // Add this
        path.resolve(__dirname, characterPath), // relative to current script
        path.resolve(__dirname, "characters", path.basename(characterPath)), // relative to agent/characters
        path.resolve(__dirname, "../characters", path.basename(characterPath)), // relative to characters dir from agent
        path.resolve(
            __dirname,
            "../../characters",
            path.basename(characterPath)
        ), // relative to project root characters dir
    ];

    console.info(
        "Trying paths:",
        pathsToTry.map((p) => ({
            path: p,
            exists: fs.existsSync(p),
        }))
    );

    for (const tryPath of pathsToTry) {
        content = tryLoadFile(tryPath);
        if (content !== null) {
            resolvedPath = tryPath;
            break;
        }
    }

    if (content === null) {
        console.info(
            `Error loading character from ${characterPath}: File not found in any of the expected locations`
        );
        console.error("Tried the following paths:");
        pathsToTry.forEach((p) => console.error(` - ${p}`));
        throw new Error(
            `Error loading character from ${characterPath}: File not found in any of the expected locations`
        );
    }
    try {
        const character: Character = await loadCharacter(resolvedPath);
        console.info(`Successfully loaded character from: ${resolvedPath}`);
        return character;
    } catch (e) {
        console.info(`Error parsing character from ${resolvedPath}: ${e}`);
        throw new Error(`Error parsing character from ${resolvedPath}: ${e}`);
    }
}

module.exports = { nodeClass: B2PluginFunctionAgent_Eliza_Agents }
