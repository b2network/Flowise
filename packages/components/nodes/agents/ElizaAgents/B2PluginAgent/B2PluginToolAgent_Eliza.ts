import { flatten } from 'lodash'
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
        this.type = 'OpenAIToolAgent'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `A plugin for interacting with the B2-Network within the ElizaOS ecosystem`
        this.tags = ['Eliza']
        this.inputs = [

        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        return ""
    }
}

module.exports = { nodeClass: B2PluginFunctionAgent_Eliza_Agents }
