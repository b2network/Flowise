import type { IAgentRuntime } from "@elizaos/core";

export type b2NetworkConfig = {
    B2_PRIVATE_KEY: string,
}

export async function validateB2NetworkConfig(
    runtime: IAgentRuntime
): Promise<b2NetworkConfig> {
    try {
        const B2_PRIVATE_KEY = runtime.getSetting("B2_PRIVATE_KEY");
        if (B2_PRIVATE_KEY.length < 1) {
            throw new Error("invalid B2_PRIVATE_KEY");
        }
        const config = {
            B2_PRIVATE_KEY: B2_PRIVATE_KEY,
        };
        return config;
    } catch (error) {
        throw error;
    }
}
