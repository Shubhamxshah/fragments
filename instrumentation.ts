import { IntrospectionAISDKIntegration } from '@introspection-sdk/introspection-node'

let integration: IntrospectionAISDKIntegration | undefined

export function getIntrospectionAISDKIntegrations() {
  if (!process.env.INTROSPECTION_TOKEN) {
    return []
  }

  if (!integration) {
    integration = new IntrospectionAISDKIntegration({
      serviceName: 'fragments-generator',
    })
  }

  return [integration]
}

export function introspectionTelemetry(
  agentName: string,
  conversationId?: string,
) {
  const integrations = getIntrospectionAISDKIntegrations()

  return {
    isEnabled: integrations.length > 0,
    functionId: agentName,
    metadata: {
      'gen_ai.conversation.id': conversationId,
    },
    integrations,
  }
}
