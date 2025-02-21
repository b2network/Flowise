import { API_RESPONSE_RAW_PROMPT_TEMPLATE, API_URL_RAW_PROMPT_TEMPLATE, APIChain } from '../../../chains/ApiChain/postCore'
import { getBaseClasses } from '../../../../src/utils'
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

class ElizaCommonPluginFunctionAgent_Eliza_Agents implements INode {
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
        this.label = 'Eliza Plugin Tool Agent'
        this.name = 'elizeCommonToolAgentEliza'
        this.version = 2.0
        this.type = 'POSTApiChain'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `Eliza plugin system`
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.tags = ['Eliza']
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'API Documentation',
                name: 'apiDocs',
                type: 'string',
                description:
                    'Description of how API works. Please refer to more <a target="_blank" href="https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chains/api/open_meteo_docs.py">examples</a>',
                rows: 4
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'URL Prompt',
                name: 'urlPrompt',
                type: 'string',
                description: 'Prompt used to tell LLMs how to construct the URL. Must contains {api_docs} and {question}',
                default: API_URL_RAW_PROMPT_TEMPLATE,
                rows: 4,
                additionalParams: true
            },
            {
                label: 'Answer Prompt',
                name: 'ansPrompt',
                type: 'string',
                description:
                    'Prompt used to tell LLMs how to return the API response. Must contains {api_response}, {api_url}, and {question}',
                default: API_RESPONSE_RAW_PROMPT_TEMPLATE,
                rows: 4,
                additionalParams: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        // const model = nodeData.inputs?.model as BaseLanguageModel
        // const apiDocs = nodeData.inputs?.apiDocs as string
        // const headers = nodeData.inputs?.headers as string
        // const urlPrompt = nodeData.inputs?.urlPrompt as string
        // const ansPrompt = nodeData.inputs?.ansPrompt as string

        // const chain = await getAPIChain(apiDocs, model, headers, urlPrompt, ansPrompt)
        // const loggerHandler = new ConsoleCallbackHandler(options.logger)
        // const callbacks = await additionalCallbacks(nodeData, options)

        // const shouldStreamResponse = options.shouldStreamResponse
        // const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        // const chatId = options.chatId

        // if (shouldStreamResponse) {
        //     const handler = new CustomChainHandler(sseStreamer, chatId)
        //     const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
        //     return res
        // } else {
        //     const res = await chain.run(input, [loggerHandler, ...callbacks])
        //     return res
        // }
        // logger.info("eliza input: ", input)
        return ""
    }
}

module.exports = { nodeClass: ElizaCommonPluginFunctionAgent_Eliza_Agents }
